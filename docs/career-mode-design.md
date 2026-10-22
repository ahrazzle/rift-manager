# LCK Manager — Career / Manager Mode Design

**Status: STABLE** — implementation-ready. Do not change the locked schema (§2) without a versioned revision of this doc.

**Scope:** adds a third game mode, Career (team-manager fantasy), alongside Season and Campaign (Faker). Career spans up to 10 seasons on one managed team with coach + player hire/trade between seasons. No code is written by this doc. v1 ships on the `present` dataset only (§7).

**Source facts (current code):**
- `src/game/useGameState.js`: `freshState(seasonYear='present')` builds `teams`/`faPool`/`form` from `getSeason()`; `NEW_GAME {teamId, managerName, seasonYear}`; `SIGN {playerId}` moves one FA onto the managed team as starter; `PLAY_ROUND` sims a full round via `simulateSeries`; `mode: 'season' | 'campaign'`, `campaign: null | CampaignProgress`; `SAVE_KEY='lck-manager-save-v1'`; `load()` backfills missing fields for old saves.
- `src/components/NewGame.jsx`: Season | Campaign toggle; season path picks year + team, dispatches `NEW_GAME`; campaign path picks campaign, dispatches `START_CAMPAIGN`.
- `src/data/seasons.js`: `SEASONS` registry (`present`, `2022`, `2015-spring`, `2013-summer`), `SEASON_ORDER`, `getSeason(year)` with present fallback. Each year keeps the exact `TEAMS`/`FREE_AGENTS` shape.
- `src/data/lck.js`: `ROLES`, `makePlayer`-built players `{id,name,role,team,ovr,mech,macro,consist,form}`, `TEAMS`, `FREE_AGENTS`, `allPlayers()`.
- `src/engine/sim.js`: `simulateSeries(lineupA, tacticA, lineupB, tacticB, rng, labelA, labelB)` — takes lineups as `{role: player}` + tactics only. Never touches team ids or datasets. League-agnostic.
- `src/engine/season.js`: `roundRobin(teamIds)` is generic (even/odd + BYE); `buildLCKSchedule()`/`makeStandings()` hard-bind `TEAMS` but career does not need them (§6).
- Market/trade today: `SIGN` (FA → managed team, becomes starter) is the ONLY transfer mechanic. There is NO player-trade system, NO coach concept, NO coach roster in code. `docs/coach-roster-research.md` (Hazen) does not exist in this repo — the coach dataset is an open input (§3.1).
- `src/App.jsx`: tab nav is mode-gated (`isCampaign` switches nav; `market` tab is season-only).

---

## 1) Mode taxonomy

Career is a **third top-level mode** alongside Season and Campaign:

```
mode: 'season' | 'campaign' | 'career'
```

- **Season** = one split, one team, FA signings only. Unchanged.
- **Campaign (Faker)** = scripted historical bracket path. Unchanged.
- **Career** = up-to-10-season manager fantasy on one team: full season loop per season + coach staff + player hire/trade between (and during) seasons + season history + retirement.

NewGame gains a third picker (`Season | Campaign | Career`). Career setup reuses the season setup UI (manager name + team picker) plus a team-confirm step; the year picker is hidden for Career in v1 (v1 is `present`-locked, §7).

**Open question (Proteus confirming with user):** whether Career should be a third mode vs. a "multi-season Season" variant. This doc designs for the **third-mode option**. Alternatives noted and rejected for v1:
- (a) *Career as a Season flag* (`multiSeason: true`) — rejected: pollutes the Season state contract and Season UI with career-only surfaces (staff, history, retire).
- (b) *Career replacing Season* — rejected: breaks old saves' mental model and removes the quick-play path.
- If the user picks (a), the `career` object (§2) still applies verbatim; only the `mode` discriminant and NewGame wiring change.

---

## 2) LOCKED CAREER STATE CONTRACT (verbatim — honor EXACTLY)

`START_CAREER` action shape:

```
{ type: 'START_CAREER', teamId: string, managerName?: string }
```

- No `seasonYear` in v1 — Career always starts on `'present'` (§7). Unknown `teamId` → first team of `present` (same fallback rule as `NEW_GAME`).
- Base state is `freshState('present')` with `mode: 'career'`, then `career: freshCareer(teamId, managerName)`.

Persisted additions (additive; old saves lack all of them):

