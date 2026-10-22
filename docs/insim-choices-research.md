# In-Sim Strategic Choices — Research & Engine-Mapping (Roadmap Item 4)

**Status:** research only. No `src/` changes. Ratings below are fictional/game-balanced
mechanic-design inputs, not real-player evaluations.
**Engine baseline:** `src/engine/sim.js` — `computeStrength(lineup, tactic)` +
`phaseEdge(mine, theirs)` + `drawGame` logistic draw per game, best-of-3.
Tactics: `style ∈ {AGGR, BAL, DEF}` (strength mult + variance),
`phase ∈ {EARLY, MID, LATE}` (timing edge ±2.0). Role weights:
`TOP 1.0 / JNG 1.0 / MID 1.1 / BOT 1.1 / SUP 0.9`. `SCALE = 9` per logistic e-fold.
Players carry `ovr, mech, macro, consist, form, role`. Rosters are 10-man
(5 roles × starter+sub); lineup = which 5 start.

**Important engine gap (verified 2026-10-04):** the `extra={aBonus,bBonus}` param
described in the roadmap brief does **not** exist in `simulateSeries` today —
signature is `simulateSeries(lineupA, tacticA, lineupB, tacticB, rng, labelA, labelB)`.
So every "strength bonus" proposal below needs either a new `extra` param or a new
per-choice modifier struct. Flagged per-row in §5.

Real-LoL grounding comes from public strategy literature (draft/win-condition
taxonomies, support-roam guides, lane-swap analyses, objective-control writeups);
effect sizes are translated into this sim's strength units, not quoted as real
LoL statistics.

---

## 1. Draft picks (initial): choosing starters + comp bias

### How draft determines outcomes in real LoL
- Draft sets the **win condition**: the same five kits become one plan (engage /
  pick / split / siege / protect). A comp without a coherent wincon (e.g. no
  engage, no frontline, all-burst damage) loses winnable games regardless of
  lane skill. (roamreport.gg champion taxonomy; baronbuff win-conditions guide;
  boostroom draft guide.)
- Structure: blue side gets 1st pick (safe/flex blind), red side gets last pick
  (counter window). Only red's last pick gets a clean counter; earlier
  "counters" picked blind are usually −EV. Comfort (high-confidence pick)
  beats a theoretical counter you can't play. (boostingmarket draft guide;
  guildorder draft theory.)
- Quantified guidance used in solo-queue literature: a genuine counter-pick
  (played 30+ games, enemy already locked, fits comp) is worth roughly
  **+3–5% winrate**; a forced off-comfort/blind counter is symmetrically
  negative. Treat as directional, not measured [UNCERTAIN].

### Mapping to our sim (players have role+ovr only, no champions)
Draft ≡ two coupled decisions:
1. **Starter selection per role** — pick 1 of 2 roster players per role.
   Already expressible: it IS the `lineup` argument. A 3-OVR gap between
   starter and sub at a 1.1-weight role ≈ 3×1.1/5.1 ≈ 0.65 raw strength ≈
   ~+1.8pp win-prob per game at even matchup (logistic, SCALE=9). So starter
   choice is already the highest-leverage "draft" lever — no engine change.
2. **Draft bias (comp style)** — aggro-leaning vs scaling-leaning roster
   construction. Propose a single enum `draftBias ∈ {AGGRO, BALANCED, SCALING}`
   chosen at draft time that **nudges tactic defaults and grants a small
   compensating edge**:
   - `AGGRO`: suggests/forces `phase EARLY`, +small early bonus.
   - `SCALING`: suggests/forces `phase LATE`, +small late bonus.
   - `BALANCED`: no bonus, full tactic freedom (the "safe blind pick").

### Balanced mechanic proposal
- Starter picks: free, no offset (strength flows through `computeStrength`).
- Draft bias bonus: **±0.8 strength** (≈ ±2pp per game) applied as an `extra`
  bonus when the player's in-game tactic phase matches their draft bias
  (AGGRO+EARLY, SCALING+LATE), 0 otherwise. BALANCED never grants/denies.
- Draft-mistake modeling (optional): if bias and phase conflict for the whole
  series (e.g. drafted SCALING but play EARLY all 3 games), apply **−0.8**
  instead — mirrors "counter that breaks the comp loses more than it wins."
- Cap total draft swing ≈ ±2pp so draft matters pre-loading-screen without
  deciding the series. Magnitude marked [UNCERTAIN] — tune via sim sweep.

---

## 2. Support roam vs stay in lane

### Real-LoL effect
- A good roam converts **wave-state windows** (crash/recalled bot wave) into
  mid/jungle pressure: kill, burned flash, river vision → dragon setup.
  Round trip bot→mid ≈ 25–45s; one roam per recall cycle, then reset.
  (boostingmarket support-roaming guide; levellegendary roam windows.)
