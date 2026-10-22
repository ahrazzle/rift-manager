#!/usr/bin/env bash
# Continuous-deploy helper for lck-manager (lolsim.askaconsult.com).
# Usage: ./deploy.sh ["message"]
# Builds the production bundle and deploys to Vercel production so users see
# improvements the moment a feature lands. Run after each committed change.
set -euo pipefail
cd "$(dirname "$0")"

MSG="${1:-deploy update}"

echo ">> building..."
npm run build

echo ">> deploying to Vercel (production)..."
# --prod promotes immediately; alias keeps the canonical URL serving latest.
~/.npm-global/bin/vercel deploy --prod --yes --scope a-4677s-projects

echo ">> done: $MSG"
echo "Live (alias): https://lck-manager-five.vercel.app"
echo "Target custom domain (pending CF TXT): https://lolsim.askaconsult.com"
