# LCK Manager — In-Sim Strategic Choices Design

**Status: STABLE** — implementation-ready. Do not change the locked schema (§6) without a versioned revision of this doc.

**Scope:** roadmap item 4 — four player choices that MOVE win probability through the existing sim, not cosmetics. No code is written by this doc.

**Source facts (current code):**
- `src/engine/sim.js`: `computeStrength(lineup, tactic)` = weighted player ratings (`ROLE_WEIGHT TOP:1.0 JNG:1.0 MID:1.1 BOT:1.1 SUP:0.9`) × `STYLE_META` mult (`AGGR 1.03 / BAL 1.015 / DEF 1.0`) + macro/form/consist terms (form coeff 0.12/pt). `winProb` logistic with `SCALE = 9` → **±1.0 strength ≈ ±2.8% per-game winprob at 50/50** (Bo3 amplifies ~1.4× near even). `phaseEdge` = ±2.0 counter / +0.5 commit. `simulateSeries(lineupA, tacticA, lineupB, tacticB, rng, labelA, labelB)` — no `extra` param in code today. Cosmetics path (duration, gold walk, events, player stats) is conditioned on the pre-decided winner; tactic hooks there are magnitude/rate only.
- `src/game/logic.js`: `estimateSeriesWinProb(userLineup, userTactic, oppLineup, oppTactic, n, rng)` calls `simulateSeries` with no extras.
- `src/game/useGameState.js`: `PLAY_ROUND` sims each scheduled match via `simulateSeries` (managed side uses `userLineup` + `state.tactic`, AI sides `bestLineup` + `aiTactic`); stores compact `detail: {seed, homeLineup, awayLineup, homeTactic, awayTactic}` for deterministic MatchDetail recompute. `mode: 'season' | 'campaign'` in code (career design adds `'career'` + `extra = {aBonus, bBonus}` — not yet in `sim.js`).
- `src/components/Tactics.jsx`: style + phase pickers dispatching `SET_TACTIC`. `src/components/Lineup.jsx`: per-role starter picker dispatching `SET_LINEUP`.
- `docs/insim-choices-research.md` (Hazen) is **absent** from this repo — no research input; magnitudes below are derived from the `SCALE = 9` calibration above, not from external data.

**Design rule:** every choice resolves to a small strength delta (±0.75–1.5 ≈ ±2–4% per game) plus reuse of existing cosmetic hooks. No tactic/variance/ratings logic is rewritten.

---

## 1) WHEN choices are made — DECIDED: pre-match panel, per-week

Choices are set on a **pre-match Strategy panel** (part of the Tactics/Lineup flow, §7) and apply to the **NEXT `PLAY_ROUND` only**. They are **re-settable every week** (every round): after `PLAY_ROUND` resolves, the strategy persists as displayed defaults but applies again to the following round until the player changes it — i.e. semantics are "current gameplan," not one-shot consumables.

- New state slice `state.strategy` (§6), new action `SET_STRATEGY` (partial merge, usable any time before the next `PLAY_ROUND`).
- Applies to the **managed team's side only** (home or away) in `PLAY_ROUND`. AI-vs-AI matches in the same round are unaffected (default-zero).
- `estimateSeriesWinProb` preview on the Strategy panel passes the current strategy so the displayed edge moves when the player changes a choice.
- Campaign (Scenario Mode) never reads `state.strategy` — scripted and unaffected.

## 2) DRAFT PICKS — starter selection (existing) + draft bias (new comp term)

Two layers, deliberately split:

1. **Starter selection = existing `Lineup` flow, unchanged.** Picking the starting 5 from the 10-man roster per role already moves strength through `ovr` weights — this IS the draft-picks mechanic for personnel. No new engine input.
2. **Draft bias = new `strategy.comp` field:** `'AGGR' | 'SCALE' | null` (null = balanced, default).
   - Engine effect (flat comp term, §6): `AGGR → +1.0`, `SCALE → +1.0`, `null → 0` strength for the managed side.
   - Same magnitude, **different outcome shape** via existing cosmetic hooks only: `AGGR` reuses the AGGR cosmetics (kill/teamfight rate up, walk noise up, duration −1); `SCALE` reuses the LATE cosmetics (post-25′ swings ×1.15, duration +1). No new cosmetic code — the engine treats comp as an alias into the existing style/phase flavor branches.
   - Trades off against nothing by itself (pure +1.0 when set); the opportunity cost is that it stacks toward the §6 clamp.

## 3) SUPPORT ROAM vs STAY — per-role modifier, exact field + magnitude

`strategy.roam: 'ROAM' | 'STAY' | null` (null = default, no effect).

