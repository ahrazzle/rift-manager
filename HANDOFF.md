# Rift Manager — Project Handoff

Current source: `/Users/kethuda/Work/lolsim`. Restored from the latest online Drive
snapshot on 2026-10-12; the old mounted Drive copy was missing the October 10 expansion.
Local Git baseline: `06adf30`; active feature branch: `feat/match-experiences`.
There is no GitHub remote. Do not treat this repository's new `main` branch as a live release.

The app is a React 18 / Vite client-side management simulation. Saves live in the
browser; there is no backend or account system. Read `docs/GUIDE.md` to play,
`docs/DEPLOY-AND-CONTINUE.md` to deploy, and `CHANGELOG.md` for prior work.

## Current release scope

This release targets **lck-manager-staging only**:
https://lck-manager-staging.vercel.app/ and https://lolsim.askaconsult.com/staging/.
The live root is the separate `lck-manager` project. It requires a separate promotion decision.

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
  calls, completed games and already-resolved AI matches. Staging has an isolated key.
  Save errors offer Retry saving; New Game asks before replacing the current session.

## Verification and continuing work

Run `npm ci`, `npm test`, and `npm run build` (24 suites in this release). The test runner discovers every
`test/*.test.mjs` suite and fails if any suite fails. Tests cover pure simulation,
real reducer lifecycles, save migration, React control events and server rendering.
React test host nodes are mocks: they do not certify native dialog focus or visual layout.
Native Safari verified the setup toggles, an animated Career match and its IGL pause.
Browser control became unavailable during follow-up; the complete call-to-result flow
is covered by React interaction tests. Mobile layout still needs device playtesting.

Deploy with `bash scripts/deploy-staging.sh` from a clean committed tree. It verifies
all suites, copies the commit without `.git`, pins the staging project ID, and deploys
without moving domains. Verify the returned URL, then promote that deployment to the
staging alias as described in the runbook. Never deploy this machine's Git identity.

## Why this exists — owner's intent & vision
Synthesized from the owner's (Ahraz's) prompts, instructions, and directives this session. Read this
to understand *what he is trying to create and why* — it drives prioritization more than any spec doc.

**The core idea.** Ahraz wants the *feeling of running a real LoL esports org* — the draft/tactics
decisions, roster building, player development, chasing titles — without the mechanical grind of
playing matches. Football Manager, but for League of Legends esports. He explicitly said **no in-game
playing**: the sim resolves matches; the player's craft is in the management layer (lineup, tactics,
training, roster moves, and later, live in-sim strategic calls). This is a *thinking* game, not a
reaction game.

**What he's optimizing for.**
- **"Football Manager" depth, LoL esports flavor.** Real teams/players/coaches feel, real-ish
  formats (round-robin + playoffs + international brackets). Names are LCK-flavor with fictional
  balanced ratings for now — the *structure and systems* are the product, real data is a later upgrade.
- **Reliving esports history.** He wants players to *pick a year* and play that season with that
  era's rosters, so people can **relive early LoL esports**. And a **campaign/storyline mode** that
  recreates iconic runs (starting with **Faker's first LCK win**) — locked historical outcomes the
  player can't change, with the winnable games being genuinely win-or-lose. The emotional hook:
  *walk in the shoes of a legendary run.*
- **Real strategic depth that moves outcomes.** In-sim choices (draft bias, support roam/stay, lane
  swap, win-condition priority) that actually change win probability — so management decisions matter,
  not just roster stats. ("Strategy should affect the sim, not just be cosmetic.")
- **Reach across the world map.** Expand beyond LCK to **LPL / LEC / LCS** regional leagues and the
  international circuit (**MSI + Worlds**), so a career spans a regional split and a world-title chase.

**How he wants it built & shipped (working style).**
- **Web-first, always-on.** Pure web app, hosted, reachable on **lolsim.askaconsult.com**. Deploy
  **continuously** — "every feature/upgrade deploys as soon as it lands," not batched. Experimentation
  happens on a **staging** fork (`/staging`) that never contaminates live until approved.
- **Ship, don't describe.** "P0 all implemented and deployed." "Make sure it's live." The bar is a
  **working artifact on both live URLs**, verified, not a plan or a stub.
- **Tight UX.** Players shouldn't bounce to a separate results page — after a game is simmed, **show
  all results inline on the same page** with a "next game" button when ready. Small polish matters
  (e.g. removing stray "selected" text from selectors; the `@ahrazzle` footer credit).
- **Sourcing is OK for inspiration, not for code.** He pointed at similar games (riftscore, worldssim,
  leagueofdraft) as places to **source features/ideas** — design-mechanic inspiration only, never lift
  code/assets. Respect the fictional-data rule until the real-data layer lands.

**Roadmap order he set (2026-10-04):**
1. **Campaign/storyline mode first** — scoped narrow to Faker's first LCK win (only LCK exists so far).
2. Then the **historical-year selector** (pick a year → real rosters/stats from that season).
3. Then **multi-league + international** (LPL/LEC/LCS + MSI/Worlds).
4. Then **in-sim strategic choices** that feed win probability.
   (Note: the design docs in `docs/` describe 1–4; the P1 build already delivered an experimental
   version of #2/#4 mechanics on staging — traits, win-prob panel, fearless, playoffs, academy —
   as building blocks toward the full vision.)

**Direction for the next agent:** Ahraz is building a *LoL-esports management sim* that feels real,
lets people relive esports history, and rewards real strategic thinking — shipped continuously on the
web. Optimize for that feeling and that depth; keep live and staging separate; verify what you deploy.

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
live-only rewrite in the tracked `vercel.json`; the staging deploy script removes it
from the temporary deployment copy. Keep footer credit `Created by @ahrazzle` linked
to https://github.com/ahrazzle. No third-party game code/assets are copied.
Never commit or sync `.env*`, tokens, `.vercel`, `node_modules`, `dist`, or `.git` to Drive.
Use the existing project commit identity `proteus <proteus@askaconsult.com>`.

Next work is in `docs/roadmap.md`: verified historical data, deeper event-level IGL,
and optional server-backed language-model flavor. No API key should ever enter the
browser bundle. Source edits belong in the local repository and working-files folder
in the same session; append meaningful changes to `CHANGELOG.md`.
