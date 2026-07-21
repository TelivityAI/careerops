#!/usr/bin/env bash
# Local smoke demo: create venv, install deps, run a board-triage generation.
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

VENV="${ROOT}/.venv"
PY="${VENV}/bin/python"

if [[ ! -x "${PY}" ]]; then
  echo "Creating ${VENV} …" >&2
  python3 -m venv "${VENV}"
fi

"${PY}" -m pip install -q -U pip
"${PY}" -m pip install -q -r requirements-infer.txt
exec "${PY}" scripts/demo_infer.py "$@"
