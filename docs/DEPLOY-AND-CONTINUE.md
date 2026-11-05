# Rift Manager — Deployment runbook

## GitHub Pages publication

The canonical public game is https://www.rift.askaconsult.com/.
Source lives on `main`. Since [PR #15](https://github.com/ahrazzle/rift-manager/pull/15),
[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) runs on every push
to `main` and on manual dispatch. It installs dependencies with Node.js 24, runs
all tests, builds, checks `CNAME`, `.nojekyll` and relative asset references, then
publishes `dist/` to `gh-pages`. Pages serves that compiled branch.

**Merging a PR into `main` triggers live publication, including documentation-only
PRs.** Review and release authorization must happen before merging. A successful
source merge or build alone does not prove the public site updated: check the
workflow, Pages publication, anonymous root HTML and referenced assets. Preserve
`public/CNAME`, `public/.nojekyll` and Vite `base: './'`.

Record the reviewed source SHA, workflow run, published Pages SHA and served asset
checks in each release receipt. The workflow replaces Pages branch history, so
retain rollback source SHAs separately. An authorized rollback should restore the
intended reviewed source through the same workflow; do not replace `main` with
compiled files. DNS, permissions and Pages settings are separate changes.

The [November 3 release record](RELEASE-2026-11-03.md) records historical deployment
evidence, not the current published head. Social-card source reconciliation landed
through [PR #14](https://github.com/ahrazzle/rift-manager/pull/14); PR #10 is the
earlier overlapping proposal.

## Vercel redirect and staging

[PR #16](https://github.com/ahrazzle/rift-manager/pull/16) tracks the Vercel routing
configuration in [`vercel.json`](../vercel.json). On `lolsim.askaconsult.com`, paths
outside `/staging` permanently redirect to the corresponding path on the www
Pages site. `/staging/(.*)` remains a proxy to
https://lck-manager-staging.vercel.app/. The direct staging alias is also available.
These routes are Vercel configuration; GitHub Pages does not provide the proxy.
A repository configuration change needs its own Vercel deployment and served-route
verification before it can be treated as live behavior.

Staging uses the separate `lck-manager-staging` Vercel project. For an authorized
staging release:

1. Run `npm ci`, `npm test`, and `npm run build`, then commit the intended source.
2. Run `bash scripts/deploy-staging.sh` from a clean tree. It archives the commit
   without Git metadata, pins and verifies the staging project, and creates a
   deployment without moving domains. Do not use the legacy `deploy.sh`, which
   uses whichever project is locally linked.
3. Inspect the returned deployment and compare HTML and JS/CSS assets with the
   tested build. Use authenticated access for protected previews; keep protection on.
4. Promote that exact deployment to the staging alias only when authorized, using
   the project context printed by the script. Verify the direct alias and Vercel
   `/staging/` proxy, and confirm the public Pages game remains on its intended build.

The script removes live routing config only from its temporary staging copy.
Never deploy this machine's Git identity or commit `.env*`, `.vercel`, build output,
credentials or browser saves. Current account access must be checked when needed;
this document does not assert a contributor has credentials or release rights.

## Browser saves

[`src/game/persistence.js`](../src/game/persistence.js) selects
`lck-manager-staging-save-v1` for `/staging` paths or matching
`lck-manager-staging*.vercel.app` hosts. Other locations use `lck-manager-save-v1`.
If the staging key is absent, reading may fall back to the production key **on the
same browser origin**; validated state is then written only to the staging key.
This is not a cross-host migration. The www, lolsim and direct staging hosts have
separate localStorage origins. Redirecting a host does not transfer its saves.

## Source provenance

Keep reviewed source and release evidence in this repository. Historical recovery
records are in [SOURCE-RECOVERY.md](SOURCE-RECOVERY.md). Do not restore an old
working-file snapshot over newer source. Exclude `.git`, `.env*`, `.vercel`,
`node_modules` and `dist` from source exports.
