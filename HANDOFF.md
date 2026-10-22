# LCK Manager (lolsim) — Project Handoff

> Start here. This is the overview + continuing-project guide for other ASKA agents.
> For the internal feature/design history see `docs/`. For how to run/play see `docs/GUIDE.md`.

## What this is
A League-of-Legends esports **team-management simulation** (no in-game playing). You are the
head coach/GM: build a roster, set tactics, train players, sign free agents, and sim a season —
and a full multi-season career. Matches auto-resolve from a rating + form + tactics + traits model.

It is a **pure client-side React SPA** (Vite), state in `localStorage`, no backend. Static-hostable.

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

**Bottom line for the next agent:** Ahraz is building a *LoL-esports management sim* that feels real,
lets people relive esports history, and rewards real strategic thinking — shipped continuously on the
web. Optimize for that feeling and that depth; keep live and staging separate; verify what you deploy.

## Live state (as of this handoff, 2026-10-04)
- **Live (P0):** https://lolsim.askaconsult.com and https://lck-manager-five.vercel.app
  serve the P0 build (bundle `index-16I-M-51.js`). Two aliases, one Vercel project (`lck-manager`).
- **Staging (P1):** https://lolsim.askaconsult.com/staging serves a SEPARATE Vercel project
  (`lck-manager-staging`, bundle `index--aGgR-dS.js`) via a `/staging/*` rewrite proxy on the live
  project. P1 is experimental, **NOT merged to live**.
- **Git branch in this folder:** `staging` at commit `f8632ef` = full P1 (live-ready but unpromoted).
  `main` at `52a2e0e` = P0 (what is on the live root). See `git log`.

## Architecture at a glance
```
src/
  data/       league + rules data (EDIT to change the league): lck.js, traits.js, academy.js,
              development.js, events.js, coaches.js, seasons.js, campaigns.js
  engine/     pure sim (runs under node for tests): sim.js (series + per-game detail),
              season.js (round-robin schedule + playoff bracket builder)
  game/       app state + persistence: useGameState.js (single reducer, localStorage),
              ai.js (AI lineups/tactics), logic.js (win-prob: estimateSeriesWinProb, explainWinProb)
  components/ UI views: Dashboard, Lineup, Tactics, Strategy, Standings, Results, Market,
              Squad, Tournament, MatchDetail, Campaign, Guide, NewGame
  utils/      exportPng.js (shareable result image via html2canvas)
test/         node test suites (no framework): node test/<name>.test.mjs
```
- **Single source of truth for state:** `src/game/useGameState.js`. All mutation goes through one
  reducer; `PLAY_ROUND`, `PLAY_TOURNAMENT_ROUND`, `ADVANCE_SEASON`, `RESOLVE_EVENT`,
  `RESOLVE_PROMOTION`, `SET_SERIES_OPTION`, etc. When adding a feature, add a reducer action +
  wire the UI; do not mutate state outside the reducer.
- **Engine is additive-only.** `simulateSeries(lineupA, tacticA, lineupB, tacticB, rng, labelA,
  labelB, extra={})`. New behavior is an `extra` flag defaulting to the P0 path, so trait-free /
  feature-off output stays byte-identical. Keep this discipline or you'll break 6+ test suites.

## Features shipped (MVP → P0 → P1)
**MVP / core:** single round-robin LCK season (10 teams, BO3 series, 1 pt per series win), lineup
by role, tactics (style + phase), form training, free-agent market, standings, results, per-game
match detail (gold graph, player grades, event timeline, coach read).

