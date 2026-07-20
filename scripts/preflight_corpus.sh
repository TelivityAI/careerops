#!/usr/bin/env bash
# Run after Claude hands off a complete data/clean/ corpus.
# Exit non-zero on any failure. Does NOT train or upload.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DIR="${1:-data/clean}"
echo "== preflight: $DIR =="

if [[ ! -f "$DIR/MANIFEST.md" ]]; then
  echo "FAIL: missing $DIR/MANIFEST.md"
  exit 1
fi

echo "-- validate_clean.py --"
python3 scripts/validate_clean.py --dir "$DIR"

echo "-- privacy grep --"
python3 scripts/privacy/grep_ban.py --dir "$DIR" --ban-list scripts/privacy/ban_list.txt

echo "-- Gemma token lengths (match_grading max must be ≤768) --"
python3 scripts/audit_token_lengths.py --dir "$DIR" --task match_grading --max-length 768 \
  --hf-token-file "${HF_TOKEN_FILE:-$HOME/.hf_token}" || {
  echo "FAIL: match_grading would truncate under 768 (or tokenizer unavailable)"
  exit 1
}

echo "-- merge dry-run --"
python3 scripts/merge_train_val.py --dir "$DIR" --dry-run

echo "ALL PREFLIGHT CHECKS PASSED"