Engine input: **per-role ovr-equivalent deltas** applied to the managed team's starters before role-weighting (inside the new `strategyDelta` helper, §6 — `computeStrength` itself untouched):

| choice | TOP | JNG | MID | BOT | SUP | net strength* |
|--------|-----|-----|-----|-----|-----|---------------|
| ROAM (support roams) | 0 | **+6** | **+4** | **−6** | 0 | **+0.75** |
| STAY (support stays) | 0 | −2 | −1 | **+6** | **+2** | **+1.0** |

\* Net = Σ(w·δ)/Σw over `ROLE_WEIGHT` (Σw = 5.1). ROAM: (6 + 4.4 − 6.6)/5.1 = +0.75. STAY: (−2 − 1.1 + 6.6 + 1.8)/5.1 = +1.04 ≈ +1.0.

- ROAM gambles the lane (BOT dips) for map pressure (JNG/MID rise); STAY secures the lane at the cost of map presence. Both net slightly positive when set (reward for committing), differing in **which roles pop** in `genPlayerStats` downstream (kill/assist weights follow the DELTA-adjusted skill — implement by adding δ to `sk` for those roles; 2-line change inside the stats path, winner-neutral).
- Null → all deltas 0.

## 4) LANE SWAP yes/no — scaling-vs-early tradeoff term

`strategy.swap: boolean` (default `false`).

Engine effect — conditional on the managed team's tactic phase (reuses the existing scaling/early vocabulary, no new phase logic):

```
swapDelta = !swap ? 0 : (tactic.phase === 'EARLY' ? −1.0 : +1.0)
```

- Swap with a MID/LATE phase: **+1.0** (concede lane for scaling). Swap with an EARLY phase: **−1.0** (contradictory plan — punished). This makes swap a genuine tradeoff, not a free bonus.
- Cosmetics reuse only: swap=true takes the LATE flavor branch (first-tower timing pushed back, post-25′ swings ×1.15) regardless of phase.
- **Coexistence with career `extra`:** career's design proposed `extra = {aBonus, bBonus}`. Item 4 extends that object additively (§6) — career's coach bonus and item-4 knobs are independent fields summed at the same call site. Neither design renames or retypes the other's fields.

## 5) WIN-CONDITION PRIORITY — four options, exact field + magnitude each

`strategy.wincon: 'DRAGONS' | 'SPLIT' | 'SCALE' | 'EARLY' | null` (null = default, no effect).

Each option = a flat strength term **plus** a distinct cosmetic branch (existing hooks only). Magnitudes:

| wincon | strength term | cosmetic branch (existing) | outcome shape |
|--------|---------------|----------------------------|---------------|
| DRAGONS (teamfight/objective) | **+1.25** | AGGR kill/teamfight rate + dragon-event bias | bloodier, objective-heavy games |
| SPLIT (towers/splitpush) | **+1.25** | tower-event bias to managed side, first-tower swing | tower-led, lower-kill wins |
| SCALE (late-game scaling) | **+1.0**, or **+0.25** if `tactic.phase === 'EARLY'` (contradiction haircut) | LATE branch (duration +1, late swings ×1.15) | longer, comeback-shaped wins |
| EARLY (win lanes fast) | **+1.0**, or **+0.25** if `tactic.phase === 'LATE'` (contradiction haircut) | EARLY branch (duration −1, pre-14′ event density) | short stomps or fizzle-out losses |

- The contradiction haircuts (+0.25 instead of +1.0) punish incoherent plans (scale comp with EARLY phase and vice versa) without adding new systems — the engine already knows `tactic.phase`.
- DRAGONS vs SPLIT have equal magnitude but different event distributions, so two wincons produce **different, sensible outcome distributions** at matched winrates (acceptance §8.4).

## 6) ENGINE IMPACT (locked) — minimal, additive, default-zero

**One optional trailing param.** `simulateSeries` gains an additive `extra` object that unions career's fields with item-4's structured knobs:

```js
simulateSeries(lineupA, tacticA, lineupB, tacticB, rng = Math.random,
  labelA = 'Team A', labelB = 'Team B',
  extra = { aBonus: 0, bBonus: 0, aStrat: null, bStrat: null })
```

where `aStrat`/`bStrat` are `null | { comp, roam, swap, wincon }` snapshots (same shape as `state.strategy`, §7 — engine never imports UI state).

New pure helper (only new engine code besides the call-site fold):

```js
// → { delta: number, flavor: { aggr: bool, late: bool, early: bool, dragonBias: bool, towerBias: bool } }
// Pure arithmetic on (strat, tactic). Consumes NO rng.
function strategyDelta(strat, tactic)
```

