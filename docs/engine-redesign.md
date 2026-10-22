# LCK Manager — Enhanced Match-Simulation Engine Redesign

**Status: STABLE** — implementation-ready. Do not change the locked schema without a versioned revision of this doc.

**Scope:** redesign of `src/engine/sim.js` game-level simulation only. `computeStrength` / `winProb` semantics and series behavior are preserved. No changes to any file under `src/` are made by this doc.

**Source facts (current engine):**
- `computeStrength(lineup, tactic)`: weighted player ratings + macro/form/consist terms, style multiplier.
- `winProb(myStr, oppStr)`: logistic with `SCALE = 9`.
- `simulateSeries(lineupA, tacticA, lineupB, tacticB, rng, labelA, labelB)`: Best-of-3, each game drawn independently via phase edge + variance-scaled noise; games are `{winner, note, game}`, no per-game detail.
- Player shape: `{id, name, role, team, ovr, mech, macro, consist, form}`; roles `TOP,JNG,MID,BOT,SUP`.
- Callers: `src/engine/season.js` (schedule/standings), `src/game/useGameState.js` `PLAY_ROUND` (calls `simulateSeries` with `Math.random`, stores `results[]`, updates standings/form), `src/game/logic.js` (`estimateSeriesWinProb` Monte-Carlo over `simulateSeries`).

---

## 1) LOCKED DATA CONTRACT (verbatim — honor EXACTLY)

