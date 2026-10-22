# LCK Manager — Multi-League + International Tournaments Design

**Status: STABLE** — implementation-ready. Do not change the locked schema (§2, §4) without a versioned revision of this doc.

**Scope:** adds 3 regional leagues (LPL/LEC/LCS present datasets) + two international tournaments (MSI, Worlds) as bonus phases. A Season/Career can start in any league. The engine is untouched. No code is written by this doc.

**Source facts (current code):**
- `src/data/seasons.js`: `SEASONS` registry (`present`, `2022`, `2015-spring`, `2013-summer`), `SEASON_ORDER`, `getSeason(year)` with present fallback. Entries ALREADY carry a `league` field (`'LCK'`, `'OGN Champions'`). Each year's `teams`/`freeAgents` keeps the exact `TEAMS`/`FREE_AGENTS` shape; `expandTeams`/`expandFAs` build them from RAW defs.
- `src/game/useGameState.js`: `freshState(seasonYear='present')` builds `teams`/`faPool`/`form`/`teamMeta` from `getSeason()`, `schedule` via generic `roundRobin(ids)`, `standings` via `emptyStanding(id)` per team. `NEW_GAME {teamId, managerName, seasonYear}`; `START_CAREER {teamId, managerName}` (present-locked); `PLAY_ROUND` sims via `simulateSeries`; `ADVANCE_SEASON` appends `seasonRecordFor(state)` to `career.history` and resets schedule/standings/results; `SAVE_KEY='lck-manager-save-v1'`; `load()` backfills missing fields.
- `src/engine/season.js`: `roundRobin(teamIds)` is fully generic (even/odd + BYE). `buildLCKSchedule()`/`makeStandings()` hard-bind `TEAMS` but `freshState` does not use them.
- `src/engine/sim.js`: `simulateSeries(lineupA, tacticA, lineupB, tacticB, rng, labelA, labelB, extra={aBonus,bBonus})` consumes only lineup objects + tactics. Never touches team ids or datasets. League-agnostic already.
- `docs/multileague-research.md` (Hazen rosterseed) **does not exist in this repo** — the LPL/LEC/LCS present datasets are an open input (§7). Dataset PRs proceed under the same fictional-ratings contract as historical years (names + tiers only).
- Career `SeasonRecord` (career-mode-design §2 LOCKED): `{seasonIndex, championId, userPlacement, userW, userL, coachId}`.

---

## 1) Data architecture (minimal-change)

### 1.1 `seasons.js` extended, no new module required

New leagues are **new registry entries**, not a new system:

```js
export const LEAGUES = ['LCK', 'LPL', 'LEC', 'LCS']   // display order; LCK first/default
```

- `present` stays `{league:'LCK', teams:TEAMS, ...}` — byte-identical.
- Add three entries: `present-lpl` (`{league:'LPL'}`), `present-lec`, `present-lcs`, each with `teams`/`freeAgents` in the exact existing shape, built by the existing `expandTeams`/`expandFAs` from Hazen RAW defs (same `{id,name,short,color,tier,roster}` / `{name,role,tier}` constraints as historical years).
- `SEASON_ORDER` appends the three ids after `present` (historical LCK years keep their positions). `getSeason()` unchanged (fallback `'present'`).
- Optional helper (additive, not required): `seasonsForLeague(league)` = ids in `SEASON_ORDER` filtered by entry `league`. Consumers may inline the filter instead.

### 1.2 Locked dataset rules

- Team ids are **globally unique across all leagues** (real org names do not collide: T1/GEN vs JDG/BLG vs G2/FNC vs C9/TL; validated once at build time — duplicate id = dataset PR rejected).
- Team counts SHOULD be 10 per league in v1 (exercises only the proven even-count `roundRobin` path; odd counts work via BYE but are out of scope).
- `src/data/lck.js` untouched. Historical LCK years untouched.

---

## 2) LOCKED LEAGUE STATE CONTRACT (verbatim — honor EXACTLY)

`seasonYear` remains the single canonical selector. It now addresses a (league, dataset) pair:

```
{ type: 'NEW_GAME', teamId: string, managerName?: string, seasonYear?: string }
// seasonYear omitted or unknown → 'present' (unchanged rule).
// teamId validated against THAT seasonYear's dataset; fallback = first team of that year (unchanged rule).

{ type: 'START_CAREER', teamId: string, managerName?: string, seasonYear?: string }
// seasonYear ADDED, optional, default 'present' (back-compat: old callers start LCK).
// Unknown seasonYear → 'present'. Unknown teamId → first team of resolved year.
```

Persisted additions (additive; old saves lack all of them):

```
state.league: string              // resolved entry's league ('LCK'|'LPL'|'LEC'|'LCS'); default 'LCK'
state.tournament: Tournament | null   // null unless an international phase is active/done (§4)
state.phase: 'regional' | 'msi' | 'worlds' | 'done'   // default 'regional'
```