- Failure mode is symmetric: leaving on a slow-push/bounce toward your own
  tower donates a dive (~plate + wave + XP, ~800g equiv. cited in coaching
  literature [UNCERTAIN]); roaming on enchanters (Janna/Soraka/Lulu — no
  kill threat, no mobility) is "almost always wrong."
- Net: successful roam ≈ **+2–4% team winrate** early; failed roam ≈ −2–4%,
  concentrated in JNG/MID upside vs BOT downside. Roam quality is gated by
  (a) wave state, (b) ADC safety, (c) vision, (d) a real target — a builder
  can gate success probability on support `macro` + ADC `form` if desired.

### Balanced mechanic proposal
Binary choice `supStance ∈ {ROAM, STAY}`, resolved per game (or per series —
per-series is simpler and recommended for v1):
- `ROAM`: **+0.6 to team's effective JNG+MID contribution, −0.6 to BOT**
  (net ≈ 0 at equal weights, redistributive). Implement as per-role weight
  tweak inside `computeStrength` **or** as ±strength bonus. Adds variance:
  suggest `variance +0.15` on the roaming side (roams are coin-flips).
- `STAY`: **+0.6 to BOT**, neutral elsewhere, no variance change.
- Net match effect ≈ ±1–2pp per game — a small early-game swing, never a
  series decider alone. Gate (optional v2): roam bonus scales with support
  `macro` (≥60 full effect, <50 halved) [UNCERTAIN — tuning knob, not sourced].

---

## 3. Lane swap (yes/no)

### Real-LoL effect
- Swap = TOP+SUP/BOT rotate to dodge a doomed 2v2 (protect a scaling ADC),
  deny an enemy bully, or race towers/plates. Costs: sacrificed early towers/XP
  on one side, jungler taxed as bodyguard, top laner starved if dived.
  Modern pro swaps (MSI 2024+, "Viper swap" 2025) are timed to objective
  windows (8-min grubs) and turn economy, not just matchup dodge.
  (rich.report lane-swap guide; statup.gg 2025 meta analysis; namu.wiki.)
- Riot's anti-swap patches (top/mid fortification, presence penalties) confirm
  the design intent: swap **trades early structure for scaling/safety**.
- Net: ≈ **±3–5% depending on matchup** — positive when avoiding a hard-losing
  lane or protecting a hypercarry, negative when executed late/blind or into a
  stronger laning opponent. Directional estimate [UNCERTAIN].

### Balanced mechanic proposal
Binary `laneSwap ∈ {YES, NO}` per series (v1; per-game swap = NEW input path):
- `YES`: **+1.0 late-game scaling term, −1.0 early tower term** (net ≈ 0
  head-to-head, but shifts *when* strength applies). Simplest v1 cut: model as
  `phase LATE` synergy — swap grants +1.0 only if tactic phase is LATE/MID,
  −1.0 if EARLY (you swapped but then played for lanes anyway = worst of both).
- `NO`: standard, no modifier.
- Interaction with §4: swap+`scaling` wincon should stack sub-additively
  (recommend diminishing: second scaling source at 50%) so the combination
  doesn't double-count the same fantasy.

---

## 4. Win-condition priority (dragons / towers-splitpush / scaling / early-lanes)

### Each wincon in real LoL
| Priority | Real meaning | Lean / when it wins |
|---|---|---|
| **Dragons** | Stack drakes → Soul point pressure → forced fights on your setup. First 3 drakes ≈ 80% win in pro (vicinity cited; reflects the advantages that *enable* drakes — priority/vision/tempo — as much as the buffs) [UNCERTAIN] | Mid-priority comps; teamfight/engage drafts; setup ≥ mechanics (90/60/30s vision plans) |
| **Towers / split-push** | 1-4 or 1-3-1: duelist pressures side while 4 hold; convert numbers advantage → towers → map control. Grubs/Herald amplify. TF/global comps signal split | True side-lane threat + disengage mid; teleport timings; avoid 4v5s |
| **Late-game scaling** | Stall, concede early drakes/plates, spike at items/levels (hypercarry + peel/frontline). "Scale and take over" | Protect-the-carry drafts; weak early lanes; cross-map trades instead of rescues |
| **Win early / lanes** | Snowball plates + dives + early dragons before enemy scales; tempo comps fall off a cliff if denied | Lane bullies + skirmish jungler; plate gold → jungle pathing → dragon fights |

(Sources: victoryview objective control; boosterria objective management;
boostroom objective control 2026; checkrankings objective-planning scale;
baronbuff 17 win conditions; roamreport 5-label taxonomy.)