```
state.mode: 'season' | 'campaign' | 'career'   // extended union, existing values unchanged
state.career: Career | null                     // null unless mode === 'career'

Career = {
  managerName: string,          // team-manager persona (not coach)
  teamId: string,               // managed team; fixed for the whole career
  seasonIndex: number,          // 1..10, current season being played
  maxSeasons: 10,               // constant; career MUST end at 10
  status: 'active' | 'retired', // 'retired' set by RETIRE (auto at end of season 10, or voluntary)
  seasonYear: 'present',        // v1 locked; historical traversal is a later enhancement (§7)
  staff: { [teamId]: CoachId }, // head coach per team, ALL teams (managed + AI)
  coachPool: Coach[],           // unemployed coaches available to HIRE
  history: SeasonRecord[],      // one entry appended per completed season, in order
}

Coach = {
  id: string,                   // e.g. 'COACH-kkoma'
  name: string,                 // real coach name (from Hazen dataset when available)
  team: string,                 // teamId | 'FA'
  rating: number,               // 60..99 fictional, game-balanced like player ovr
  style: 'AGGR' | 'BAL' | 'DEF' // flavor + tiebreak display; no sim effect in v1
}

SeasonRecord = {
  seasonIndex: number,          // 1..10
  championId: string,           // standings winner of that season
  userPlacement: number,        // 1-based rank of managed team
  userW: number, userL: number, // managed team's series record
  coachId: string | null,       // managed team's head coach that season
}
```

Rules:
- `state.career` is **null** for Season/Campaign saves. `load()` backfill: if `career` key missing → `null`; if `mode` is unknown → `'season'` (existing behavior).
- `SAVE_KEY` unchanged. Old single-season and campaign saves load byte-identically (acceptance §8).
- `state.teams` / `state.faPool` / `state.form` / `state.lineup` / `state.tactic` / `state.standings` / `state.schedule` / `state.results` keep existing shapes and semantics — they describe the **current** season only. Career persistence across seasons lives in `career.*` + the carried `teams`/`faPool`/`staff` maps (§5).

### Calendar-year question — DECIDED for v1

Should a career advance through calendar years (start 2013 → 2022) or stay `present` +N? **v1 stays `present` +N.** Rationale: traversing the registry mid-career changes the team pool (16 → 8 → 10 teams), which breaks roster identity (traded players belong to teams that stop existing) and the fixed-`teamId` contract. v1 seasons are labeled `Season 1..10 (Present era)`. Historical-year traversal is a deferred enhancement (§7) requiring its own migration design.

### Finances — DECIDED: none in v1

No currency, budget, or salary cap in v1. Transfers are opportunity-limited, not money-limited: FA signings consume the finite `faPool`; trades are 1-for-1 swaps gated by AI acceptance (§4). A `budget` field is deliberately absent from the locked schema so a future economy can be added additively without migration.

---

## 3) Coach system

### 3.1 Coach dataset (open input)

No coach data exists in code. v1 needs a dataset with the same data-only philosophy as `seasons.js`:

```
COACH_DEFS = [{ name, rating, style }]            // one per team + 4..6 free agents
```

- Source: `docs/coach-roster-research.md` (Hazen) — **not present in this repo**; implementation is blocked on that file or an equivalent `{teamId, coachName}` list. Fallback if Hazen's doc never lands: ship fictional coaches (`'Coach <Team short>'`, rating = team tier − 5, style `BAL`) so mechanics are testable without real names.
- Ratings are fictional/game-balanced (same scope contract as players). Real names are flavor only.
- Per-team staff init: managed + AI teams each start with their listed coach in `career.staff`; unassigned names go to `career.coachPool` with `team: 'FA'`.

### 3.2 HIRE (sign a free-agent coach)

```
{ type: 'HIRE_COACH', coachId: string }   // career mode only, managed team only
```

- Removes coach from `career.coachPool`, sets `career.staff[managedTeamId]` to them; the **displaced** coach (if any) goes to the pool (`team: 'FA'`). Never deletes a coach.
- No-op unless `mode === 'career'`, `status === 'active'`, and `coachId` is in the pool.
- May be used mid-season (effect next `PLAY_ROUND`) — simple, no transfer-window gating in v1.

### 3.3 TRADE (swap coaches between teams)

```
{ type: 'TRADE_COACH', otherTeamId: string }   // swap managed team's coach with AI team's coach
```

- Atomic swap of `staff[managedTeamId]` ↔ `staff[otherTeamId]`.
- AI acceptance (deterministic, no RNG): accept iff `rating(incoming) >= rating(outgoing) - 5` — i.e. the AI will not gift a coach 6+ points better than what it receives. Rejected trades no-op (UI shows "declined").
- v1 is managed-team-only: AI teams never trade among themselves (no simulation of the AI market).

### 3.4 Coach effect on performance — minimal