Rules:
- `freshState(seasonYear)` sets `league` from `getSeason(seasonYear).league` and `phase: 'regional'`, `tournament: null`. Schedule/standings construction is **unchanged** (already generic on the year's team ids).
- `load()` backfill: if `parsed.league` missing → resolve from `parsed.seasonYear` via `getSeason().league`, fallback `'LCK'`; if `parsed.tournament` missing → `null`; if `parsed.phase` missing → `parsed.finished ? 'done' : 'regional'`.
- `SAVE_KEY` unchanged. Old LCK-only saves load byte-identically (acceptance §8).
- `state.career.seasonYear` (career-mode-design §2: v1-locked `'present'`) is hereby **widened to any present-league id** (`'present'|'present-lpl'|'present-lec'|'present-lcs'`); the fixed-`teamId` contract and 10-season loop are unchanged. Career stays in its starting league for all 10 seasons.

---

## 3) Regional season (no design change, stated for the record)

Each league runs its own single round-robin via the existing `roundRobin(ids)` + existing `PLAY_ROUND` (user team via `userLineup`+`state.tactic`+coach bonus; AI via `bestLineup`+`aiTactic`). Standings use the existing shape keyed by that league's team ids. The player manages ONE team in ONE league. Nothing else changes.

NewGame season/career setup adds a **league picker** (4 chips: LCK/LPL/LEC/LCS, default LCK) above the existing year+team pickers; the team grid renders the selected league's present dataset; changing league resets `teamId` to that league's first team (same stale-selection rule as the year picker). Historical LCK years remain selectable only under LCK (league picker filters the year list; default year per league = its present entry).

---

## 4) LOCKED TOURNAMENT STATE CONTRACT (verbatim — honor EXACTLY)

### 4.1 Qualification (locked)

```
QUALIFIERS_PER_LEAGUE = 2   // top 2 per league by final regional standings
TOURNAMENT_SIZE = 8         // 2 × 4 leagues, single elimination
```

- Qualifiers = top 2 of each league's final `orderStandings` (existing ordering: points, game diff, wins). Ties resolve by the existing comparator; no new tiebreak.
- Seeding: #1 seeds (4) vs #2 seeds (4) in round 1; same-league #1/#2 placed in opposite halves (only seeding rule in v1).
- MSI and Worlds use the **same** qualifier set (the just-finished regional season's top 2 per league). MSI runs first, Worlds second (§5).

### 4.2 Bracket shape (locked)

```
Tournament = {
  kind: 'msi' | 'worlds',
  rounds: TournamentRound[],   // [QF(4), SF(2), F(1)] — single elim, 8 teams
  status: 'active' | 'done',
  championId: string | null,
  qualifies: string[],         // the 8 teamIds, in seed order (audit trail)
}
TournamentRound = {
  name: 'Quarterfinal' | 'Semifinal' | 'Final',
  matches: TournamentMatch[],
}
TournamentMatch = {
  homeId: string, awayId: string,
  winner: string | null,       // teamId
  aWins: number, bWins: number,
  isUser: boolean,              // managed team involved
  log: string[],               // simulateSeries log (user matches only need apply)
  detail: { seed, homeLineup, awayLineup, homeTactic, awayTactic, bonusA, bonusB } | null
                               // SAME compact seed shape as season results (MatchDetail recompute compatible)
}
```

- Each match = **one `simulateSeries` call** (existing Bo3-native semantics). Managed-team match: `userLineup` + `state.tactic` + coach bonus as side A/B by draw; AI-vs-AI: `bestLineup` + `aiTactic` both sides.
- Cross-league AI rosters: at `BUILD_TOURNAMENT` time, snapshot lineups from the other leagues' present datasets via `getSeason()` (`bestLineup(players, form=50)` — AI has no form history; managed team keeps its live roster/form). Snapshots live only inside `detail`; no new persisted roster map.
- `teamMeta` extends additively at tournament build: `{...state.teamMeta, ...metaOf(qualifier teams)}` so bracket display resolves names/colors for foreign teams (same `nameOf(state, id)` lookup pattern as historical-year-design §3.3).

### 4.3 Actions (locked)

```
{ type: 'BUILD_TOURNAMENT', kind: 'msi' | 'worlds' }
// Preconditions: mode season|career; phase 'regional'→'msi' or 'msi-done'→'worlds';
//   regional season finished (or MSI done for worlds). No-op otherwise.
// Effect: sets state.tournament (QF populated, winners null), state.phase = kind.

{ type: 'PLAY_TOURNAMENT_ROUND' }
// Preconditions: tournament status 'active'; current round all winners null.
// Effect: sims each match of the earliest unplayed round (one simulateSeries per
//   match), advances winners into the next round's matches; if Final played →
//   status 'done', championId set. Retired career → no-op (same guard as PLAY_ROUND).
```

- One button press per round (QF → SF → F); managed-team match detail reuses `MatchDetail.jsx` via the shared `detail` seed shape.
- Non-qualified managed team: `BUILD_TOURNAMENT` still builds (AI fills all 8 — bracket simmable for spectatorship), but v1 UI offers only "Simulate" for AI-only rounds and records no user result. Managed-team `isUser` matches gate coach bonus + tactic use.

---

## 5) Career integration

Season loop per career year becomes: **regional → (MSI?) → (Worlds?) → ADVANCE_SEASON**:

- After the regional season finishes, if the managed team is in its league's top 2, the Dashboard offers the MSI phase (`BUILD_TOURNAMENT 'msi'` + `PLAY_TOURNAMENT_ROUND` ×3). Otherwise MSI is skippable (auto-sim or skip — implementer picks; skipping must still allow Worlds check).
- After MSI resolves (`status 'done'`), if the managed team qualified (same top-2 set), the Worlds phase unlocks identically.
- `ADVANCE_SEASON` precondition widens: requires regional finished AND (no tournament active). On advance it appends the season record, clears `tournament: null`, resets `phase: 'regional'` alongside the existing schedule/standings/results reset.
- `SeasonRecord` gains **additive optional** fields (absent on old records → treated as false):

```
SeasonRecord += {
  league?: string,            // e.g. 'LPL'; absent = 'LCK' (backfill rule)
  regionalTitle?: boolean,    // managed team finished #1 in its league
  msiTitle?: boolean,         // won MSI that year (false if DNQ)
  worldsTitle?: boolean,      // won Worlds that year (false if DNQ)
}
```

- Career history UI shows per-season `league + placement + titles`. The 10-season loop, `maxSeasons`, `RETIRE`, staff/coach systems are unchanged.
- Season (non-career) mode: same regional → MSI → Worlds flow, but no history accrual; `QUIT`/new game anytime.

---

## 6) ENGINE IMPACT (locked — read before implementing)

- **`src/engine/sim.js`: NO CHANGE.** `simulateSeries` already takes only lineups + tactics. Tournament matches call it exactly as `PLAY_ROUND` and `PLAY_CAMPAIGN_NODE` do. This design requires zero modifications to `sim.js`.
- **`src/engine/season.js`: NO CHANGE.** `roundRobin(teamIds)` is generic and already drives every league's schedule from `freshState`. `buildLCKSchedule()`/`makeStandings()` remain legacy back-compat exports; new code paths must not use them.
- The ONLY changes are: **data** (3 new `SEASONS` entries from Hazen RAW defs) + **state orchestration** (`league`/`phase`/`tournament` fields, 2 new actions, widened `ADVANCE_SEASON`/`START_CAREER`, `SeasonRecord` additive fields) + **UI** (league picker, phase/tournament surfaces §7). Any diff touching `sim.js` or `roundRobin` is out of scope and must be rejected in review.

---

## 7) Scope guard (v1 ships / deferred)

**V1 ships:**
- 3 present datasets (LPL/LEC/LCS) from Hazen research (OPEN INPUT — `docs/multileague-research.md` absent; dataset PRs follow the historical-year fictional-ratings contract: names + tiers only).
- League picker in NewGame (season + career); Career startable in any of the 4 leagues.
- Working MSI + Worlds 8-team single-elim brackets for the managed team (qualification by standings, AI fills rest, `simulateSeries` per match).
- Minimal new UI: league chips + one `Tournament/Bracket` component (read-only bracket + per-round Play/Simulate button) + Dashboard phase banner (regional → MSI → Worlds → done) + career history title flags.

**Deferred (explicitly out of v1):**
- Historical-year traversal of non-LCK leagues; multi-year league datasets.
- Play-ins, group/Swiss stages, double elim, third-place matches.
- Cross-league trades/FA pools (each league keeps its own `faPool`); international-form carryover (AI uses form-50 snapshots).
- Prize money/economy (none, per career-mode-design §finances).
- MSI/Worlds for Campaign mode (present-dataset scripted path, untouched).

---

## 8) Acceptance criteria (concrete checks)

1. Start a Career in LPL → roster/standings show the LPL 10-team set; full regional season plays via `PLAY_ROUND` with no engine errors.
2. Start a Season in each of LEC, LCS → correct league teams; LCK saves unaffected.
3. Finish a regional season → top 2 per league resolve by the existing standings comparator; `BUILD_TOURNAMENT 'msi'` produces a QF with 8 teams, #1-vs-#2 split, same-league seeds in opposite halves.
4. Managed team qualified → its QF/SF/F matches use its live lineup + tactic (+ coach bonus in career) and record the shared `detail` seed shape; `MatchDetail` recomputes them deterministically.
5. Managed team NOT qualified → bracket still sims AI-vs-AI to a champion; career can advance.
6. MSI done → Worlds builds from the same qualifier set and plays to a champion; `ADVANCE_SEASON` records `{league, regionalTitle, msiTitle, worldsTitle}` and resets `tournament/phase` with the next regional season.
7. Old LCK-only saves (no `league`/`tournament`/`phase`) load and play byte-identically (backfill §2).
8. `git diff` touches no lines in `src/engine/sim.js` and no lines in `src/engine/season.js` (CI-checkable: `git diff --name-only` excludes both files).
