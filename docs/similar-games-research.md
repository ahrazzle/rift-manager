# Similar Games Research — 3 LoL Web Sims

Researched 2026-10-04 (Hazen). Method: page fetch + meta/JS-bundle inspection (all three are JS SPAs with thin SSR HTML) + secondary write-ups. No code or assets taken from any of these products.

## 1. RiftScore / Rift Career — https://riftscore.net/lol/

**What it is:** A single-player pro-*player* career simulator: create a player (name, region, role, fixed 50 OVR at age 16) and play season-by-season through transfers and career dilemmas to win regional/international titles. ~3-minute full career; sibling sims for Valorant and Rocket League on the same engine.

**Features / mechanics / UI patterns (verified in HTML + `app.js`/`teams.js` bundles):**
- Player-creation funnel: name → region (Korea, China, Europe, APAC, NA, LATAM) → role (Top/Jungle/Mid/ADC/Support with icons) → Start career. i18n (EN/ES/FR/KO).
- Season loop: simulate one season → receive 3 transfer offers → pick next club (or retire). First-club choice is a starter-offer set; later offers are OVR/reputation-gated (`offerRangeBonus` widens the band).
- Age-based development curve is explicit data: `growthByAge` table (16: +3/+8 … 24: −1/+2 … 30+: −6/0, hard decline to 34), plus `potential.ceiling` clamp, visible `young_talent` (growth window shifted +2 yrs) and `longevity` traits.
- Hidden traits rolled at creation (`faithful`, `globetrotter`, `giant_killer`, `dominator`, `adaptable`, `injury_prone`, `one_season_wonder` with a waiting/holding phase that fires at a set age).
- Career dilemmas as branching events with real costs: wrist-injury sabbatical (rest = −3 OVR + missed season vs. play on = 50% recover else worse, then 25/50/25 retirement/mandatory-sabbatical/recovery), betting scandal, locker-room conflict, role-change offer (−2/−3 OVR but +offer range), academy tryouts (34/33/33 promotion probabilities), burnout/mental-health sabbaticals.
- Academy → parent-team promotion path (LCK/CL-style academies: T1 Academy Rookies, DK Challengers, HLE Challengers, EDG Youth, etc.); real-team database with reputation tiers and league quotas feeding Worlds/MSI qualification (`qualifiersForTournament` off split standings).
- Season timeline UI: Winter/Spring/Summer splits + career-history table with per-split positions and trophy icons; previous-year positions shown on each offer card; career-image export via html2canvas ("Download career", shareable PNG); localStorage persistence.

**Differs from lck-manager:** you play *one player*, not the manager's desk — no lineup/tactics, market/trading, training allocation, or match-level agency. Its season resolution is one click; all texture comes from dilemmas and the career arc.

**Design inspiration to steal:** (1) the explicit age-growth table + potential ceiling as a tunable data file; (2) hidden traits with delayed triggers (one-season wonder); (3) dilemma-event template (title/description/2 options with stated odds + costs); (4) academy-to-main promotion offers; (5) career-image PNG export as a shareable artifact.

## 2. WorldsSim — https://worldssim.com/playground

**What it is:** A Worlds/MSI *tournament-outcome* sandbox: pick winners stage-by-stage through Play-In qualifier choice → Swiss stage → knockout/double-elim bracket, under different probability models. No team management at all — pure "what-if the bracket" toy with shareable predictions.

**Features / mechanics / UI patterns (verified in JS bundle + PTT/Disp user write-up):**
- Four resolution modes per match: **Biased** (LCK/LPL auto-win), **Random** (pure 50/50), **Betting** (real bookmaker odds drive win probability; shown via "Show odds", not user-editable), **Manual/Lock-in** (click the team you want through).
- Stage-gated reveal: each stage simulates only after the previous one completes, preserving draw suspense; Swiss stage uses proper seeding/pooling and generates knockout matchups from Swiss results.
- Routes: `/playground` (custom: "make your own picks and see how the tournament unfolds"), `/playground/bracket` (8-team double-elim w/ upper/lower bracket + grand final), `/msi/live`, `/live` (real-tournament tracking editions); per-year editions (2024 → 2025 → 2026).
- Keyboard shortcuts for advancing sim rounds (Q/W/E/F/T/S); "Share your predictions with friends" social hook; results detail gap noted by users (Swiss BO3 game scores O-X-O vs 2-0 not visible).

