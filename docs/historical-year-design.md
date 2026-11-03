# LCK Manager — Historical-Year Selector Design

**Status: STABLE** — implementation-ready. Do not change the locked schema (§2) without a versioned revision of this doc.

**Scope:** season-mode year picker only. Adds selectable historical season datasets (teams + rosters) to `NEW_GAME`. No changes to `src/engine/sim.js`. No changes to campaign mode. No code is written by this doc.

**Source facts (current code):**
- `src/data/lck.js`: `TEAMS_RAW` (10 teams, `{id,name,short,color,tier,roster:{ROLE:[starter,sub]}}`) expanded via `makePlayer(teamId,name,role,tier,isStarter)` into `TEAMS` (`{id,name,short,color,tier,players[]}`); `FREE_AGENT_DEFS` → `FREE_AGENTS`; `ROLES`, `allPlayers()`. Ratings are deterministic fictional values centered on tier (hash jitter ±4, sub −6).
- `src/game/useGameState.js`: `freshState()` deep-copies `TEAMS`/`FREE_AGENTS` into `state.teams`/`state.faPool`; `NEW_GAME {teamId, managerName}`; `SAVE_KEY='lck-manager-save-v1'`; module-level `SCHEDULE=buildLCKSchedule()`, `TOTAL_ROUNDS`; `PLAY_ROUND` reads module `SCHEDULE`; `load()` backfills `mode`/`campaign` for old saves.
- `src/engine/season.js`: `roundRobin(teamIds)` is generic (handles even/odd with BYE); but `buildLCKSchedule()` and `makeStandings()` hard-import `TEAMS` (not parameterized).
- `src/engine/sim.js`: `computeStrength`/`simulateSeries` take lineups as `{role: player}` objects + tactics — never touch team ids or datasets. League-agnostic already.
- `src/components/NewGame.jsx`: season| campaign toggle; season path picks `teamId` from static `TEAMS`, dispatches `NEW_GAME`.
- Static-`TEAMS` display consumers (must be handled, §4): `Results.jsx` (`NAME`), `Standings.jsx` (`NAME`), `MatchDetail.jsx` (`NAME`), `Dashboard.jsx` (`TEAM_NAME` + its own module-level `SCHEDULE`), `game/logic.js` (`TEAM_BY_ID`, `TEAM_ORDER`), `game/ai.js` (`TIER_BY_ID`).

---

## 1) Data architecture

### 1.1 New module, `lck.js` untouched

- Create `src/data/seasons/` — one file per year plus an index:
  - `src/data/seasons/present.js` — re-exports the current dataset (or moves `TEAMS_RAW`/`FREE_AGENT_DEFS` verbatim; `lck.js` re-exports from it so existing imports keep working).
  - `src/data/seasons/2013.js`, `2020.js`, `2023.js`, … — one file per shipped year (§6), same raw shape.
  - `src/data/seasons/index.js` — the registry:
    - `SEASONS`: ordered array of `{ year: 'present' | '2023' | …, label, sublabel }` for the picker. `present` is first and default.
    - `getSeason(year)`: returns the expanded `{ teams, freeAgents }` for that year, shaped **identically** to today's `TEAMS`/`FREE_AGENTS` (same player object fields, same `ROLES`).
- Each year file contains ONLY raw defs (`TEAMS_RAW`-shaped array + `FREE_AGENT_DEFS`-shaped array + per-year `tier` values). Expansion reuses the existing `makePlayer`/hash logic imported from a shared builder (extracted from `lck.js` without changing its output — byte-identical ratings for `present`).
- `src/data/lck.js` stays as the back-compat entry: re-exports `TEAMS`, `FREE_AGENTS`, `ROLES`, `allPlayers()` bound to `present`. No existing import breaks.

### 1.2 Locked per-year dataset schema

Each year file exports raw defs conforming to:
- Team: `{ id, name, short, color, tier, roster: { TOP:[s,sub], JNG:[s,sub], MID:[s,sub], BOT:[s,sub], SUP:[s,sub] } }` — same constraints as today (5 roles, [starter, sub] name pairs).
- Free agents: `[{ name, role, tier }]` (same as `FREE_AGENT_DEFS`).
- Ratings stay fictional/balanced per existing design: `tier` encodes relative strength for that year, `makePlayer` generates numbers deterministically. Dataset PRs contain names + tiers only.

