# P1 Design (LOCKED) — items 7–11

CODE-FREE design doc. Copy-pasteable contracts for the implementer.
Style follows `p0-engine-design.md` / `p0-ux-design.md`.

Global invariant: **no change to P0/default behavior when the feature is off.**
Every item is additive: new fields default to off/empty, new `extra` flags
default to falsy, and seeded sim output is byte-identical unless the feature
is explicitly enabled. Season sim (`PLAY_ROUND`, `simMode='biased'`) never
opts into a P1 feature on its own — each section states exactly what threads
the flag through.

---

## §7. Hidden player traits with delayed triggers

### Data module — new `src/data/traits.js` (exact exports)

```js
// One trait = { id, name, desc, trigger, magnitude }
// trigger: 'series' (evaluated per simulateSeries) | 'season' (evaluated per developPlayer)
// magnitude: strength-point or OVR-point effect; SMALL by design (see below).
export const TRAIT_POOL = [
  { id: 'one_season_wonder', name: 'One-Season Wonder', desc: 'A career year out of nowhere — then gravity.', trigger: 'season', magnitude: 7 },
  { id: 'injury_prone',      name: 'Injury Prone',      desc: 'Misses time; plays below himself.',                  trigger: 'series',  magnitude: 1.0 },
  { id: 'big_game_player',   name: 'Big-Game Player',   desc: 'Grows in finals and deciders.',                      trigger: 'series',  magnitude: 1.0 },
  { id: 'clutch',            name: 'Clutch',            desc: 'Steadiest when the series is on the line.',           trigger: 'series',  magnitude: 1.0 },
  { id: 'inconsistent',      name: 'Inconsistent',      desc: 'Unpredictable series-to-series.',                     trigger: 'series',  magnitude: 1.5 },
];
export const TRAIT_BY_ID = Object.fromEntries(TRAIT_POOL.map((t) => [t.id, t]));

// Roll traits for one fresh player. Pure + rng. Default rates keep the
// league sane: ~8% get exactly one trait, ~1% get two, rest get none.
// makePlayer / career-start call this; unbiased/default players pass traits: [].
export function rollTraits(rng = Math.random) { /* → string[] of trait ids */ }
```

### Locked player field shape (additive)

```js
player.traits = [] // default. When present: [{ id, revealed: false, fired: false, spike: 0 }]
// id: TRAIT_POOL id. revealed: set true the first time the trait fires (log line).
// fired/spike: one_season_wonder bookkeeping only (see developPlayer rule).
```

- `makePlayer(teamId, name, role, tier, isStarter, age, potential)` gains ONE
  trailing optional param `traits = null`; `null` → `rollTraits()` at the
  low default rate above; pass `[]` for a guaranteed-clean player. Existing
  callers pass nothing → ratings byte-identical, `traits` just rides along.
- Backfill at load: any player missing `traits` gets `traits: []`.
- Career start (`START_CAREER`): after `freshCareer`, stamp **2 managed-roster
  players** (random starters) with one random series-trigger trait each
  (`revealed: false`). Guarantees the user meets the system; the rest of the
  league stays at background rate.

### Engine change — `simulateSeries` (`src/engine/sim.js:603`), same site as `strategyDelta`

New optional `extra` fields (all default off):

```js
extra = {
  // ...existing (aBonus, bBonus, aStrat, bStrat, simMode, forcedWinner),
  bigMatch: false,  // true = final / semifinal — arms big_game_player
  traitSeed: null,  // reserved; when null, trait rng draws use the series rng
}
```

Fold-in point — immediately after `strategyDelta` (`sim.js:615-618`):

```js
const tA = traitDelta(lineupA, { deciding: false, bigMatch: extra.bigMatch ?? false }, rng, logA)
const tB = traitDelta(lineupB, { deciding: false, bigMatch: extra.bigMatch ?? false }, rng, logB)
const sA = computeStrength(...) + (aBonus || 0) + dA.delta + tA.delta
const sB = computeStrength(...) + (bBonus || 0) + dB.delta + tB.delta
```

New pure helper in `src/data/traits.js`, called by `sim.js`:

```js
// traitDelta(lineup, ctx, rng, logArr) → { delta }
// ctx = { deciding: bool (this game is a series decider), bigMatch: bool }
```

Per-trait rules (locked magnitudes — small on purpose, ≈ ±1 str ≈ ±3pp):

- `injury_prone`: **−1.0** strength per carrier (max −2.0 per side). The
  "extra game loss prob" is delivered through strength, not a new draw —
  no rng consumed, no draw-order change.