Each coach carries `rating` (60–99). Effect: a **flat strength bonus for the managed team only**, scaled to be felt but not dominant:

```
bonus = (coachRating - 75) * 0.15   // rating 75 → 0; 90 → +2.25; 60 → −2.25
```

For reference, `phaseEdge` counters are ±2.0 and style multipliers are ~1–3% of ~85 strength — a ±2.25 delta is roughly one phase-edge, i.e. a good coach is worth about one correct phase call per game. AI teams get NO coach bonus in v1 (their coaches are trade assets + display only) — this keeps the sim symmetric and avoids rebalancing every matchup.

Implementation path (locked): **fold the bonus at the `PLAY_ROUND` call site, not in `sim.js`** — but `simulateSeries` computes strength internally, so the bonus must enter through the engine boundary. Two options, in preference order:
1. **Preferred (one optional param):** `simulateSeries(..., extra = { aBonus: 0, bBonus: 0 })` added to strengths before the draw. Default zero → all existing callers (season, campaign, `logic.js` Monte-Carlo) are unaffected. This is the ONLY permitted engine change, and it is backward-compatible.
2. **Zero-engine-change fallback:** temporarily inflate the managed starters' `form` by `bonus / 0.12` before the sim call and restore after (form coefficient is 0.12/point in `computeStrength`). Exact same magnitude, no signature change, but mutates player objects transiently — uglier; use only if (1) is rejected.

---

## 4) Player hiring / trading

### 4.1 HIRE (free agency) — reuse, don't reinvent

`SIGN {playerId}` already moves one FA onto the managed team as role starter. Career keeps `SIGN` **verbatim** (same shape, same semantics) — it works in `career` mode exactly as in `season` mode. No new action needed for FA hiring.

### 4.2 TRADE (player swap with AI teams) — new

```
{ type: 'TRADE_PLAYER', giveId: string, getId: string }
  // giveId: player id currently on the managed team (any role, starter or sub)
  // getId:  player id currently on an AI team
```

- **Role-matched only:** `give.role === get.role`, else no-op. (Prevents illegal lineups; no cross-role logic needed.)
- **AI acceptance (deterministic):** accept iff `get.ovr - give.ovr <= 3` — the AI will not lose more than 3 OVR points on a swap. Equal-or-better offers always accepted. No RNG, no negotiation rounds in v1.
- **Atomic swap:** `give` moves to the AI team (keeping its `id`, `team` field rewritten), `get` moves to the managed team. `state.form` entries are keyed by player id and travel with the player (no reset). If `give` was a starter in `state.lineup`, the incoming `get` takes that lineup slot; otherwise lineup untouched.
- Managed-team-only (AI teams never trade among themselves), usable mid-season, usable any round — same simplicity rule as coaches.
- Squad-size invariant: every team always holds exactly 10 players (5 roles × starter+sub); swaps preserve counts by construction, so `bestLineup`/`userLineup` never see a short roster.

### 4.3 UI surfaces (locked)

Career mode nav (extends the `App.jsx` mode-gated pattern): `Dashboard | Lineup | Tactics | Standings | Results | Squad`.

- **`Squad` screen (new, career-only)** with three sections:
  1. **My Staff** — current head coach card (name, rating, style, bonus) + `HIRE_COACH` picker from `coachPool` + `TRADE_COACH` board (each AI team, its coach, accept/decline preview).
  2. **Transfer Market** — reuses the existing `Market.jsx` FA list verbatim (dispatches `SIGN`). No fork of Market.
  3. **Trade Board** — per-AI-team roster with per-player swap affordance: select one of my players + one of theirs → preview OVR delta + accept/decline → dispatch `TRADE_PLAYER`.
- Season mode keeps the existing `Market` tab untouched. Campaign keeps no market (unchanged).

---

## 5) Season loop

New career-only actions:

```
{ type: 'ADVANCE_SEASON' }   // valid only when state.finished === true, seasonIndex < 10
{ type: 'RETIRE' }           // valid when mode === 'career'; sets status 'retired' at any time
```

