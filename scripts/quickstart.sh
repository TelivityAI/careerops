#!/usr/bin/env bash
# Local smoke demo: install deps and run a board-triage generation.
# Usage:
#   export HF_TOKEN=hf_...
#   bash scripts/quickstart.sh
#   bash scripts/quickstart.sh --demo json
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${HF_TOKEN:-}${HUGGING_FACE_HUB_TOKEN:-}" ]]; then
  echo "Set HF_TOKEN (Hugging Face access token) before running." >&2
  echo "  export HF_TOKEN=hf_..." >&2
  exit 2
fi

python3 -m pip install -q -r requirements-infer.txt
exec python3 scripts/demo_infer.py "$@"