### 1.3 Future years = data-only

Adding a year = add one file under `src/data/seasons/` + one registry entry. No code change, no consumer change. Different team counts are supported (see §3.2), but v1 years SHOULD all be 10 teams to avoid exercising the odd-count path.

---

## 2) LOCKED STATE CONTRACT (verbatim — honor EXACTLY)

`NEW_GAME` action shape:
```
{ type: 'NEW_GAME', teamId: string, managerName?: string, seasonYear?: string }
```
- `seasonYear` omitted or unknown → `'present'`.

Persisted state additions (additive; old saves lack them):
```
state.seasonYear: string   // default 'present'
state.teamMeta: { [teamId]: { id, name, short, color, tier } }
state.schedule: [ [[homeId, awayId], ...], ... ]   // rounds; same shape as roundRobin() output
state.totalRounds: number                          // state.schedule.length
```
- `state.standings` keeps its existing shape (`{ [teamId]: {teamId,W,L,gameWins,gameLosses,points} }`), keyed by that year's team ids.
- `state.teams` / `state.faPool` / `state.form` / `state.lineup` keep existing shapes; they are simply populated from the selected year's dataset.
- `load()` backfill (same pattern as the existing `mode`/`campaign` backfill): if `parsed.seasonYear` missing → `'present'`; if `parsed.teamMeta`/`parsed.schedule`/`parsed.totalRounds` missing → derive from the present dataset (identical to today's module-level values).

---

## 3) State integration (minimal-change)

### 3.1 `useGameState.js`
- `freshState(seasonYear = 'present')`: takes an optional year, resolves via `getSeason(year)` (fallback `'present'`), builds `teams`/`faPool`/`form` from it, and sets `seasonYear`, `teamMeta` (id→{id,name,short,color,tier} from that year's `teams`), `schedule` (via parameterized schedule builder, §5), `totalRounds`.
- `NEW_GAME`: reads `action.seasonYear`, calls `freshState(year)`, then sets `teamId`/`managerName`/`lineup` exactly as today. Validate `teamId` exists in the year's dataset (fallback: first team of that year — cannot crash on stale selection).
- `PLAY_ROUND`: reads `state.schedule` / `state.totalRounds` instead of the module-level `SCHEDULE`/`TOTAL_ROUNDS` (fallback to module constants when absent = old save). Everything else unchanged.
- `useGameState()` return: keep returning `TOTAL_ROUNDS` as today for back-compat, but consumers SHOULD prefer `state.totalRounds ?? TOTAL_ROUNDS` (Dashboard already receives `totalRounds` as a prop — pass `state.totalRounds` from `App.jsx`).
- Campaign actions (`START_CAMPAIGN`, etc.) are untouched; campaigns always use the present dataset.
- `SAVE_KEY` unchanged — old saves load, backfilled to present (§2).

### 3.2 Schedule with variable team counts
- `roundRobin(teamIds)` already handles odd counts via BYE filtering. Storing `schedule` per-save (§2) makes year-to-year team-count differences safe: each save carries the schedule built from its own year. v1 SHOULD still ship 10-team years only.

### 3.3 Display consumers stop importing static `TEAMS` for names
Minimal-change rule: each of `Results.jsx`, `Standings.jsx`, `MatchDetail.jsx`, `Dashboard.jsx` replaces its module-level `NAME`/`TEAM_NAME` map with a lookup that prefers `state.teamMeta` and falls back to static `TEAMS`:
- `nameOf(state, teamId)` = `state.teamMeta?.[teamId]?.name ?? STATIC_NAME[teamId] ?? teamId`.
- Same for color (`Dashboard.jsx` team-tag): `state.teamMeta?.[teamId]?.color ?? TEAM_BY_ID[teamId]?.color`.
- `Dashboard.jsx` additionally reads `state.schedule[state.round-1]` instead of its module-level `SCHEDULE` (fallback to module schedule when absent).
- `game/logic.js` `TEAM_BY_ID`/`TEAM_ORDER` and `game/ai.js` `TIER_BY_ID`: keep exports (other code imports them), but the year-aware paths (`Dashboard` color, `aiTactic` tier) take an optional meta/tiers override derived from `state.teamMeta`; when absent they behave exactly as today. `aiTactic(teamId, oppId, round)` signature unchanged — resolve tier as `state-informed tier ?? TIER_BY_ID[teamId] ?? 80` at the call site wrapper, not by changing `ai.js` internals. (If implementer prefers, threading a 4th `tiers` param through `aiTactic` with a default is acceptable; it must remain optional and default to current behavior.)

---

## 4) Year selection UI (`NewGame.jsx`)

- Season path only (campaign path untouched). Above the team grid, add a YEAR picker:
  - Control: chips/radio row (preferred for ≤5 years; dropdown acceptable if it exceeds 5). Reuse the existing `team-pick` button styling.
  - Options from `SEASONS` registry (`label` + `sublabel`, e.g. "2023 · T1 dynasty" / "Present · current LCK").
  - Default selected: `'present'`.
- Team grid renders that year's teams (name + tier + color dot, same card layout as today). Changing year resets `teamId` to the first team of the newly selected year (prevents stale `teamId` from another year's id set).
- Start button dispatches `{ type: 'NEW_GAME', teamId, managerName, seasonYear }`. Button label unchanged ("Start Season →").
- Footnote + campaign disclaimer pattern already establish ratings-are-fictional; add one line under the year picker: "Rosters evoke that year's LCK; ratings are game-balanced fictional values." (mirrors the existing campaign hint.)

---

## 5) Engine verdict: NO engine changes

- `sim.js`: **no change required.** `computeStrength(lineup, tactic)` and `simulateSeries(lineupA, tacticA, lineupB, tacticB, rng, labelA, labelB)` consume only lineup objects and tactics — they never read `TEAMS`, team ids, or years. State explicitly: this design requires zero modifications to `sim.js`.
- `season.js`: **parameterize, don't redesign.** Add two thin wrappers; keep existing exports as present-bound back-compat:
  - `buildScheduleFor(teamIds)` (the existing `roundRobin` already does this — expose it under a clear name or call `roundRobin` directly; either is fine).
  - `makeStandingsFor(teamIds)` — same body as `makeStandings`, over the passed ids.
  - `buildLCKSchedule()` and `makeStandings()` remain, delegating to the above with present-dataset ids. Module-level `SCHEDULE`/`TOTAL_ROUNDS` in `useGameState.js` and `Dashboard.jsx` remain as the old-save fallback only.
- `logic.js` / `ai.js`: no signature changes required (§3.3).

---

## 6) Scope guard (v1)

- v1 ships **3–5 years**: `present` (current `lck.js` data, unchanged) + a SMALL set from research (recommended: 2023, 2020, 2013 — adjust to whatever the research doc confirms; cap at 4 historical).
- Each historical year: names + relative `tier`s only; ratings stay fictional/balanced via the existing generator. No real stats, no per-player hand-tuning in v1 (tiers may be hand-set per team; per-player overrides are out of scope).
- Out of scope for v1: mid-save year switching (year is fixed at `NEW_GAME`; switching years = new game), year-specific schedules beyond single round-robin, year-specific free-agent economies, campaign-mode years, save migration beyond backfill-to-present.

---

## 7) Acceptance criteria

1. Year picker appears on `NewGame` (season path) with `present` + each v1 historical year; default is `present`.
2. Selecting year X lists X's teams (names/tiers/colors) and no other year's teams; team selection resets on year change.
3. Starting a season with year X populates `state.teams`/`faPool` from X's dataset, sets `state.seasonYear === X`, `state.teamMeta` matches X's teams, and `state.schedule.length` equals the round-robin rounds for X's team count.
4. Sim: playing a full season on X's data completes (rounds 1..N, standings keyed by X's ids, finished flag) with no engine errors; match detail recomputes deterministically.
5. Old saves (no `seasonYear`/`teamMeta`/`schedule`) load as `present` and play identically to before (standings/schedule fallback path).
6. `sim.js` is byte-identical to before (no engine changes); `season.js` changes are limited to the additive parameterized builders in §5 with existing exports preserved.
7. Adding a new year requires only a new file under `src/data/seasons/` + one registry entry (reviewer verifies by inspection: no consumer imports the new year by name).
8. No campaign-mode regression: starting/playing a campaign still uses the present dataset.
