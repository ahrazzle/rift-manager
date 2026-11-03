# OSS Sports-Sim Survey — reusable ideas for lck-manager

**Date:** 2026-10-04 · **Author:** Hazen (research) · **Status:** STABLE assessment
**Context:** lck-manager is a client-side React 18 + Vite SPA, no backend, state in
`localStorage`, match sim in `src/engine/sim.js` (rating + form + tactics), schedule in
`src/engine/season.js`, data in `src/data/lck.js`. Anything requiring a server DB is
rejected for code reuse. **No application code was written for this doc; no commit.**

**License ground rule:** only *concepts* may be lifted from copyleft / proprietary
projects. Verbatim code may only be taken from permissive-licensed (MIT / Apache-2.0)
sources, with attribution. Each section states the license first.

---

## 1. openfootmanager — https://github.com/openfootmanager/openfootmanager

**What it is:** free/open football-manager game (1.1k ★, very active — commits within
days of this writing). Text-based manager, not a clone of Football Manager.

**Stack:** Rust (match-sim engine + game state) · Tauri desktop shell ·
React + TypeScript + TailwindCSS frontend · SQLite local persistence.
Features: event-driven text match sim with commentary, squad/roles/depth management,
transfers + contracts, training + staff, scouting, dynamic inbox/news generation,
youth intake with board-set wage policy, i18n, moddable world data (`.ofm` packages),
seeded/deterministic sim (tests pin "reload does not change results").

**License: GPL-3.0 (strong copyleft).** ⚠️ Do NOT copy code into lck-manager unless
lck-manager itself becomes GPL-3.0. Concepts and data-schema *ideas* reimplemented
clean-room are fine.

**Worth borrowing (concepts only):**
- **Data model:** entity schema for players/teams/seasons split from engine code;
  authorable/shareable world-data packages (`.ofm`) — lck-manager's `src/data/lck.js`
  could grow into a versioned, validatable league-data file with the same separation.
- **Match sim:** Markov-chain event engine producing a commentary/event log, not just a
  score — directly applicable to a LoL match timeline (kills, objectives, teamfights).
- **Determinism:** seeded RNG so a save reload reproduces results; worth adopting as a
  stated invariant with a test.
- **Inbox/news generator:** event → templated news text pipeline keeps a manager game
  alive between matches; cheap to implement, high flavor value for an LCK sim.
- **Youth intake + training/staff systems:** model for LCK academy/rookie generation
  and coaching-staff effects on development.

## 2. open-websoccer (OpenWebSoccer-Sim) — https://github.com/ihofmann/open-websoccer

**What it is:** PHP-based *online multiplayer* football manager (120 ★, maintained;
successor of HSE WebSoccer-Sim). Human managers set tactics, trade, train, scout
youth, expand stadiums; matches auto-simulated in real time with live ticker + reports.

**Stack:** PHP 8.4/8.5 + Twig + MySQL 8.0, Docker Compose, esbuild frontend assets,
PHPUnit + Playwright E2E. **Requires Apache + MySQL + cron-style scheduled sim.**

**License: LGPL-3.0 (weak copyleft).** Less contagious than GPL for *linking*, but the
practical blocker is architectural, not legal: it is a server app.

**Worth borrowing (schema/structural ideas only — REJECT all code):**
- **League/season/cup structure:** seasons → matchdays → tables, plus cup brackets and
  promotion/relegation logic; its DDL/wiki is a good checklist for what a season model
  must cover (fixtures, standings tiebreakers, cup draws). lck-manager can mirror the
  *shape* (season object with stages) without the SQL.
- **Transfer-market workflow:** bid windows, minimum prices, competing AI bids — a
  template for an LCK free-agency/stove-league window.
- **Youth academy + stadium/finance loop:** morale/training/facility effects as simple
  numeric modifiers — adaptable as team-facility / coaching-budget modifiers.
- **Live ticker pattern:** minute-by-minute event feed UI is directly reusable as a
  design pattern for LoL match detail view.

**Verdict:** nothing deployable client-side; treat as a design reference for league
operations only.