- `delta = compTerm + roleTerm + swapDelta + winconTerm`, then **clamped to [−2.5, +2.5]** so stacked choices cannot exceed roughly one phase-edge of total edge. Applied: `sA += (extra.aBonus || 0) + deltaA`, `sB += (extra.bBonus || 0) + deltaB` before `drawGame` — i.e. inside `simulateSeries`, after `computeStrength`, before the game loop. `sA`/`sB` returned include the bonus (same convention career's design set).
- `flavor` flags only select **existing** cosmetic branches (AGGR/LATE/EARLY/dragon/tower bias); they add no strength and never flip a winner.
- `computeStrength`, `winProb`, `phaseEdge`, `drawGame`, variance, and ratings paths are **not rewritten**. `strategyDelta` consumes no rng → seeded winner paths shift only by the strength delta, never by draw-order changes.

**Caller contract (explicit):**

| caller | passes `extra`? |
|--------|-----------------|
| `PLAY_ROUND` (season + career): managed team's side | **yes** — `{aBonus/bBonus: coach bonus if career, aStrat/bStrat: state.strategy snapshot on the managed side, null on the AI side}` |
| `PLAY_ROUND`: AI-vs-AI matches | **no** (default-zero; outputs byte-identical) |
| `PLAY_CAMPAIGN_NODE` (campaign) | **no** — scripted, unaffected |
| `logic.js estimateSeriesWinProb`: gains optional trailing `extra = {}` | **yes** from the Strategy panel preview; **no** everywhere else (Monte-Carlo default-zero) |
| Season/campaign/career Monte-Carlo batch sims | **no** unless the caller opts in |

`detail` snapshots in `PLAY_ROUND` results extend to `{seed, homeLineup, awayLineup, homeTactic, awayTactic, homeStrat, awayStrat}` (strat = snapshot or null) so MatchDetail recompute passes the same `extra` and stays byte-identical. `load()` backfills missing `strategy` → defaults and missing `homeStrat/awayStrat` → null.

## 7) Scope guard (v1)

- v1 ships the 4 choices for **Season AND Career** (both use `PLAY_ROUND`). **Campaign (Scenario Mode) is scripted and unaffected** — no strategy reads, no `extra` passed.
- Choices are **per-week, re-settable** (§1). No lock-in, no cooldowns, no costs in v1.
- **Minimal new UI:** one pre-match **Strategy panel** reusing Tactics/Lineup state — four controls (`comp` 3-way, `roam` 3-way incl. default, `swap` toggle, `wincon` 5-way incl. default) + live `estimateSeriesWinProb` readout. `Lineup.jsx`/`Tactics.jsx` reused as-is; only the new panel component + `SET_STRATEGY` case + `strategy` slice + `PLAY_ROUND` wiring are new.
- **Deferred (not v1):** per-game (in-series) adjustments, opponent scouting intel, coach-style modifiers beyond career's flat bonus, AI use of strategy knobs, any economy/cost for choices.

## 8) Acceptance criteria

1. All-default (`strategy` all null/false) reproduces the current sim: 2000 seeded series vs. pre-change baseline → identical winners with identical seeds (only `extra`-carrying paths may differ; default paths are byte-identical).
2. Set ROAM → managed-team JNG/MID effective skill rises and BOT falls in the next sim (assert via `strategyDelta` unit: role deltas `{JNG:+6, MID:+4, BOT:−6}` and net +0.75); set STAY → BOT/SUP rise (net ≈ +1.0). Series winprob moves +2–4% vs. default at even matchups.
3. Set swap=true with MID/LATE phase → +1.0 scaling term; with EARLY phase → −1.0. Cosmetic: first-tower timing later + late swings larger.
4. Each wincon vs. null at even strength: DRAGONS/SPLIT each move series winprob ≈ +3–5% (1.25 str); SCALE/EARLY with coherent phase ≈ +2–4%; incoherent phase haircut to +0.25. Over 1000 sims per wincon: dragon-event share highest under DRAGONS, tower share highest under SPLIT, mean duration longest under SCALE / shortest under EARLY.
5. Draft bias AGGR vs SCALE at matched strength: kill totals higher + durations shorter under AGGR; late-swing magnitude higher + durations longer under SCALE.
6. Stacking clamp: all choices maxed → total strategy delta ≤ +2.5 (assert `strategyDelta` never returns outside [−2.5, +2.5]).
7. No engine regression: season/campaign/career existing outputs identical when `extra` omitted; `estimateSeriesWinProb` default signature behavior unchanged; MatchDetail recompute with stored strat snapshots byte-identical.
8. Scope: choices affect Season + Career `PLAY_ROUND` managed-team matches only; AI-vs-AI and all Campaign sims show zero delta.