- `big_game_player`: **+1.0** per carrier (max +2.0) iff `ctx.bigMatch`.
- `clutch`: **+1.0** per carrier (max +2.0) iff `ctx.deciding`.
- `inconsistent`: **±1.5 uniform draw per carrier** (max 2 carriers) via the
  injected series `rng` — fixed draw order (after `sA`/`sB`, before game 1),
  so seeded replay stays deterministic. Only consumes rng when a carrier exists.
- `deciding` is derived inside the per-game loop (`sim.js:634`): game `g`
  is a decider when it is the last possible game and the series is tied
  (BO3: `g === 3 && aWins === 1 && bWins === 1`). Recompute `tA/tB`
  additively at game 3 for clutch — implement as a per-game
  `clutchBonus(side)` added to the effective strength passed to `drawGame`
  (base `sA`/`sB` untouched, returned values unchanged).
- `random`/`manual` modes: trait deltas are still computed and logged but do
  not decide winners (same rule as `sA`/`sB` there).
- Reveal rule: the first time a trait fires, push
  `` `${name} reveals ${trait.name}!` `` to `log` and set
  `revealed: true` on that carrier **in the returned games' player snapshots
  only** — engine never mutates rosters. The reducer persists `revealed`
  (see below). Until revealed, traits are invisible everywhere (estimator
  ignores them; UI shows nothing).

### Reducer changes (`src/game/useGameState.js`)

- `PLAY_ROUND` (`:444`): after each series resolves, scan the two lineups'
  snapshots for newly-revealed traits and persist `revealed: true` onto the
  matching roster players. Display-only otherwise.
- `playTournamentMatch` (`:322`): pass `bigMatch: roundNo >= 1`
  (SF/F rounds; QF `false`) — arms `big_game_player` in semis and finals.
  `PLAY_ROUND` passes `bigMatch: false`.
- `developPlayer` (`src/data/development.js`, additive branch): `one_season_wonder`
  only. If carrier has `!fired` and `rng() < 0.15`: `ovr += +6..+9`
  (clamped to ceiling), set `fired: true, spike: <applied>`, `revealed: true`.
  If `fired && spike > 0`: `ovr -= spike` (regression), `spike: 0`.
  All other traits ignore the season tick. Uses the off-season `Math.random`
  path, never the seeded match path.

### Consumer components

- `MatchDetail.jsx`: render trait reveal lines from `result.log` (filter
  lines containing `reveals `) as ⚡ badges above the per-game rows. No new
  data plumbing — log lines already persist on results/tournament matches.
- `Strategy.jsx` / match preview: show **revealed** traits only as hint
  chips on the user's lineup (`Clutch — boosted in deciders`). Hidden traits
  render nothing. (Estimator link: `estimateSeriesWinProb` ignores hidden
  traits entirely; revealed `injury_prone`/`big_game_player` flow through
  `sA`/`sB` naturally because they use real lineups.)

### Test assertions

1. `simulateSeries` with trait-free lineups is byte-identical to P0 for the
   same seed (with and without `bigMatch`).
2. `injury_prone` carrier side wins strictly fewer of 2000 seeded series vs
   the same matchup without the trait; log contains no reveal before firing,
   exactly one reveal line on first fire.
3. `clutch` carrier has equal game-1/2 win rate but higher game-3 win rate
   (1–1 → game 3) vs control, same seed set.
4. `one_season_wonder`: `developPlayer` spike season `ovr` up +6..+9, next
   tick regresses by exactly `spike`; `potential` untouched.
5. Save/load round-trip preserves `traits: [{id, revealed, fired, spike}]`;
   missing `traits` backfills to `[]`.

**Off = invisible:** `traits: []` (or all hidden) → zero engine delta, zero
rng consumed, zero UI.

---

## §8. Academy → main-roster promotion offers

### Data module — new `src/data/academy.js` (exact exports)

```js
// Academy prospects are young (17-19), ~10-14 ovr below their org's tier.
// Pool is GENERATED, not hand-authored: 1-2 prospects per org.
export const ACADEMY_PER_ORG = 2;
export const ACADEMY_NAMES = ['Rookie', 'Challenger', ...]; // short pool, cycled by hash
export function academyFor(teamId, tier, rng = Math.random) { /* → Player[1..2], shape = makePlayer + { academy: true } */ }
export function buildAcademyPlayer(teamId, tier, role, rng = Math.random) { /* → single prospect, age 17-19, ovr = clamp(tier - 12 + jitter) */ }
```

