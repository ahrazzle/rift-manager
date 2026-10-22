# LCK Manager — Deploy & Continue Runbook

Ops for shipping lolsim. Two environments, one repo.

## Environments
| Env | Vercel project | Alias / URL | Git branch | Build |
|-----|----------------|-------------|-----------|-------|
| Live | `lck-manager` | https://lolsim.askaconsult.com , https://lck-manager-five.vercel.app | `main` | P0 (`index-16I-M-51.js`) |
| Staging | `lck-manager-staging` | https://lck-manager-staging.vercel.app , served at https://lolsim.askaconsult.com/staging | `staging` | P1 (`index--aGgR-dS.js`) |

Scope for all deploys: `a-4677s-projects`.
Deploy binary: `~/.npm-global/bin/vercel`.

## The staging proxy (why it works)
Vercel maps one project per hostname, not per path. So `lolsim.askaconsult.com/staging` is NOT a
route inside the live project — it's a **rewrite proxy**. The live project carries `vercel.json`:
```json
{"rewrites":[{"source":"/staging/(.*)","destination":"https://lck-manager-staging.vercel.app/$1"}]}
```
The staging build uses relative `./assets/` (vite `base:'./'`), so it resolves correctly under
`/staging/`. Live root is untouched. This `vercel.json` lives on `main` and must stay.

## ⚠ The #1 pitfall: `.vercel/project.json` is sticky
`vercel link --project <name>` writes `.vercel/project.json` and every later `vercel deploy` goes to
whatever project is linked **right now**. It follows the last link/deploy, not the branch.
- **Before any deploy, verify:**
  ```
  cat .vercel/project.json | grep projectName
  ```
  It must say the project you intend to deploy (`lck-manager` for live, `lck-manager-staging` for staging).
- If wrong: `vercel link --project <correct>` then deploy.
- Deploying the wrong project is the classic "why did my experiment go live" incident.

## Deploy STAGING (P1 experiments)
```
git checkout staging
npm run build
node test/engine.test.mjs && node test/season.test.mjs && node test/sim-detail.test.mjs \
  && node test/career.test.mjs && node test/multileague.test.mjs && node test/strategy.test.mjs \
  && node test/scenario.test.mjs && node test/scenario-selector.test.mjs \
  && node test/p0-engine.test.mjs && node test/p0-ux.test.mjs && node test/p1.test.mjs   # all must pass
cat .vercel/project.json | grep projectName   # must be lck-manager-staging
~/.npm-global/bin/vercel deploy --prod --yes --scope a-4677s-projects
```
Or just `./deploy.sh "message"` — but check the link first (deploy.sh deploys whatever is linked).

## Deploy LIVE (ship)
```
git checkout main
git merge staging                 # or fast-forward if main is behind
npm run build && node test/*.test.mjs   # re-verify all 11
vercel link --project lck-manager        # ensure live project linked
~/.npm-global/bin/vercel deploy --prod --yes --scope a-4677s-projects
```
Verify after: both `https://lolsim.askaconsult.com/` and `https://lck-manager-five.vercel.app/`
serve the SAME `index-*.js` hash. (A fresh deploy can briefly point the custom domain before the
.vercel.app alias — wait ~30s and re-check.)

## Promote P1 → live (the intended next step)
P1 is live-ready on `staging` but unpromoted. When approved:
```
git checkout main
git merge staging          # merge commits are the convention here
git checkout staging       # relink so staging keeps deploying staging
vercel link --project lck-manager-staging
git checkout main
vercel link --project lck-manager
~/.npm-global/bin/vercel deploy --prod --yes --scope a-4677s-projects
```

## Verifying a deploy
```
# live root bundle
curl -s https://lolsim.askaconsult.com/ | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js'
# staging bundle (relative asset path)
SB=$(curl -sL https://lolsim.askaconsult.com/staging/ | grep -oE '\./assets/index-[A-Za-z0-9_-]+\.js' | head -1)
curl -sL "https://lolsim.askaconsult.com/staging/$SB" | grep -c "P1 marker string"
```
Grep the JS bundle for a known feature string (e.g. `Fearless`, `RESOLVE_PROMOTION`) — minified JS
won't keep function names, so match on UI/message strings.

## Local dev caveats
- Vite dev server is for UI; run the engine via `node test/*.test.mjs` for logic.
- `browser_exec` refuses `localhost` (private URL). To view a local build in a browser, serve
  `dist/` over a public-ish port and drive a real Chrome via CDP, or just deploy to staging.
- Secrets: recreate `.env.local` locally (LoL esports API key, Vercel token, CF token). NEVER commit
  or copy into the vault. `.env*` is gitignored.

## Commit identity
Every commit: `git -c user.name=proteus -c user.email=proteus@askaconsult.com commit ...`
(Mozi's default git identity must be overridden — see MEMORY.)