**Upgrades:** Scenario Mode (locked historical seasons 2013/2015/2022), Career Mode (multi-season,
up to 10, player development + dilemmas + coaches + trading), multi-league (LPL/LEC/LCS) with
regional splits + MSI/Worlds international tournament bracket, in-sim strategic choices (draft
bias, support roam/stay, lane swap, win-condition), Campaign Mode (Faker's first LCK win — hard
wired wins the player can't change, winnable games are win-or-lose).

**P0 (on live):** resolver modes (biased/random/manual), stage-gated bracket reveal + keyboard +
manual resolver in Tournament, career dilemma events, shareable PNG export.

**P1 (on staging only):**
1. **Hidden traits** — One-Season Wonder, Injury Prone, Big-Game, Clutch, Inconsistent; revealed on
   first fire in the match log; age-driven spike/regression in development.
2. **Academy promotion** — career off-season may offer a generated prospect; promote (cut weakest
   bench to FA pool) or keep. `PromotionModal` in Squad.
3. **Win-prob explanation** — collapsible "Why X%?" panel (rating/form/tactics/H2H/trait/coaching).
4. **Fearless draft** — per-series toggle; game-N winner plays off comfort (-1.0) next game, biased
   mode only.
5. **Season playoffs** — top-4 single-elim (1v4, 2v3) BO3 semis + final appended to season end;
   feeds the season champion. This changed the post-season flow: a finished season now ends in
   `phase:'playoffs'` with an active bracket; MSI/Worlds build from *done* playoffs.

## How to run / build / test
```
npm install
npm run dev        # local dev on :5173
npm run build      # outputs ./dist  (vite base = './' — relative assets, works under /staging/)
npm test           # not defined; run suites directly:
node test/engine.test.mjs   # and the other 10 (see below)
```
**All 11 suites must exit 0 before any commit/deploy** (engine, season, sim-detail, career,
multileague, strategy, scenario, scenario-selector, p0-engine, p0-ux, p1). Tests use `node:assert`
and import the engine/reducer directly (no browser). Run them all; P1 playoff changes require
career/multileague/p0-ux to play the bracket before advancing seasons — don't "simplify" that away.

## How to continue the project
See **`docs/DEPLOY-AND-CONTINUE.md`** for the full ops runbook (deploy live vs staging, promote P1,
branching, common pitfalls). Summary:
1. Work on `staging` for experimental features; keep `main` = what's live.
2. Build + run all 11 suites green.
3. Commit as `proteus <proteus@askaconsult.com>`.
4. Deploy staging (`lck-manager-staging`) for experiments, or live (`lck-manager`) to ship.
5. To promote P1 to live: merge `staging`→`main`, then deploy the live project (relink
   `.vercel/project.json` first — it follows the last `vercel link`).

## Roadmap (next work, in order)
See `docs/` design docs. Owner-set priorities:
1. **Historical-year selector** (`docs/historical-year-design.md`) — pick a year; pull real rosters
   from the LoL esports API. Depends on a live-data layer (`docs/live-data-research.md`).
2. **Multi-league / international expansion** (`docs/multileague-design.md`) — LPL/LEC/LCS + MSI/Worlds.
3. **In-sim strategic choices that move win prob** (`docs/insim-choices-design.md`).
4. Campaign/storyline expansion beyond Faker's first LCK win (`docs/campaign-faker-first-lck.md`).

## Conventions & cautions
- **Data is fictional/balanced.** Ratings in `src/data/lck.js` are game-tuned, not real stats.
  Team/player names are LCK-flavor. Respect this when adding features.
- **No code/assets lifted from third-party games** (riftscore, worldssim, leagueofdraft) — design
  inspiration only (`docs/similar-games-research.md`, `docs/oss-survey.md`).
- **Secrets never in the repo/vault.** `.env.local` (LoL esports API key, Vercel/Cloudflare tokens)
  is gitignored and deliberately NOT copied here. Recreate locally; never commit.
- **No GitHub remote** — the repo is local + Vercel-only. Vault rule #4 (code merges on GitHub)
  does not apply to this project; the local repo IS the source of truth.
- Footer credit: "Created by @ahrazzle" → https://github.com/ahrazzle.

## Contact / ownership
Owner: Ahraz Arifuddin (@ahrazzle, a@askaconsult.com). Protean roles: Hazen=research,
Leo=design, Mozi=build, Shaka=QA, Proteus=orchestrate. Any ASKA agent may continue — coordinate
via `CHANGELOG.md` per the project-files SOP.