Prospect shape = normal player + `academy: true` flag; `traits: []`,
`potential: clamp(ovr + 8)` (headroom — they are prospects).

### Reducer change (`src/game/useGameState.js`, `ADVANCE_SEASON` `:539`)

After the `developPlayer` mapping (`:554-556`), **career only**, managed team
only, ~30% roll, and only when no `pendingEvent` was just rolled (one modal
at a time — event takes precedence):

```js
// pendingPromotion: null | { player: Player, teamId }
```

- Generate one prospect via `buildAcademyPlayer(state.teamId, tierOf(state.teamId))`,
  store as `state.pendingPromotion = { player, teamId: state.teamId }`.
- New action `RESOLVE_PROMOTION`: `{ type: 'RESOLVE_PROMOTION', promote: bool }`.
  Guards: career active, `pendingPromotion != null`.
  - `promote: true` → append prospect (minus `academy` flag, `team` set) to
    managed roster; cut the **weakest bench player** (lowest ovr among
    non-lineup players; tie → earliest roster index) to keep roster size
    constant; cut player moves to `faPool`. `form[player.id] = 50`.
  - `promote: false` → prospect discarded (stays "in academy", no state
    change beyond clearing). Small consolation: `lastEventLog =
    '<name> stays with <Academy> for another split.'`
  - Either way: `pendingPromotion: null`.
- `ADVANCE_SEASON` gate (with the `pendingEvent` guard at `:545`):
  `if (state.pendingPromotion) return state` — promotion resolves first,
  same blocking pattern as dilemmas. `RETIRE` unaffected.
- Load backfill: `if (!('pendingPromotion' in parsed)) parsed.pendingPromotion = null`.

Deliberate reuse decision: promotion is its **own** `pendingPromotion` field
+ `RESOLVE_PROMOTION` action (not folded into `DILEMMA_EVENTS`/`RESOLVE_EVENT`),
because `RESOLVE_EVENT.apply(draft, playerId)` only mutates ratings/form and
cannot carry a full prospect object. The **modal UI** reuses the
`events.js` modal style (title / description / two buttons with `oddsText`-like
sublabels) — same component language, separate state wire.

### Consumer component — `Squad.jsx` (owns the `EventModal` at `:28`)

New `PromotionModal` next to `EventModal`, same card/modal classes:

```jsx
// state.pendingPromotion = { player, teamId }
// Title: 'Academy standout — <name> (<role>, <ovr> OVR, age <age>)'
// Body: prospect stat line + 'Promote to main roster? < weakest-bench name, ovr > leaves for FA.'
// Buttons: [Promote — <name> in, <cut> out] [Keep academy intact]
// dispatch({ type: 'RESOLVE_PROMOTION', promote: true/false })
```

Render condition in `Squad.jsx`: `{state.pendingPromotion && <PromotionModal/>}`.
Weakest-bench name is computed in the component (read-only) for display;
the reducer is the source of truth for the cut.

### Test assertions

1. `ADVANCE_SEASON` with `pendingPromotion` set returns state unchanged
   (blocked); `RESOLVE_PROMOTION {promote:false}` clears it with no roster change.
2. `promote: true` grows managed roster by exactly 0 net (add 1, cut 1);
   cut player is the lowest-ovr non-lineup player; cut player lands in `faPool`.
3. Prospect shape: `age` 17–19, `ovr` in `[tier-16, tier-8]`, has `potential`
   and `traits: []`.
4. Non-career modes never set `pendingPromotion`; old saves backfill `null`.
5. Dilemma roll and promotion roll never co-occur (event wins).

**Off = absent:** `pendingPromotion: null` → no modal, no roster effect,
`ADVANCE_SEASON` flow identical to P0.

---

## §9. Win-probability explanation panel

No engine change. Pure helper + collapsible UI. Reads existing estimates.

### Helper — `src/game/logic.js` (exact signature)

```js
// explainWinProb(state, oppId, opts?: { n?: number }) → { prob, factors: [{ label, contribution }] }
//   prob: 0..1 Monte-Carlo series win prob (delegates to estimateSeriesWinProb, n default 500).
//   factors: ordered divergent list, contribution in percentage POINTS (sum ≈ prob*100 - 50).
//   Labels are fixed strings (UI renders verbatim):
//     'Rating edge' | 'Form edge' | 'Tactics & gameplan' | 'Head-to-head' | 'Trait watch' | 'Coaching'
export function explainWinProb(state, oppId, opts = {}) { ... }
```