### Mapping to engine knobs (proposal)
| Choice | Engine target | Reuse or NEW |
|---|---|---|
| Dragons | Objective/teamfight edge: +strength when `phase MID` (teamfight-around-objectives), plus optional dragon-event flavor weight | REUSE `tactic.phase=MID` + NEW small `objectiveEdge` bonus (≈ +0.8) |
| Towers / split-push | NEW `splitpush` strength term (≈ +1.0), ideally scaling with TOP ovr (the splitter). Loses to hard-engage: −1.0 vs opponent `style AGGR` [UNCERTAIN] | NEW term (no side-lane concept exists today) |
| Late-game scaling | `phase LATE` edge (exists: `phaseEdge` ±2.0) + NEW `scaling` term for series-decider games (game 3 weight ×1.5) | REUSE `phase`, NEW `scaling` term for game-3 emphasis |
| Win early / lanes | `phase EARLY` edge (exists) + `style AGGR` mult/variance (exists) | REUSE only — no new input |

- Recommended magnitudes: each wincon ≈ **±0.8–1.2 strength** (≈ ±2–3pp/game),
  phase-counter edges stay dominant (±2.0). Wincon choice should express
  *which existing phase/style it synergizes with*, not bypass them.
- Cosmetic path (already exists, must stay cosmetic): duration/events/stats
  conditioned on winner — wincon flavor (more dragons vs more towers in events
  log) can ride the cosmetics path freely since it never flips the winner.

---

## 5. Builder mapping table (choice → engine input)

| # | Choice surface | Affects outcome? | Modulates (existing field) | Needs NEW input? | Proposed size |
|---|---|---|---|---|---|
| 1a | Draft: starter/sub per role | YES (primary) | `lineup` (already a param) | NO | via `computeStrength` weights |
| 1b | Draft: comp bias aggro/scaling | YES (small) | `tactic.phase` nudge + `extra` bonus | YES — `draftBias` enum + `extra.{aBonus,bBonus}` (latter missing today) | ±0.8 str (≈ ±2pp) |
| 2 | Support roam vs stay | YES (small, redistributive) | per-role weights in `computeStrength`, `STYLE variance` | YES — `supStance` enum (or fold into `extra`) | ±0.6 role-shift; +0.15 var |
| 3 | Lane swap yes/no | YES (temporal shift) | `tactic.phase` synergy (LATE/MID vs EARLY) | YES — `laneSwap` bool (or fold into `extra`) | +1.0 late / −1.0 early |
| 4a | Wincon: dragons | YES | `tactic.phase=MID` + `extra` | HALF — `wincon` enum + `objectiveEdge` | +0.8 |
| 4b | Wincon: towers/split | YES | (none — new axis) | YES — `splitpush` term (+ TOP-ovr link), engage-vulnerability | +1.0 / −1.0 vs AGGR |
| 4c | Wincon: scaling | YES | `tactic.phase=LATE` (`phaseEdge` ±2.0 exists) | HALF — `scaling` term for game-3 weight | +1.0 (×1.5 game 3) |
| 4d | Wincon: early/lanes | YES | `tactic.phase=EARLY` + `style=AGGR` | NO | reuse only |

**Cleanest v1 implementation:** one new optional struct (no per-choice plumbing):
`simOptions = { draftBias, supStance, laneSwap, wincon }` → a single
`choiceBonus(lineupA/B, tacticA/B, simOptions, gameIndex)` helper returning
`{aBonus, bBonus}` added to strength inside `drawGame`, plus the
`extra` param the brief assumed. Keeps RNG discipline intact (bonuses are
deterministic given choices; no new draws). Per-game choices (roam/swap per
game 1/2/3) can wait for v2 — per-series is enough to make all 4 surfaces
outcome-relevant.

**Anti-stacking rule:** cap total choice bonus at **±2.5 strength** per side so
combined picks (swap + scaling + LATE) can't exceed roughly one phase-counter
edge. Diminishing second-source at 50%.

## 6. Uncertainties & tuning notes
- All % figures (draft 5–10%, counter +3–5%, roam ±2–4%, swap ±3–5%, drakes-80%)
  are literature-directional, not controlled measurements — marked [UNCERTAIN]
  where used. Convert to strength units via `winProb` (SCALE=9): +1.0 str ≈
  +2.7pp at 50/50; verify with a sim sweep before locking numbers.
- Support-roam gating on `macro`/`form` and split-push TOP-ovr linkage are
  design proposals without direct sourcing — tune, don't assert.
- Open builder questions: per-series vs per-game granularity for roam/swap;
  whether AI opponents get the same choice UI (symmetry) or scripted biases;
  how choices surface in the match log for readability.