## 3. ZenGM (Basketball GM / Football GM / ZenGM Baseball & Hockey) — https://github.com/zengm-games/zengm

**What it is:** the closest architectural match to lck-manager: single-player sports
management sims **implemented entirely in client-side JavaScript, backed by IndexedDB**
(472 ★, 19k+ commits, actively maintained). One codebase (`SPORT=` env switch) ships
four sports. UI in React + Bootstrap; sim core runs in a Shared/Web Worker; an
IndexedDB-backed cache layer keeps hot data in memory.

**License: ⚠️ PROPRIETARY custom license — NOT open source.** You may view, edit, run
locally (private only), and share source — but may NOT host a playable fork, wrap it
in an installer, or deploy anything derived for public use. **Do NOT copy any ZenGM
code into lck-manager (which is deployed as a static site).** Reimplement *concepts*
clean-room only. This is the strictest license of the four — stricter than GPL for
our purposes.

**Worth borrowing (concepts, clean-room reimplementation):**
- **Player model — ratings + development/regression:** composite ratings (e.g. OIQ/DIQ
  analogues → for LoL: mech/macro/consistency/teamplay), age-curve development with
  randomness, draft-prospect generation with hidden potential ("fuzz"). The single
  highest-value idea: replace flat ratings with **overall + components + age curve +
  potential**, all in pure JS.
- **Contract/market economy:** salary demands tied to overall + age, cap space, free
  agency bidding, trade AI with value-over-replacement logic — template for LCK salary
  cap / free-agent signing AI.
- **Schedule generation:** balanced round-robin + playoff bracket generators per sport;
  sport-agnostic algorithm adaptable to LCK split + playoffs + (MSI/Worlds-style) cups.
- **Stat tracking & history:** per-season player/team stats tables with career totals
  and record books; cheap in localStorage/IndexedDB, huge replay value.
- **Persistence pattern:** hot-state cache over durable store; lck-manager's
  `useGameState.js` + `localStorage` is the same idea at smaller scale — if saves grow,
  migrate durable layer to IndexedDB while keeping the current hook API.

## 4. GitHub topic `football-simulation` — most-relevant repos surfaced

Topic has ~50 repos; most are prediction/ML toys, Spring/MySQL demos, or R packages.
Three are relevant to a client-side JS sim:

### 4a. ZOXEXIVO/open-football (★225, active, **Apache-2.0** ✅ permissive)
Pure-Rust headless football sim engine (`src/core` sim, `src/database` data-loading,
`src/web` HTTP + templates), multi-core batch simulation, **data kept in a separate
repo** (`open-football-database`) so the world updates without touching engine code.
**Takeaways:** (1) Apache-2.0 means formulas/algorithms *can* be ported with
attribution — the only surveyed engine where that's true; (2) separate-data-repo
pattern validates splitting `lck.js` data from `engine/`; (3) dev harness for fast
match-result checks + duration profiling is worth copying as `test/` scripts
(lck-manager already runs `sim.js` under node — extend that); (4) squad-role/depth
logic (SquadLadder, role promises, playing-time morale) ports cleanly to LoL roster
roles (starter/sub, role-score). **Reject** the Rust runtime and HTTP server — port
ideas to JS only.

### 4b. GallagherAiden/footballSimulationEngine (★178, **MIT** ✅ permissive)
Node.js match-sim module: `initiate → iterate → second-half` tick functions over plain
JSON team/player objects (skills: passing/shooting/tackling/agility/…, fitness,
position, per-player mutable stats). **Takeaways:** the closest thing to a droppable
*design* for a JS tick sim — lck-manager could evolve `sim.js` toward an
iteration/event-tick model emitting a per-tick log (kills/towers/dragons/barons as
"events"), and its player-JSON shape is a usable template for a richer LoL player
object. MIT allows verbatim reuse with attribution, but the soccer specifics need
rewriting anyway — treat as pattern reference.