Factor computation (locked, all analytic — no extra sims beyond the one
`prob` estimate):

- `Rating edge`: `(myAvgOvr − oppAvgOvr) × 1.1pp`, starters only, via
  `userLineup`/`bestLineup` with live `form`. Cap ±25pp.
- `Form edge`: `(myAvgForm − oppAvgForm) × 0.35pp`. Cap ±10pp.
- `Tactics & gameplan`: `strategyDelta(state.strategy, state.tactic).delta × 2.2pp`
  + phase-edge term (`phaseEdge(tactic.phase, aiTactic(opp).phase) × 1.1pp`).
  Cap ±8pp. Null strategy → 0 (shows `—` row, not hidden).
- `Head-to-head`: from `state.results` this season (regional only):
  `clamp((myWins − oppWins) × 2pp, ±6pp)`; no meetings → `0` with label
  `Head-to-head (no meetings yet)`.
- `Trait watch`: **revealed traits only**, `+2pp` per net revealed edge
  (`big_game_player`/`clutch` for mine, minus theirs; `injury_prone`
  inverts). Hidden traits contribute 0 and are never named. Cap ±6pp.
- `Coaching`: `managedCoachBonus(state) × 2.2pp` (0 outside career). Cap ±6pp.

`contribution` values are display attributions, not a re-derivation of
`prob` — the helper does not claim they sum exactly; UI shows them as-is
with one decimal.

### Consumer components (placement locked)

- `Strategy.jsx` gameplan preview (`:51-64`): under the existing
  base/with-strategy readout, add a collapsible Why panel:
  ```jsx
  <details className="why">
    <summary>Why {Math.round(prob * 100)}%? — top factors</summary>
    <ul>{factors.map((f) => <li key={f.label}>{f.label}: {f.contribution > 0 ? '+' : ''}{f.contribution.toFixed(1)}pp</li>)}</ul>
  </details>
  ```
  Computed via `useMemo` alongside `preview` (same deps). `n: 200` for the
  panel's `prob` so it stays cheap; the existing 500-roll readouts are untouched.
- `MatchDetail.jsx` header: same `<details className="why">` block above the
  per-game rows, fed by `explainWinProb`-equivalent inputs reconstructed from
  `result.detail` (lineups/tactics/bonus) with H2H/trait rows omitted when
  unavailable (show `—`). Reuses the identical factor labels.

### Test assertions

1. Return shape: `{ prob: number 0..1, factors: [{label, contribution}] }`;
   labels exactly the six fixed strings in order; contributions are numbers.
2. Null strategy + neutral form + equal ratings → all factors ≈ 0, `prob` ≈ 0.5.
3. Stacking an AGGR comp moves `Tactics & gameplan` positive and `prob`
   upward vs base; magnitudes within caps.
4. Hidden-trait lineups produce `Trait watch: 0` and name no trait;
   revealed `clutch` on mine shows `+2.0pp`.
5. No engine import change: `simulateSeries`/`drawGame` untouched; helper
   calls only `estimateSeriesWinProb` + pure strength helpers.

**Off = silent:** panels are `<details>` (collapsed by default); when factors
are all ~0 the summary reads `Why ~50%? — even matchup`. No reducer, no sim change.

---

## §10. Fearless-draft toggle for series

**Superseded (2026-11):** the strength-penalty model below is not current behavior. Active Coach draft uses real champion lockout across series games when Draft + `seriesOptions.fearless` are on; `simulateSeries` no longer applies a Fearless strength modifier. See the role/flex/Fearless spec (design handoff) for the locked rules.

*Historical text (penalty model — retained for archive):*

Models the 2025+ pro Fearless rule at our abstraction level (tactic lockout,
not champion lockout): the side that **won** game N cannot run the same
tactic in game N+1 — represented as a small strength penalty, since tactics
are fixed per series.

### State + action (`src/game/useGameState.js`)

```js
// freshState: seriesOptions: { fearless: false }
// Load backfill: if (!parsed.seriesOptions) parsed.seriesOptions = { fearless: false };
case 'SET_SERIES_OPTION': {
  // action: { key: 'fearless', value: bool }. Allowed anytime except retired.
  // Unknown keys / non-bool values → no-op.
}
```

### Engine change — `simulateSeries` (`src/engine/sim.js:633-654` per-game loop)

New optional `extra` field: `fearless: false` (default off).

