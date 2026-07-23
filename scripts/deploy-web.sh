#!/usr/bin/env bash
# Deploy the CareerOps dashboard (web/) to Vercel in one command.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/web"
cd "$WEB"
if [[ ! -f config.js ]]; then
  echo "Missing web/config.js"
  echo "  cp web/config.example.js web/config.js"
  echo "  # then edit web/config.js with your Supabase URL + anon key"
  exit 1
fi
if ! command -v npx >/dev/null; then
  echo "Need Node/npx installed"
  exit 1
fi
echo "Deploying web/ to Vercel (production)…"
npx --yes vercel deploy --prod --yes
echo "Done."
