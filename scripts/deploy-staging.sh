#!/usr/bin/env bash
# Publish a tested, committed snapshot to the staging project without git identity.
# Domains are assigned separately after verifying the new deployment.
set -euo pipefail
project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Commit the intended source changes before deploying." >&2
  exit 1
fi
npm test
npm run build
deploy_dir="$(mktemp -d "${TMPDIR:-/tmp}/rift-manager-staging.XXXXXX")"
git archive HEAD | tar -x -C "$deploy_dir"
# This rewrite belongs to the live project. Staging serves its own root.
printf '{}\n' > "$deploy_dir/vercel.json"
vercel link --yes --scope a-4677s-projects --project lck-manager-staging --cwd "$deploy_dir"
node --input-type=module - "$deploy_dir/.vercel/project.json" <<'JS'
import { readFileSync } from 'node:fs'
const link = JSON.parse(readFileSync(process.argv[2], 'utf8'))
if (link.projectId !== 'prj_yVc6nm5SPtSM2WKrs8Ia1ly8TYww') throw new Error('Wrong Vercel project')
JS
echo "Git-free deployment source: $deploy_dir"
vercel deploy --prod --skip-domain --yes --scope a-4677s-projects \
  --project prj_yVc6nm5SPtSM2WKrs8Ia1ly8TYww --cwd "$deploy_dir"
