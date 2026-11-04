# Rift Manager — Deployment runbook

## Current Pages publication

The canonical live game is https://www.rift.askaconsult.com/.
The published static tree is on `gh-pages`; its verified head is recorded in
[the release record](RELEASE-2026-11-03.md). `main` holds source, and PR #10
reconciles the already-published social card. Do not replace `main` with the
compiled Pages tree or overwrite its newer design proposals.

Publishing to `gh-pages` changes the live site and needs separate release approval.
Before an authorized release, test/build the exact reviewed source, compare the
complete static output, preserve `CNAME` and `.nojekyll`, and record the previous
Pages SHA for rollback. After publication, verify anonymous root and asset bytes.
Do not change DNS, permissions, or Pages settings as part of source reconciliation.
A source-only PR is not a request to publish a new build.

The Vercel instructions below describe the separate staging environment and
historical live host, not the current Pages release mechanism. Do not assume the
old live hostname or proxy is a supported path on GitHub Pages.

## Historical Vercel project boundaries

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
2. Commit the intended source and documentation using your own Git identity.
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
Git identity to Vercel. The canonical source repository is https://github.com/ahrazzle/rift-manager.

## Assets, proxy and saves

The tracked `vercel.json` contains the live project's `/staging/(.*)` proxy to the
staging hostname. Preserve it for any later live release. The staging script writes
an empty config only in its temporary copy, because staging serves its own root.
Keep Vite `base: './'`: relative assets resolve under `/staging/`.

Live saves use `lck-manager-save-v1`; staging paths/hostnames use
`lck-manager-staging-save-v1`. Staging can import a legacy save on first load, then
writes only its own key. The two hostnames have separate browser storage origins.

## Historical Vercel live promotion

Live requires a separate explicit instruction. Verify its project ID before use,
retain the staging proxy in its deployment config, and deploy from a git-free copy.
Keep the repository's `main` branch aligned with the verified live release. Record
the source SHA, deployment identity, asset hashes, and verification in a release
record; consult deployed artifacts rather than assuming a branch was deployed.

## Source reconciliation

After a release, ensure `main` contains the reviewed application source matching
that release and record its verification. Keep any private working-file mirror in
sync only through its authorized owner workflow; repository contributors do not
need access to it. Exclude `.git`, `.env*`, `.vercel`, `node_modules`, and `dist`
from source exports. Never restore an old mirror over newer source.