**Differs from lck-manager:** no persistence, progression, or management — a single-session bracket toy over *real* teams/odds. Our MSI/Worlds brackets already cover its structure; it adds nothing in team-building but a lot in *sim-mode presentation*.

**Design inspiration to steal:** (1) the four-mode resolver (Bias/Random/Odds/Manual) as a user-facing sim-speed control; (2) stage-gated reveal for our MSI/Worlds; (3) keyboard-steppable sim; (4) shareable prediction/bracket export; (5) per-game score detail (2-0 vs 2-1) in bracket results — a gap our multi-league playoffs share with it.

## 3. LeagueOfDraft — https://leagueofdraft.lol/

**What it is:** A multiplayer LoL *pick/ban draft battle* game: build a team comp in a full champion draft phase (blind/tournament/Fearless modes, BO1/BO3/BO5, per-pick timer), then an algorithmic prediction model (hundreds of metrics, retrained per MSI) decides the winner from the final comps; Elo/LP divisions, public lobbies with codes + lobby chat, and community voting on past drafts.

**Features / mechanics / UI patterns (verified in `main.*.js` bundle strings + changelog):**
- Real draft Pab phase UI: turn-ordered pick/ban slots, champion grid with search/filter, drag-to-vote, LOCK IN button, per-pick/ban time limit, blue-side first-pick rotation, host-only settings, lobby codes + "player has not joined, share code to invite".
- Modes: DraftMode variants, Best-of-1/3/5, **Fearless Draft** toggle (auto-disabled for BO1), opponent AI/human; coin-flip for side selection in later rounds.
- Post-draft prediction model: evaluates comps on hundreds of metrics (shown as brief overview: KDA, GLD@15, XPD@15, CS/min, vision/min, DMG%/GOLD% share); result page with full stat lines; feedback loop ("prediction will not change the result, helps future improvements").
- Meta-game: Elo/LP divisions like ranked ("earn LP, move up and down"), Battle Leaderboard, "Draft Voter" (browse others' drafts, vote winner, compare vs community average, build score), Cubes/profile cosmetics for voting streaks, live online counter, public-lobby browser, changelog + contact/feedback forms.

**Differs from lck-manager:** draft is the *entire* game; there is no season, roster, economy, or career. Champion-level (not player/team-level) simulation, and it needs a live champion-stat dataset we deliberately don't carry.

**Design inspiration to steal:** (1) Fearless-draft toggle for our scenario/playoff series; (2) per-pick timer + LOCK IN ritual for our in-sim draft-bias choices; (3) prediction-model *explanation* panel (top contributing factors) applied to our `simulateSeries` win-probability display; (4) community-vote / leaderboard loop around fixed scenarios; (5) host-controls + lobby-code pattern if we ever do pass-and-play.

---

## Adoptable Features (prioritized)

### P0 — high value, low effort, fits fictional-data sim
1. **Stage-gated bracket reveal + keyboard stepping** — sim MSI/Worlds one round at a time instead of all-at-once; suspense for free. *Why:* pure UI flow, no engine change. *Effort: S.* *Plugs into:* multi-league.
2. **Resolver-mode selector (Bias/Random/Manual)** — per-tournament toggle: favorite-weighted, pure-50/50 chaos, or click-winners-through. *Why:* mirrors WorldsSim's best idea using our existing ratings; skip Betting (needs real odds). *Effort: S.* *Plugs into:* engine, multi-league, scenario.
3. **Per-game series scores (2-0 vs 2-1)** — store/display game-level results inside BO3/BO5. *Why:* small engine output extension, big bracket-credibility win. *Effort: S.* *Plugs into:* engine, multi-league, season playoffs.
4. **Dilemma-event template with stated odds/costs** — 2-option events (injury rest-vs-play, scandal, role conflict) with explicit probabilities and OVR costs, à la RiftScore. *Why:* cheapest narrative depth for career; reuses our retire/train systems. *Effort: S/M.* *Plugs into:* career (later season).
5. **Explicit age-growth table + potential ceiling as data** — publish our dev curve like RiftScore's `growthByAge` so Leo/Mozi can balance it. *Why:* turns hidden tuning into a design file. *Effort: S.* *Plugs into:* engine (player development), career, season training.
6. **Shareable result export (bracket PNG / career image)** — html2canvas-style snapshot of final standings or career history. *Why:* proven viral loop on both RiftScore and WorldsSim; trivial with our client-side render. *Effort: S.* *Plugs into:* season, career, multi-league.

### P1 — medium value or effort
7. **Hidden player traits with delayed triggers** — e.g. one-season-wonder spike, injury-prone, big-game player. *Why:* career/season replayability without new UI. *Effort: M.* *Plugs into:* engine, career, season.
8. **Academy → main-roster promotion offers** — second-tier roster per org feeding call-ups. *Why:* gives our market a farm system; needs data + UI. *Effort: M.* *Plugs into:* season market, career.
9. **Win-probability explanation panel** — top factors behind `simulateSeries` odds (form, H2H, draft bias), like LoD's stat overview. *Why:* makes in-sim choices feel legible. *Effort: M.* *Plugs into:* engine, season (match preview).
10. **Fearless-draft toggle for series** — picked comps locked out in later games of a BO3/BO5. *Why:* authentic 2025+ pro rule; small draft-state change. *Effort: M.* *Plugs into:* engine, scenario, multi-league playoffs.
11. **Season playoffs for our round-robin splits** — top-N cut to a bracket (WorldsSim's core loop, internal). *Why:* gives seasons a climax; bracket code partly exists. *Effort: M.* *Plugs into:* season, multi-league.

### P2 — nice-to-have / large effort
12. **Elo/LP divisions + leaderboards around fixed scenarios** — ranked ladder for Faker-challenge / historical replays. *Why:* retention engine, but needs identity/storage/anti-cheat. *Effort: L.* *Plugs into:* scenario.
13. **Community draft/bracket voting** — browse + vote on others' outcomes. *Why:* needs backend + moderation; no local equivalent. *Effort: L.* *Plugs into:* scenario, multi-league.
14. **Multiplayer lobbies (codes, host controls, chat)** — pass-and-play or netplay drafts. *Why:* architecture jump for a client-side SPA. *Effort: L.* *Plugs into:* none currently.
15. **Live-odds resolver** — real bookmaker probabilities as a sim input. *Why:* conflicts with fictional-data principle; treat as rejected unless a manual-odds entry variant. *Effort: M/L.* *Plugs into:* engine (rejected — see dead ends).

---

## Licensing caution

RiftScore/Rift Career, WorldsSim, and LeagueOfDraft are **third-party products**. Do NOT lift their code, copy their exact assets, branding, team data, or text. Use them only as **design-mechanic inspiration** (flows, probability models, progression shapes). Our rosters/ratings are intentionally game-balanced fiction; any "live data" feature must remain manual/user-entered simulation input — never scrape or replicate real APIs, odds feeds, or proprietary datasets.

## Dead ends for us (do not pursue)

- **Full champion-level draft sim (LoD core):** needs a live champion-stat dataset and is a different game; our abstraction is team/player ratings by design.
- **Real-team/real-odds integration (WorldsSim Betting mode, LoD MSI-trained model):** violates our fictional-data rule and adds external dependencies.
- **Single-player career as the *primary* fantasy (RiftScore):** overlaps but inverts our manager fantasy; borrow its systems (growth curves, dilemmas), not its premise.