```js
export const FEARLESS_PENALTY = 1.0; // strength points, ≈ −3pp per game. Small by design.
```

Application point (inside the loop, after the winner is decided, before `g++`):

```js
// track prevWinner ('A' | 'B' | null, starts null).
// At the TOP of each game iteration (g >= 2 && prevWinner):
//   if (extra.fearless && simMode === 'biased')
//     effective strength of prevWinner's side -= FEARLESS_PENALTY for this game's drawGame only.
// At the BOTTOM: prevWinner = winner. Log once per application:
//   `Fearless: <label> off comfort (−1.0).`
```

Locked semantics:

- Penalty applies to the **game-N winner's next game only** (not cumulative;
  game-3 penalty, if any, reflects the game-2 winner).
- `biased` mode only. `random`/`manual` ignore `fearless` (still logged as
  `Fearless on — no effect under <mode>.` once, so replay shows the flag).
- Base `sA`/`sB` returned unchanged (display values); the penalty is a
  per-game effective adjustment, same pattern as the clutch decider bonus (§7).
- Thread-through (exact call sites): `PLAY_ROUND` (`:463+` loop) and
  `playTournamentMatch` (`:322`) pass `fearless: state.seriesOptions?.fearless ?? false`
  into `extra`; `recomputeGames` (`MatchDetail.jsx:32`) forwards
  `d.fearless ?? false`; season/tournament `detail` seeds gain `fearless`.
- `estimateSeriesWinProb` already spreads `extra` through — Strategy preview
  passes `{ aStrat: strat, fearless: state.seriesOptions?.fearless }` so the
  toggle moves the readout.

### Consumer component — `Strategy.jsx` (series setup home)

Toggle row under the gameplan card (same `tac` button language):

```jsx
// <h3>Fearless Draft</h3>
// <button className={fearless ? 'tac active' : 'tac'}
//   onClick={() => dispatch({ type: 'SET_SERIES_OPTION', key: 'fearless', value: !fearless })}>
//   <span className="tac-name">{fearless ? 'Fearless ON' : 'Fearless OFF'}</span>
//   <span className="tac-blurb">Series winner plays off comfort next game (−1.0 str). Applies to all series.</span>
// </button>
```

Tournament series-setup (when built) reuses the same global toggle — no
per-tournament copy. (`tournament.resolver` stays the per-bracket control.)

### Test assertions

1. `fearless: false/omitted` → byte-identical output to P0 for the same seed.
2. `fearless: true`: game-2 winner's side wins game 3 strictly less often
   than control over 2000 seeded series; game-1 rates identical to control.
3. `random`/`manual` + `fearless: true` → winners identical to
   `fearless: false` under the same seed.
4. `SET_SERIES_OPTION` with bad key/value is a no-op; old saves backfill
   `{ fearless: false }`.
5. `recomputeGames` with the stored `fearless` flag reproduces the live
   `games[]` exactly.

**Off = zero:** default `false` → no penalty, no extra log lines, no rng delta.

---

## §11. Season playoffs for round-robin splits

One bracket shape, locked: **top-4 single-elim, BO3 semifinals + BO3 final**
(1v4, 2v3, winners meet). No double-elim, no byes, no reseeding.

### Builder — `src/engine/season.js` (exact export)

```js
// buildPlayoffs(orderedTeamIds, topN = 4) → { semis: [[homeId, awayId], [homeId, awayId]], finalists: null }
//   orderedTeamIds: team ids BEST-first (caller passes orderStandings(standings).map(r => r.teamId)).
//   Pairing (locked): semis = [[1st, 4th], [2nd, 3rd]]. topN !== 4 → throws (only top-4 is supported in P1).
//   Returns pairings only — the reducer wraps them in a tournament object (below).
export function buildPlayoffs(orderedTeamIds, topN = 4) { ... }
```

### Season state machine (`src/game/useGameState.js`)

Phase domain widens (freshState `:66` comment + all phase guards):

```js
phase: 'regional' // 'regional' | 'playoffs' | 'msi' | 'worlds' | 'done'
```

Flow (locked):