### 4c. atas76/openengine (★87, **MIT** ✅ permissive)
Java match-engine study project; motto "don't fake output" — input detail should be
consistent with output detail; maps goal attempts to expected-goals (xG) so outcomes
vary realistically. **Takeaways (philosophy only):** calibrate lck-manager's sim so
team-strength inputs produce believable scorelines/stat lines (e.g. expected-kill
model per minute rather than fixed scorelines); keep input/output at matching
fidelity. No code to lift (Java, experimental).

**Not relevant / rejected:** ML predictors (FBP), Spring/MySQL demos, R packages
(nflseedR), fantasy bots — wrong stack or wrong problem.

---

## 5. Prioritized recommendations for lck-manager (client-side JS, no backend)

### P0 — adopt first (small, pure-JS, high payoff)
1. **Component ratings + age-curve development/regression (ZenGM concept, clean-room).**
   Split the current flat rating into `mech / macro / consist / teamplay` + `overall`
   derived, add age-based growth/decline with noise and hidden potential for
   generated rookies. All pure JS in `src/engine/`; no storage change needed.
2. **Seeded RNG + determinism invariant (openfootmanager concept).** One small seeded
   PRNG module; sim takes a seed; add a test asserting reload/re-sim reproduces the
   season. Kills an entire class of save/load bug reports.
3. **Event-log match sim (openfootmanager Markov/event + Gallagher tick pattern).**
   Evolve `sim.js` from score-only to emitting an ordered event list (kills,
   objectives, teamfight swings) that both decides the result and feeds the match
   detail UI + news text. Still synchronous pure JS.

### P1 — next (structural, still client-side)
4. **Versioned league-data file (openfootmanager `.ofm` / open-football split-data
   pattern).** Add schema version + validation to `src/data/lck.js` so rosters/ratings
   update without touching engine code; document the format for contributors.
5. **Season-history & record books (ZenGM concept).** Persist per-season tables
   (standings, player stats, champions) in `localStorage` (IndexedDB only if size
   demands); add a History view. Pure client-side, big replay value.
6. **Free-agency/contract economy v1 (ZenGM + open-websoccer concepts).** Salary
   demands from overall × age, fixed cap, expiring contracts, simple AI bidding.
   No server needed; keep numbers in game state.
7. **Inbox/news generator (openfootmanager concept).** Template-driven news from
   sim events (upsets, streaks, signings, injuries). Static string templates + event
   queue — trivial client-side cost.

### P2 — later / if scope allows
8. **Schedule generator upgrade (ZenGM concept):** double round-robin + LCK playoff
   bracket + optional cup stage in `src/engine/season.js`.
9. **Squad roles + morale (open-football SquadLadder concept):** starter/sub promises,
   playing-time morale modifier on form.
10. **Academy/youth intake (openfootmanager/open-websoccer concept):** generated
    rookie pool each season with potential variance.
11. **xG-style calibration harness (openengine philosophy + open-football `.dev`
    tooling):** node script sweeping sim parameters over N seasons, asserting sane
    score/stat distributions.

## 6. AVOID
- **Copying ZenGM code** — custom proprietary license forbids public deployment of
  anything derived; concepts only, clean-room. Highest legal risk on this list.
- **Copying openfootmanager code** — GPL-3.0 would force lck-manager to become GPL-3.0;
  concepts only.
- **open-websoccer architecture wholesale** — PHP + MySQL + cron sim cannot run on a
  static host; reject anything shaped like a server table/cronjob (port only the
  league-structure *ideas*).
- **Rust/Java engines as runtimes** (open-football, openengine) — port algorithms to
  JS, don't add toolchains.
- **Over-complexity:** full 3D/tracking-data fidelity (openengine's long-term goal),
  multiplayer, live-money economies — out of scope for a single-player client sim.

---

## Top 3 to adopt first
1. **Component ratings + age-curve development/regression** (ZenGM concept, clean-room
   JS) — deepest gameplay payoff, zero infra cost.
2. **Seeded RNG + determinism invariant** (openfootmanager concept) — save integrity
   and testability foundation.
3. **Event-log match sim feeding UI + news** (openfootmanager/Gallagher pattern) —
   turns the sim into content for match-detail and inbox views.