`ADVANCE_SEASON` semantics (all-or-nothing):
1. Append `SeasonRecord` for the just-finished season: champion = standings leader (points, then `gameWins`−`gameLosses` tiebreak — same ordering `Standings.jsx` uses), `userPlacement`/`userW`/`userL` from managed team's row, `coachId` = current staff.
2. `seasonIndex += 1`. Persisted `teams` / `faPool` / `form` / `career.staff` / `career.coachPool` **carry over untouched** (trades and hires compound across seasons — that is the mode's point).
3. Fresh competitive state for the new season, same dataset: `schedule = roundRobin(same team-id pool)`, `standings` reset via `emptyStanding`, `results = []`, `round = 1`, `finished = false`, `trainedRound = 0`. `lineup` re-derived via `defaultLineup` for the (possibly traded) roster so new players slot in.
4. No-op unless `mode === 'career'`, `status === 'active'`, `finished === true`, `seasonIndex < 10`.

Standings are **not** carried (each season is a fresh table); career continuity is titles/history/squad, not points.

**Retirement:** after season 10 finishes, the UI presents a retire prompt (career summary: titles, best placement, season table) and the only onward action is `RETIRE` (plus New Game). `RETIRE` sets `status: 'retired'`, freezing all actions (`PLAY_ROUND`, `SIGN`, `TRADE_*`, `HIRE_COACH`, `ADVANCE_SEASON` no-op once retired). Voluntary early retirement is allowed any time (same action; history keeps completed seasons only). A retired career is a read-only epitaph screen + New Game button.

---

## 6) Engine impact — explicitly minimal

- **`src/engine/sim.js`: league-agnostic — CONFIRMED.** `computeStrength`/`simulateSeries` consume `{role: player}` lineups + tactics; team ids, datasets, and years never enter. Career requires **zero** changes under the fallback (§3.4 option 2), or **one backward-compatible optional param** (`extra` bonus, default 0) under the preferred option. No tactic, variance, or ratings logic changes.
- **`src/engine/season.js`: no changes.** `roundRobin(teamIds)` is already generic; career calls it with the carried team-id pool at `ADVANCE_SEASON`. `buildLCKSchedule()`/`makeStandings()` static bindings are bypassed the same way `freshState` already bypasses them (per-save `schedule`/`standings`).
- **Consumer changes (bounded):** `NewGame.jsx` (+Career picker, `START_CAREER` dispatch), `App.jsx` (+career nav incl. `Squad` tab, retire/advance banners), one new `Squad.jsx` (+ reuse `Market.jsx` verbatim), `useGameState.js` (additive: `career` field, `START_CAREER`/`ADVANCE_SEASON`/`RETIRE`/`HIRE_COACH`/`TRADE_COACH`/`TRADE_PLAYER` cases, `load()` backfill, `SIGN`/`PLAY_ROUND` mode-guard extended to career). Season and Campaign paths untouched.

---

## 7) Scope guard (v1)

- v1 Career is **`present`-dataset only**, multi-season on current teams, with coach + player hire/trade. The `seasonYear` picker is hidden in Career setup; `career.seasonYear` is locked to `'present'`.
- **Deferred (not v1):** historical-year traversal (2013→…→present or year-per-season), finances/salaries, AI-vs-AI trades, transfer windows, coach style sim effects, draft/rookies, injuries, form carryover decay, multi-team management.
- **Minimize consumer changes:** `Market.jsx`, `Standings.jsx`, `Results.jsx`, `Lineup.jsx`, `Tactics.jsx`, `Dashboard.jsx` are reused as-is in career mode (they read `state.*` + `state.teamMeta`, both populated identically to Season). Only genuinely new surfaces (`Squad`, advance/retire banners) are new components.

---

## 8) Acceptance criteria

1. Career appears as a third mode in NewGame (`Season | Campaign | Career`); picking Career + team + name starts a career at season 1 with a playable season (Dashboard/Lineup/Tactics/Standings/Results all render).
2. Start career → play a full season to `finished === true` → `ADVANCE_SEASON` yields season 2 with the **same team**, carried squad (incl. any signed/traded players), reset table (`round === 1`, empty standings), and one `history` entry with correct champion/placement/record.
3. `HIRE_COACH`: signing a pool coach installs them as managed-team staff, displaces the old coach to the pool (no coach deleted), and the managed team receives the §3.4 bonus from the next `PLAY_ROUND`.
4. `TRADE_PLAYER`: swapping a managed-team player for an AI-team player of the same role within the OVR gate updates both rosters atomically, preserves 10-man squads, and fixes the lineup slot if a starter was moved; out-of-gate or cross-role trades no-op.
5. `TRADE_COACH`: swap with an AI team obeys the §3.3 acceptance gate; unfair swaps decline with no state change.
6. Reach end of season 10 → retire prompt appears; `RETIRE` freezes the career (`status === 'retired'`, all gameplay actions no-op); voluntary early `RETIRE` works the same.
7. Old saves: a Season save and a Campaign save from before this change load unchanged (mode, progress, `seasonYear` backfill intact; `career === null`).
8. Engine: no change to `sim.js`/`season.js` behavior for Season/Campaign (all existing series/standings outputs identical); at most the one optional bonus param with default zero.