1. `PLAY_ROUND` (`:444`) final-round change: when the last regional round
   completes, **instead of leaving `phase: 'regional'` finished**, build the
   playoff bracket immediately:
   ```js
   const { semis } = buildPlayoffs(orderStandings(standings).map((r) => r.teamId), 4);
   tournament = { kind: 'playoffs', rounds: [
     { name: 'Semifinal', matches: semis.map(([h, a]) => tournamentMatch(h, a, state.teamId)) },
     { name: 'Final', matches: [tournamentMatch(null, null, state.teamId)] },
   ], status: 'active', championId: null, qualifies: top4, revealedRounds: 1, resolver: 'biased' };
   // state: { ..., finished: true, phase: 'playoffs', tournament, playoffChampionId: null }
   ```
   `finished: true` still means "regional schedule done" (Dashboard's
   season-complete UI keys off it, unchanged).
2. `PLAY_TOURNAMENT_ROUND` (`:655`) generalizes one step: the fill-forward
   (`:676-685`, today hardcoded for 3 rounds) becomes length-aware —
   `if (rounds.length === 2 && ri === 0)` feeds both semifinal winners into
   the final; the existing 3-round path is untouched. When the playoff final
   resolves: `tournament.status = 'done'`, `championId` set, plus
   `playoffChampionId: championId` stamped on state (new top-level field,
   default `null`, load-backfilled). `phase` stays `'playoffs'`.
3. `BUILD_TOURNAMENT` msi gate (`:606-608`) widens (additive OR):
   allow when `(phase === 'regional' && finished && !tournament)` (legacy —
   reachable only if playoffs somehow skipped) **or**
   `(phase === 'playoffs' && tournament?.kind === 'playoffs' && tournament.status === 'done')`.
   Building MSI **replaces** the done playoff tournament object (same as
   today: `tournament` field overwritten) and sets `phase: 'msi'`.
   Worlds gate (`:609-612`) unchanged.
4. `ADVANCE_SEASON` (`:539`) blockers unchanged in shape: active playoff
   tournament blocks (`tournament.status === 'active'` → return), finished
   playoffs pass. `ADVANCE_SEASON` clears `playoffChampionId: null` with the
   season reset (same line as `tournament: null`, `:594`).
5. `seasonRecordFor` (`:187`): `championId` prefers the playoff winner —
   `championId: state.playoffChampionId ?? rows[0]?.teamId`. `userPlacement`
   still comes from regional standings (playoffs don't rewrite history).
   `regionalTitle` unchanged (placement === 1).

`kind: 'playoffs'` reuses everything the international brackets use for free:
`resolver` (`SET_RESOLVER` works — all three modes), `revealedRounds`
(cap = `rounds.length` = 2, same increment line), `SET_TOURNAMENT_WINNER`
manual picks, `recomputeGames` detail seeds, and `Tournament.jsx` rendering
with the round names above (title override: `LCK Playoffs` when
`kind === 'playoffs'`).

### Consumer component — `Tournament.jsx` (no new component)

- When `t.kind === 'playoffs'`, header reads `LCK Playoffs — Top 4`;
  semifinal pairings show seed tags (`1st`, `4th`, … from `qualifies` order).
- Stage-gating, keyboard stepping, and manual-winner buttons behave exactly
  as for MSI/Worlds (P0 UX §1) — zero new interaction code, just the new `kind`.
- Dashboard season-complete block: while `phase === 'playoffs'` and the
  playoff tournament is active, the primary button routes to the bracket
  (existing `<Tournament>` embed), not to `BUILD_TOURNAMENT`.

### Test assertions

1. `buildPlayoffs(['A','B','C','D'])` → semis `[[A,D],[B,C]]`;
   `topN !== 4` throws; fewer than 4 ids throws.
2. Final `PLAY_ROUND` sets `phase: 'playoffs'`, `finished: true`, and a
   2-round `playoffs` tournament with the 1v4/2v3 pairing from live standings.
3. Full playoff run via `PLAY_TOURNAMENT_ROUND` (biased): final winner lands
   in both `tournament.championId` and `state.playoffChampionId`;
   `seasonRecordFor` uses it as `championId`.
4. MSI `BUILD_TOURNAMENT` is rejected while playoffs are active and accepted
   once the playoff final resolves (replacing the object, `phase: 'msi'`).
5. `random`/`manual` resolver + stage-gating behave identically to
   international brackets (shared code path — one parametrized test).
6. Old saves (no `playoffChampionId`) backfill `null` and record the
   regional winner as before.

**Off = N/A, but safe:** playoffs are structural (always built at season
end). The P0-default guarantee is preserved differently here: with
`resolver: 'biased'` and no P1 traits/fearless enabled, regional results and
playoff winners match what the same seeds would produce through the shared
`tournamentMatch`/`simulateSeries` path — no separate sim code exists to diverge.
