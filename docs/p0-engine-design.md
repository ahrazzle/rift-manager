# P0 Engine Design (LOCKED) — items 2 / 3 / 5

CODE-FREE design doc. Copy-pasteable contracts for the implementer.
Scope: engine + state only. Tournament.jsx resolver UI is the separate Leo-ux doc.

Global invariant: **season sim unchanged by default (`simMode='biased'`)**.
`PLAY_ROUND`, campaign nodes, and `estimateSeriesWinProb` never pass `simMode`.

---

## (a) `simulateSeries` new signature + return shape

Current (locked, `src/engine/sim.js:600`):
```js
simulateSeries(lineupA, tacticA, lineupB, tacticB, rng = Math.random,
  labelA = 'Team A', labelB = 'Team B', extra = {})
// extra today: { aBonus, bBonus, aStrat, bStrat }
// returns { winner, aWins, bWins, games, log, sA, sB }
```

New `extra` fields (additive, all optional, defaults preserve byte-identical output):
```js
extra = {
  aBonus, bBonus, aStrat, bStrat,   // unchanged
  simMode: 'biased',                // 'biased' | 'random' | 'manual'
  forcedWinner: null,               // 'A' | 'B' | null — honored ONLY when simMode === 'manual'
}
```

### Mode semantics (inside the per-game loop, `sim.js:620-631`)

- `'biased'` (default, `extra.simMode ?? 'biased'`): current behavior.
  `drawGame(sA, sB, tacticA, tacticB, rng)` per game. Season path always resolves here.
- `'random'`: ignore ratings entirely. Per-game winner = `rng() < 0.5 ? 'A' : 'B'`.
  Still calls `simulateGame(...)` conditioned on that winner, so duration/walk/
  stats cosmetics keep working. Consumes rng in the same fixed order
  (winner draw → flavor → duration → walk/events → stats) so `mulberry32(seed)`
  recompute stays byte-identical.
- `'manual'`: engine honors `extra.forcedWinner`. Each game winner = `forcedWinner`
  (`'A'`→ home 2-0, `'B'`→ away 0-2), generated through the same `simulateGame`
  path (full game details, rng order unchanged). If `simMode === 'manual'` but
  `forcedWinner` is null/invalid, fall back to `'biased'` and log a warning line.
  The UI that picks which side is forced lives in Tournament.jsx (separate doc) —
  the engine only honors the flag.

`sA`/`sB` are still computed and returned in all modes (display only under
`random`/`manual`; they do not decide winners there).

### Return shape — item (3) LOCKED

No new top-level field. The per-game array **already exists** as `result.games`
and is hereby contracted — do not rename it:

```js
result = {
  winner,        // 'A' | 'B' — unchanged derivation (first to 2)
  aWins, bWins,  // unchanged; sum is 2 or 3
  games,         // GameResult[], length === aWins + bWins (2 or 3), game sequence order
  log, sA, sB,   // unchanged
}
// GameResult[i] = { game: 1-based index, winner: 'A'|'B',
//   durationMin, goldTimeline, events, players, note, killsA, killsB }
```

Confirmed: exposing/reading `games` does **not** change `aWins`/`bWins`/`winner`
— same loop, same counters, `games.length === aWins + bWins` is an invariant,
not a new computation.

Consumers that must read `games` (no engine work, listed so nothing is missed):
- `Tournament.jsx` MatchCard — score line `${aWins}–${bWins}` already renders;
  add per-game row from `recomputeGames(...)` (2-0 vs 2-1 + durations).
- `MatchDetail.jsx` `recomputeGames(result)` — already returns `res.games`;
  must forward `simMode`/`forcedWinner` from `detail` into its re-run call
  (see (b) detail-seed change), else recompute diverges under random/manual.
- `Results.jsx` season rows — may show per-game detail the same way (optional).

---

## (b) `state.tournament.resolver` + `PLAY_TOURNAMENT_ROUND` change

New field on the tournament object (`buildTournamentObject`, `useGameState.js:284`):
```js
tournament = {
  kind, rounds, status, championId, qualifies, msiChampionId?,  // unchanged
  resolver: 'biased',  // 'biased' | 'random' | 'manual'. Default 'biased'.
}
```

- Set at `BUILD_TOURNAMENT` time: `resolver: action.resolver ?? 'biased'`
  (validate — anything outside the triple falls back to `'biased'`).
- New action `SET_RESOLVER`: `{ type: 'SET_RESOLVER', resolver }` — allowed only
  while `tournament.status === 'active'`; no-op otherwise. Lets the user flip
  Bias/Random/Manual between rounds.
- Save backfill (`load()`): `if (!parsed.tournament.resolver) parsed.tournament.resolver = 'biased'`
  (guard null tournament). Old saves sim exactly as today.
- `PLAY_ROUND` (season regional play) never reads `resolver` — out of scope by design.

`PLAY_TOURNAMENT_ROUND` (`useGameState.js:576-615`) change:
```js
const simMode = t.resolver ?? 'biased';
// thread through:
playTournamentMatch(state, m, bonus, roundNo, simMode, m.forcedWinner ?? null)
```