The new simulateSeries(...same args...) returns:
```
{
  winner: 'A'|'B',
  aWins: number, bWins: number,
  games: [ GameResult, ... ],   // length 2 or 3
  log: [string, ...],
  sA: number, sB: number
}
```
where GameResult = {
```
  game: 1|2|3,
  winner: 'A'|'B',
  durationMin: number,           // 26..40
  goldTimeline: [ { t: number, diff: number }, ... ],  // t in minutes (sample every 2 min from 2..durationMin plus final), diff = gold(A) - gold(B), range ~ -18000..18000
  events: [ { t: number, type: 'kill'|'tower'|'dragon'|'baron'|'teamfight'|'ace', side: 'A'|'B', note: string }, ... ],  // chronological
  players: [ PlayerPerf, ... ]    // exactly 10 entries, 5 per side
}
```
PlayerPerf = {
```
  id: string, name: string, role: 'TOP'|'JNG'|'MID'|'BOT'|'SUP', side: 'A'|'B',
  kills: number, deaths: number, assists: number, cs: number,
  dmgShare: number,   // 0..1, the FIVE players on a side must sum to ~1
  kp: number,         // 0..1 kill participation = (kills+assists)/(team total kills), cap 1
  rating: number,     // 0..10 performance rating
  mvp: boolean        // exactly one true on the winning side (highest rating)
}
```

Field names, types, and value domains above are frozen. Additive precursor work (if needed) must go through optional fields, never renames.

---

## 2) New `sim.js` function signatures

```js
export const TACTICS = { style: ['AGGR','BAL','DEF'], phase: ['EARLY','MID','LATE'] }
export const STYLE_META = { AGGR: {...}, BAL: {...}, DEF: {...} }  // unchanged
export const PHASE_META = { EARLY: {...}, MID: {...}, LATE: {...} } // unchanged

export function phaseEdge(mine, theirs)                      // unchanged
export function computeStrength(lineup, tactic)              // UNCHANGED — keep intact
export function winProb(myStr, oppStr)                       // UNCHANGED — keep intact

// --- preserved internals ---
function drawGame(myStr, oppStr, myTactic, oppTactic, rng)   // unchanged: phase edge + variance noise -> boolean (A won?)
function pick(arr, rng)                                      // unchanged helper

// --- NEW ---
export function simulateSeries(lineupA, tacticA, lineupB, tacticB, rng = Math.random, labelA = 'Team A', labelB = 'Team B')
  // same signature, enriched return per locked contract.

function simulateGame(lineupA, lineupB, winner /* 'A'|'B' from drawGame */, gameIndex, rng)
  // -> GameResult (durationMin, goldTimeline, events, players)

function genGoldWalkAndEvents(winner, durationMin, strengthDiff, tacticA, tacticB, rng)
  // -> { goldTimeline, events }

function genPlayerStats(lineupA, lineupB, winner, durationMin, teamKillsA, teamKillsB, rng)
  // -> players: [PlayerPerf x10]

function normalizeDmgShare(perfs)   // per-side normalization to sum 1.0
function assignRatingsAndMvp(perfs, winner)  // ratings 0..10, exactly one mvp on winning side
```

Backward-compat notes:
- `sA`/`sB` still computed once per series via `computeStrength` and returned.
- `log` entries keep the existing human-readable lines (`strength ... vs ...`, `Game N: <label> takes it via ...`, `Series: ...`) and MAY append one extra line per game (`Game N: <dur> min, <killsA>-<killsB> kills`) — string consumers must not parse positions beyond index 0.
- The old per-game `note` field is superseded by `events[].note`; implementers MAY also include a legacy `note` string per game for old UI, but QA must not require it. The locked schema is authoritative.
- No signature change for callers in `useGameState.js` / `logic.js` (`estimateSeriesWinProb` keeps working; cost rises ~10-50x per sim — see risks).

---

## 3) Algorithm description

### 3.1 Game-winner selection (preserve series behavior)

1. Compute `sA = computeStrength(lineupA, tacticA)`, `sB = computeStrength(lineupB, tacticB)` once per series.
2. For game `g = 1..3` (first to 2): call existing `drawGame(sA, sB, tacticA, tacticB, rng)`.
   - `drawGame` = `base = (sA - sB) + phaseEdge(...)`, plus uniform noise scaled by mean style variance (`*4`), converted through `winProb`, then one `rng()` draw. Keep this EXACTLY as-is (including consuming 2 rng draws per game: one for noise, one for the outcome) so seeded series win-rates are minimally disturbed.
3. The game winner is therefore decided BEFORE any timeline/stats are generated; all downstream generation is CONDITIONED on the winner. This guarantees the terminal-gold-sign invariant by construction and keeps `estimateSeriesWinProb` / existing balance tests valid.

Rng discipline: thread the single injected `rng()` through everything in fixed order per game: (a) drawGame's 2 draws, (b) duration draw, (c) walk/event draws, (d) player-stat draws. Never call `Math.random` directly; never reorder draws after STABLE. Default `rng = Math.random`.

### 3.2 Duration

- `durationMin = round(clamp(28 + gaussish(rng)*4 + stompBonus, 26, 40))` where `gaussish ≈ (rng()+rng()+rng()-1.5)*2` (approx normal, sd ~1), and `stompBonus = clamp(-strengthDiffForWinner*0.35, -4, +2)` (bigger mismatch → slightly shorter when the stronger side wins; upsets drag longer). Round to integer minutes.
- Phase flavor: `EARLY`-style winner skews −1 min, `LATE`-style winner skews +1 min (clamped). Keep the effect small so the 26..40 bound always holds.

### 3.3 Gold walk + event generation

Goal: a biased random walk sampled every 2 min from t=2 to `durationMin` (plus exact final point at `durationMin`), ending in the winner's favor, with event-driven spikes.

Parameters:
- `strDiff = (sA - sB)` signed from A's perspective; `wSign = winner==='A' ? +1 : -1`.
- Target final lead magnitude: `final = 2500 + |strDiff|*900 + rng()*3500`, clamped to `[1500, 16000]`. Close games (small |strDiff|, upset outcomes) land near 1.5–5k; stomps 8–16k. Final diff = `wSign * final`.
- Start `diff(0) = 0`. Step every 2 min. Base drift per step toward winner: `drift = final / nSteps * (0.55 + rng jitter)`, plus noise `N(0, 700 + 60*t)` (early steps smaller, late steps larger: scale noise by `1 + t/durationMin`).
- Rubber-band: if `|diff|` exceeds `9000 + rng()*4000` against the eventual winner before minute 20, apply a corrective pull of 30–50% of the excess on the next step (comeback shape). At most ONE comeback inflection per game (decide with `rng() < 0.30`): if chosen, force the loser to lead by 1–3k at a random minute in [12, 22], then revert.
- Event spikes (applied additively at the event minute, and the event list records them):
  - `kill`: ±(300–500g), minutes 2–38, most common. Loser-side kills also occur (they create local dips against the trend).
  - `tower`: ±~650g + plating bonus (first 3 towers of a side +150g), minutes 6–30.
  - `dragon`: winner/side +200–400g incremental, minutes 5–34, every ~5 min (3–6 drakes/game).
  - `teamfight`: ±1200–2500g, minutes 10–38, 2–5 per game; loser-favored fights happen mainly pre-inflection.
  - `baron`: ±2000–4000g to the taker, minutes 20+, 1–2 per game; ~75% to eventual winner.
  - `ace`: ±1500–3000g, minutes 15+, 0–2 per game; always followed by tower/baron within 2 min (chain it).
- Counts: target totals ~ kills 15–35 combined, towers 5–11, dragons 3–6, barons 1–2. Derive exact counts from `rng()`; do not hardcode a fixed script.
- Clamp every sample to `[-18000, 18000]`. After the walk, FORCE the terminal point: set last sample `diff = wSign * max(|last|, 1200)` with the target `final` magnitude (recompute as `wSign*final` exactly) so the sign invariant holds even under clamping/rounding. Optionally rescale the last 2 points for a smooth finish (lerp), but the final sign is non-negotiable.
- `goldTimeline` entries: `{t: 2,4,6,..., ≤durationMin}` plus a final `{t: durationMin}` (if `durationMin` is odd, the last interval is 1 min). `t` ascending, numbers rounded to integers.
- `events`: chronological by `t` (ties broken: kill < tower < dragon < teamfight < baron < ace). Each has `{t, type, side, note}` with a short human note (e.g. `"22' — A secures Baron, +2800g swing"`). Event times must be `2 ≤ t ≤ durationMin`. Loser-side events are allowed (and expected) mid-game; winner must own a strict majority of `baron` events and of total gold-positive swing.

Tactic hooks (small, deterministic): AGGR → +25% kill/teamfight event rate, +15% walk noise; DEF → −20% kill rate, −15% noise, +1.5 min duration bias; BAL neutral. EARLY → more events pre-14'; LATE → bigger late swings (multiply post-25' spikes ×1.15). Keep magnitudes modest; tactics must not flip the pre-decided winner.

### 3.4 Player-stat generation

Inputs per game: both lineups (`{role: player}` with `ovr/mech/macro/consist/form`), winner, `durationMin`, team kill totals (derived from events: `teamKillsA/B` = count of `kill`+`teamfight`-kill-credit events per side, minimum 4 each; winner's total ≥ loser's in ~85% of games — if not, swap a couple of late kill events to the winner).

Per player base skill: `sk = 0.55*ovr + 0.20*mech + 0.10*macro + 0.05*consist + 0.10*form` (all ~45–99 → sk ~45–99). Role multipliers:

| role | killW | assistW | deathW | dmgW | csPerMin |
|------|-------|---------|--------|------|----------|
| TOP  | 1.0   | 0.9     | 1.05   | 0.95 | 7.0–8.2  |
| JNG  | 0.9   | 1.25    | 0.95   | 0.85 | 5.2–6.2 (jungle camps; lower CS by design) |
| MID  | 1.25  | 1.0     | 1.0    | 1.25 | 7.4–8.8  |
| BOT  | 1.3   | 0.9     | 1.0    | 1.30 | 7.6–9.0  |
| SUP  | 0.35  | 1.5     | 0.9    | 0.55 | 1.2–2.0  |

Generation steps per side:
1. Kill pool: distribute `teamKills` across the 5 players by weights `killW * (0.7 + sk/100) * (0.7+rng()*0.6)`. Round to ints, fix rounding drift on the highest-weight player. Assists: each kill generates 1–2 assists on average; distribute by `assistW` similarly so SUP/JNG lead assists. Clamp: no player exceeds `teamKills` (kp ≤ 1 follows automatically).
2. Deaths: total side deaths = opponent's kills; distribute inversely to skill with role `deathW` (weaker players die more): weight `deathW * (1.6 - sk/100) * (0.7+rng()*0.6)`.
3. CS: `cs = round(csPerMin(role, rng) * durationMin * (0.9 + sk/200))`. SUP uses ward-flavored low CS (35–70). JNG deliberately lower than laners.
4. Damage share: raw `d = dmgW * (0.65 + mech/100) * (0.75 + rng()*0.5) * (1 + kills*0.06)`; then NORMALIZE per side: `dmgShare = d / Σd_side` (round to 3 decimals, fix drift on max-share player so Σ = 1.000 ± 0.002). Carry check: on most games the side's top share belongs to MID or BOT; allow TOP/JNG pop-offs at ≤25% rate.
5. Rating: `base = 5.0 + (K - D*0.9 + A*0.55) * 0.28 + (dmgShare - roleAvgShare) * 9 + (sk - 72) * 0.045 + (winner bonus +0.9 if side won else -0.4)`, where `roleAvgShare ≈ {TOP:.2,JNG:.17,MID:.24,BOT:.25,SUP:.12}`. Add small noise ±0.3. Clamp `[0,10]`, round to 1 decimal. Sanity: winner's average rating exceeds loser's by ~0.8–1.5; no 0-kill ADC rates above a 8-kill MID on the same side in >95% of cases (monotonic-ish).
6. KP: `kp = min(1, (kills+assists)/max(1,teamKills))`, round 2 decimals.
7. MVP: exactly one `mvp=true` among the 10, on the winning side, to its highest rating (tie → more kills → more dmgShare → random by rng). All others false.

Winner/loser shaping: multiply winner-side kill weights ×1.15 and death weights ×0.9 (and inverse for losers) so scorelines reflect the result without overriding role identity.

Determinism: every stochastic choice consumes the injected `rng()` in the fixed order above. Same seed + same inputs → byte-identical `games[]`.

---

## 4) Acceptance criteria / QA unit-test cases

A QA agent should assert ALL of the following (concrete, automatable):

1. **Contract shape.** `simulateSeries(bestT1, BAL/MID, bestBRO, BAL/MID)` returns `{winner, aWins, bWins, games, log, sA, sB}` with `games.length ∈ {2,3}`, `aWins+bWins === games.length`, winner matches the 2-win side, `log.length ≥ 3`, `typeof sA === 'number'`.
2. **Terminal-gold invariant (1000 sims).** For EVERY game in every series: `sign(goldTimeline.at(-1).diff) === (winner==='A' ? +1 : -1)`, and `|final| ≥ 1200`. Zero failures allowed.
3. **Timeline well-formedness.** `durationMin ∈ [26,40]` integer; `goldTimeline` times are `2,4,...,≤durationMin` + final at exactly `durationMin`, strictly ascending; every `|diff| ≤ 18000`; `events` sorted ascending by `t` with all `2 ≤ t ≤ durationMin`.
4. **Roster integrity.** Every game has exactly 10 `players` (5 `side:'A'` + 5 `side:'B'`), roles cover `{TOP,JNG,MID,BOT,SUP}` per side, `id/name` match the input lineups.
5. **Damage-share normalization.** Per game, per side: `Σ dmgShare = 1.000 ± 0.005`; each `dmgShare ∈ [0,1]`; SUP share < BOT share in ≥80% of games.
6. **KP + MVP sanity.** Every `kp ∈ [0,1]` and `kp === min(1,(K+A)/teamKills)` within rounding; exactly ONE `mvp===true` per game and it sits on the winning side (the side's highest rating).
7. **Stat plausibility.** `cs` within `[durationMin*roleMin - 15, durationMin*roleMax + 15]` per role table; total kills per side ≥ 4; winner avg rating > loser avg rating in ≥90% of games.
8. **Determinism under seeded rng.** `mulberry32(1234)` twice → `JSON.stringify` identical series. Also: game count and winners identical; gold diffs identical to the integer.
9. **Series balance preserved (the regression gate).** T1-best-lineup vs BRO-best-lineup, default `BAL/MID` both sides, 2000 sims with fresh `mulberry32(seed+i)` per sim: A (T1) series win-rate **> 0.70**. (Tier gap 90 vs 74 ≈ ≥10 strength delta → logistic p ≈ 0.75+/game; Bo3 amplifies. If this fails, the winner-selection path was broken — not the cosmetics.)
10. **Perf + RNG hygiene.** 600-series Monte-Carlo (`estimateSeriesWinProb` default n) completes in < 3 s on a laptop; implementation calls ONLY the injected `rng()` (grep: no bare `Math.random`/`Date.now` inside `sim.js`); form inputs are read-only (input lineup objects not mutated — deep-freeze in test, sim must not throw/mutate).

---

## 5) Risks / edge cases

- **Monte-Carlo cost.** Enriched games do ~50–150 rng draws + small arrays per game vs ~3 today. `estimateSeriesWinProb(n=600)` → ~1500 games; still trivial (<3 s), but avoid heavy per-event string templating in hot paths; build `note` strings lazily or keep them short.
- **Result storage bloat.** `useGameState.PLAY_ROUND` pushes `res.log` into `results[]` persisted to localStorage. Full `games[]` (timelines + 10 players × up to 3 games × 5 matches/round × 9 rounds) can exceed quota. Mitigation: store only a SUMMARY in `results[]` (winner, kills, mvp ids, final gold) and re-sim or lazily fetch detail for the match-view screen; or cap stored timeline resolution. Do NOT change `PLAY_ROUND`'s standings/form logic in this pass.
- **Rng-draw-order coupling.** Keeping `drawGame`'s 2-draw prologue is load-bearing for seed stability; any new draw inserted BEFORE it shifts all downstream seeds. Rule: winner selection first, always.
- **Guaranteed-winner tension.** Conditioning stats on a pre-decided winner can produce odd box scores in heavy upsets (weak side wins with worse stats). Mitigate via the §3.4 winner bonus + kill-swap rule; accept residual weirdness as "stomp-reversal" flavor rather than re-rolling the winner.
- **Role coverage gaps.** `bestLineup`/`userLineup` may omit a role if a roster lacks it; sim must degrade gracefully (synthesize a replacement at ovr ~70 with the role label, flag in `log`) rather than crash — and QA should cover the 4-man-lineup case.
- **Draw/blowout extremes.** Clamp final gold at 16k and per-sample at ±18k; a 40-min game ending at 1.2k is a valid nail-biter, not a bug. Barons only spawn ≥20'; never emit `baron`/`ace` after `durationMin`.
- **Phase-edge double counting.** `phaseEdge` already lives inside `drawGame`; the §3.3 tactic hooks must be COSMETIC ONLY (rates/magnitudes) — never re-add edge to strength, or EARLY-vs-LATE becomes double-weighted.
- **MVP ties / rating collisions.** After 1-decimal rounding, ties are common; break deterministically (kills → dmgShare → rng) so exactly one MVP always results.
- **Floating-point normalization.** `dmgShare` rounding to 3 decimals leaves ±0.002 drift; always post-correct on the max-share player and assert `|Σ-1| ≤ 0.005` in QA rather than exact equality.
- **No external data.** All realism constants above are hand-tuned priors, not live LoL data. If designers later fit real distributions, version this doc (STABLE-2) and re-gate criterion 9.
