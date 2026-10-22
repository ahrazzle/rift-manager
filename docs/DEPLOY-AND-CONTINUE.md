# Rift Manager — Deployment runbook

## Project boundaries

| Target | Project | URL |
| --- | --- | --- |
| Staging | `lck-manager-staging` | https://lck-manager-staging.vercel.app/ and https://lolsim.askaconsult.com/staging/ |
| Live | `lck-manager` | https://lolsim.askaconsult.com/ and https://lck-manager-five.vercel.app/ |

Scope: `a-4677s-projects`. Staging ID: `prj_yVc6nm5SPtSM2WKrs8Ia1ly8TYww`.
Existing Vercel CLI authentication works. Do not paste tokens into source or scripts.
A deployment with `--prod` targets the production environment of the explicitly
selected project; for this workflow that project is **staging**, not the live game.

## Staging release

1. Run `npm test` and `npm run build`; address failures.
2. Commit the intended source and docs using the project identity:
   `git -c user.name=proteus -c user.email=proteus@askaconsult.com commit`.
3. Run `bash scripts/deploy-staging.sh`. It requires a clean tree, verifies the
   build, archives the commit without Git metadata, links only the staging project,
   verifies its ID, and creates a deployment with `--skip-domain`.
4. Inspect the returned deployment with `vercel inspect URL --scope a-4677s-projects`.
   Fetch its HTML and JS/CSS assets. If protected, use the authenticated Vercel
   access workflow; do not disable deployment protection. Compare asset hashes to
   `dist/` and check the new UI strings. Use the printed temporary copy as `--cwd`
   when the CLI needs linked-project context.
5. Move staging's domains with
   `vercel promote URL --yes --scope a-4677s-projects --cwd TEMP_COPY`.
6. Verify both staging URLs and their assets return HTTP 200 with the same build.
   Verify the live root still serves its pre-release asset hashes. Play through
   the browser controls when browser access is available.

Do not use the legacy root `deploy.sh`: it deploys whichever local project happens
to be linked. The new script pins the destination and avoids sending this machine's
Git identity to Vercel. The source repository has no GitHub remote.

## Assets, proxy and saves

The tracked `vercel.json` contains the live project's `/staging/(.*)` proxy to the
staging hostname. Preserve it for any later live release. The staging script writes
an empty config only in its temporary copy, because staging serves its own root.
Keep Vite `base: './'`: relative assets resolve under `/staging/`.

Live saves use `lck-manager-save-v1`; staging paths/hostnames use
`lck-manager-staging-save-v1`. Staging can import a legacy save on first load, then
writes only its own key. The two hostnames have separate browser storage origins.

## Live promotion

Live requires a separate explicit instruction. Verify its project ID before use,
retain the staging proxy in its deployment config, and deploy from a git-free copy.
The restored repository's `main` branch is an import baseline, not a record of live.
Consult Vercel's deployed artifacts and `CHANGELOG.md`, not old branch labels.

## Source sync

After a release, sync final tracked source to the supplied working-files folder.
Preserve existing online file IDs and upload new files only where needed. Exclude
`.git`, `.env*`, `.vercel`, `node_modules`, and `dist`. The old local Drive folder was
behind the online snapshot; never restore it over the current repository.