`playTournamentMatch` (`useGameState.js:316`) change:
```js
function playTournamentMatch(state, match, bonus, roundNo, simMode = 'biased', forcedWinner = null) {
  // ... lineups/tactics unchanged ...
  const res = simulateSeries(homeLineupObj, homeTactic, awayLineupObj, awayTactic,
    mulberry32(seed), match.homeId, match.awayId,
    { aBonus: bonusA, bBonus: bonusB, simMode, forcedWinner });
  // ... winner/aWins/bWins/log mapping unchanged ...
  detail: { seed, homeLineup, awayLineup, homeTactic, awayTactic,
            bonusA, bonusB, simMode, forcedWinner },
}
```

The `detail` seed gains `simMode` + `forcedWinner` so `recomputeGames` can
re-run `simulateSeries` with the identical `extra` (deterministic replay holds
for all three modes). `MatchDetail.recomputeGames` must pass them through:
```js
{ aBonus, bBonus, aStrat, bStrat, simMode: d.simMode ?? 'biased', forcedWinner: d.forcedWinner ?? null }
```

Manual-winner plumbing (engine side only): a match carries optional
`match.forcedWinner: 'home' | 'away' | null` (set by the Tournament.jsx UI,
separate doc; default null). `playTournamentMatch` maps it to engine sides:
`home → 'A'`, `away → 'B'`, null → null. Non-manual modes ignore it.

---

## (c) `src/data/development.js` schema + player-growth integration — item (5) LOCKED

Status quo (verified): **no age, no potential, no growth logic exists anywhere.**
`makePlayer` (`lck.js:41-61`) emits `{ id, name, role, team, ovr, mech, macro,
consist, form }` — no `age`/`potential`. `TRAIN` only does `form +4` on lineup
starters (`useGameState.js:404-412`). `ADVANCE_SEASON` resets schedule/standings
and bumps `seasonIndex` (`useGameState.js:526-556`) — touches no ratings.
Item (5) is greenfield: new data module + one integration point.

### New module `src/data/development.js` (exact exports)

```js
// Annual OVR delta range per integer age: [min, max] inclusive.
// RiftScore shape (research doc §1): big growth at 16, ~flat at 24,
// decline from 30, hard decline by 34. Values are TUNABLE DATA, not engine constants.
export const growthByAge = {
  16: [3, 8], 17: [3, 7], 18: [2, 6], 19: [2, 5], 20: [1, 4],
  21: [1, 4], 22: [0, 3], 23: [0, 3], 24: [-1, 2], 25: [-1, 2],
  26: [-2, 1], 27: [-2, 1], 28: [-2, 0], 29: [-3, 0],
  30: [-6, 0], 31: [-6, 0], 32: [-6, -1], 33: [-6, -1],
  34: [-8, -2], // hard decline; 35+ reuses the 34 band
};

// Hard ceiling: no player exceeds max(POTENTIAL_CEILING, potential).
// Mirrors RiftScore's `potential.ceiling` clamp.
export const POTENTIAL_CEILING = 99;

// OVR cap for a player of `age` with base `potential` (0-99).
export function ageCeiling(age, potential) { ... }   // pure, no rng
// One annual delta for `age`, drawn from growthByAge via injected rng.
export function growthRoll(age, rng = Math.random) { ... }  // pure + rng
// Full annual update for one player object → new player object (no mutation).
export function developPlayer(player, rng = Math.random) { ... }
```

Reference semantics (implementer copies these, no invention):
- `ageCeiling(age, potential)`: `return Math.min(POTENTIAL_CEILING, potential)` —
  flat by age; the *growth table* carries the age shape, the ceiling carries the
  headroom. (RiftScore-equivalent: ceiling clamp, not an age curve.)
- `growthRoll(age, rng)`: look up `growthByAge[clamp(age, 16, 34)]` (35+ uses 34
  band; <16 uses 16 band); return integer uniform in `[min, max]` via `rng`.
- `developPlayer(player, rng)`: `{ ...player, age: player.age + 1,
  ovr: clamp(ageCeiling(newAge, player.potential), applied delta),
  mech/macro/consist drift ±1 toward ovr }` — exact drift rule is implementer
  detail; ovr/age/ceiling behavior above is locked.

### Locked player field names

```js
player.age        // integer years, incremented once per ADVANCE_SEASON
player.potential  // integer 0-99, set at creation, NEVER changes after
```

- `makePlayer(teamId, name, role, tier, isStarter)` gains optional trailing
  params `(age = 21, potential = null)`; when `potential` is null it defaults to
  `clamp(ovr + 5 + jitter)` (≈ headroom above current ovr). Existing callers
  pass nothing → current ratings byte-identical, new fields just ride along.
- Backfill for existing saves: any player missing `age`/`potential` gets
  `age ?? 21`, `potential ?? clamp(player.ovr + 5, 45, 99)` at load.

### Integration point (exactly one)

`ADVANCE_SEASON` (`useGameState.js:526-556`) — after `record` is captured,
before returning new state:
```js
import { developPlayer } from '../data/development.js';
// rng: Math.random (off-season roll; not part of the seeded match path)
teams: mapTeams(state.teams, (p) => developPlayer(p, Math.random)),
faPool: state.faPool.map((p) => developPlayer(p, Math.random)),
```
`TRAIN` (form-only) and `PLAY_ROUND` are explicitly NOT growth points —
`TRAIN` keeps `form +4`, no ovr/age touch. Season length = 1 growth tick.

---

## Non-goals (P0 explicitly excludes)

Betting/odds resolver (rejected — fictional-data rule), Fearless draft, hidden
traits, dilemmas, academy promotion, PNG export — all P1/P2, separate docs.
