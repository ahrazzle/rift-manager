# Rift Manager — Project Handoff

Source: https://github.com/ahrazzle/rift-manager, default branch `main`.
Historical release evidence is recorded in [the release record](docs/RELEASE-2026-11-03.md).
The source was recovered from deployment and working-file snapshots in October
2026; [SOURCE-RECOVERY.md](docs/SOURCE-RECOVERY.md) preserves that provenance.

The app is a React 18 / Vite client-side management simulation. Saves live in the
browser; there is no backend or account system. Read `docs/GUIDE.md` to play,
`docs/DEPLOY-AND-CONTINUE.md` to deploy, and `CHANGELOG.md` for prior work.

## Current release scope

Production is https://www.rift.askaconsult.com/, served from `gh-pages`.
Every push to `main` triggers `.github/workflows/pages.yml`: tests, build and
publication to `gh-pages`. Merging source or documentation therefore initiates a
live release; review and authorization must precede the merge. Verify the workflow
and served HTML/assets afterward. Vercel staging remains separate at
https://lck-manager-staging.vercel.app/ and the legacy host's `/staging/` proxy.
The tracked Vercel config redirects other lolsim paths to the www site; see the
[runbook](docs/DEPLOY-AND-CONTINUE.md) for deployment and verification boundaries.

- Weekly coaching sessions in Season/Career: matchup scrims, lane mechanics,
  objective setup, or recovery. Visible form gains and bounded, one-match strength
  bonuses feed the same forecast and simulation. Substitutes do not inherit preparation.
- Series reviews count recorded objectives and gold patterns, with a next-week
  coaching focus. Draft/IGL retain their actual games for inline and Results review.
- Historical Career honors every selectable year/league. Career development branches
  from the chosen roster. Foreign tournament teams use the starting-year datasets;
  foreign qualifiers are seeded by tier, and formats are simplified.
- Four story modes: Season, Career, Scenario, Gauntlet. Draft and IGL are composable
  match add-ons, selectable at start and before each series, including international
  brackets. Show simulation is independent; IGL forces the map on.
- The original SVG map animates ten role icons, towers, dragon/Baron pits, deaths,
  rotations, objective events and the selected IGL call. Map positions are illustrative.
- One persisted match session owns setup, draft, map, decision, intermission and result.
  Story progression is applied once. Results keep actual games instead of recomputing
  different timelines. Watching alone preserves the same resolver and RNG output.
- IGL is still a strength-based continuation, not a full event-level macro engine.
  It retains the visible event/gold prefix, adjusts the unseen continuation, and
  reconciles combat counts. Opening map gold interpolates from zero to the engine's
  five-minute checkpoint. Objective timing and positions are stylized.
- Saves migrate standalone Draft/IGL into Season + add-on, retaining unfinished drafts,
  calls, completed games and already-resolved AI matches. Staging paths/hosts have
  an isolated key on each origin. Host changes do not transfer saves.
  Save errors offer Retry saving; New Game asks before replacing the current session.

## Verification and continuing work

Run `npm ci`, `npm test`, and `npm run build`. The test runner discovers every
`test/*.test.mjs` suite and fails if any suite fails. Tests cover pure simulation,
real reducer lifecycles, save migration, React control events and server rendering.
React test host nodes are mocks: they do not certify native dialog focus or visual layout.
Earlier Safari checks covered setup toggles and an animated Career match with its IGL
pause. PR #8 records Chromium checks at desktop and mobile viewport widths. This
release reused the tested source; no new device-coverage claim is made here.

Deploy with `bash scripts/deploy-staging.sh` from a clean committed tree. It verifies
all suites, copies the commit without `.git`, pins the staging project ID, and deploys
without moving domains. Verify the returned URL, then promote that deployment to the
staging alias as described in the runbook. Never deploy this machine's Git identity.

## Product direction

Rift Manager focuses on the decisions behind an esports team: lineups, tactics,
roster moves, training, draft, and strategic calls. Matches resolve in the
simulation rather than through direct player control. Historical seasons and
campaigns give those decisions context; ratings and formats remain simplified.

Contributions should preserve meaningful management decisions, clear inline match
results, and a browser-first experience. Research other games for design ideas,
not code or assets. Keep production and staging separate and verify each release.
Current future work is tracked in `docs/roadmap.md`; older design documents are
historical proposals rather than promises of delivered functionality.

## Architecture

- `src/data/`: fictional ratings, year/league rosters, campaigns, champions, coaches.
- `src/engine/`: pure match and schedule simulation; additive optional behavior.
- `src/game/useGameState.js`: reducer; all gameplay mutations go through actions.
- `src/game/persistence.js`: environment-aware save keys and storage access.
- `src/game/preparation.js`: deterministic training, scouting and match bonus.
- `src/game/matchReview.js`: descriptive analysis of generated match events.
- `src/components/`: game screens; `src/styles.css` and `src/management.css` style them.
- `src/utils/exportPng.js`: lazy-loads html2canvas only for a requested export.

## Conventions and limits

Ratings are fictional, balanced game values. Historical names have uncertainty tags;
do not present these as verified esports statistics or exact historical formats.
Keep `base: './'` in Vite so assets work through the staging path proxy. Keep the
legacy-host redirect and staging proxy in the tracked `vercel.json`; the staging deploy script removes it
from the temporary deployment copy. Keep footer credit `Created by @ahrazzle` linked
to https://github.com/ahrazzle. Champion portraits are loaded from Riot’s Data Dragon CDN; third-party names and
imagery are not original project assets.
Never commit credentials, `.env*`, `.vercel`, `node_modules`, or `dist`. Use your own
Git identity for contributions.

Next work is in `docs/roadmap.md`: verified historical data, deeper event-level IGL,
and optional server-backed language-model flavor. No API key should ever enter the
browser bundle. Submit source changes through focused pull requests and append meaningful changes
to `CHANGELOG.md`.
