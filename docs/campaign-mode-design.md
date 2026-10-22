# LCK Manager — Campaign / Storyline Mode Design

**Status: STABLE** — implementation-ready. Do not change the locked schema (§1) without a versioned revision of this doc.

**Scope:** design of campaign mode only. No changes to any file under `src/` are made by this doc. No change to `src/engine/sim.js` is required.

**Source facts (current code):**
- `simulateSeries(lineupA, tacticA, lineupB, tacticB, rng = Math.random, labelA, labelB)` — league-agnostic, takes lineups. Best-of-3 (first to 2, max 3 games). Returns `{ winner: 'A'|'B', aWins, bWins, games, log, sA, sB }`. Side 'A' = first lineup arg.
- `src/game/useGameState.js` — `useReducer` + `localStorage` persistence under `SAVE_KEY = 'lck-manager-save-v1'`. Actions: `NEW_GAME {teamId, managerName}`, `RESET`, `SET_LINEUP`, `SET_TACTIC`, `TRAIN`, `SIGN`, `PLAY_ROUND`. `PLAY_ROUND` sims every scheduled match, stores per-series `results[]` entries with compact `detail: { seed, homeLineup, awayLineup, homeTactic, awayTactic }`. `MatchDetail.recomputeGames(result)` re-runs `simulateSeries` with `mulberry32(seed)` for byte-identical games. Campaign must reuse this seed-persistence pattern per node.
- `NewGame.jsx` — team picker + manager name, dispatches `NEW_GAME`. No mode concept today.
- `Dashboard.jsx` — season week view (`SCHEDULE[round-1]`, `PLAY_ROUND` button, `state.finished` season-complete card).
- `Results.jsx` / `MatchDetail.jsx` — series list + inline expandable per-game detail via `recomputeGames`.
- `src/data/lck.js` — fictional ratings built deterministically (`makePlayer(teamId, name, role, tier, isStarter)`); `TEAMS` with `tier`, `FREE_AGENTS`, `ROLES`. No `docs/campaign-faker-first-lck.md` exists on disk at time of writing — this doc therefore defines the campaign schema generically so that file slots in later as data only.
- `src/game/logic.js` — `bestLineup`, `userLineup`, `estimateSeriesWinProb`; `src/game/ai.js` — `aiTactic`.

---

## 1) LOCKED DATA CONTRACT (verbatim — honor EXACTLY)

### 1.1 Campaign object

```js
Campaign = {
  id: string,              // unique, kebab-case, e.g. 'faker-first-lck-win'
  title: string,           // display name, e.g. "Faker's First LCK Win"
  description: string,     // 1-3 sentence premise shown on pick screen
  playerTeamId: string,    // team the player controls, e.g. 'T1'
  playerLabel: string,     // display label for the player side, e.g. 'SKT T1'
  nodes: [ CampaignNode, ... ]  // ordered bracket path, length >= 1
}
```

### 1.2 CampaignNode object

```js
CampaignNode = {
  id: string,              // unique within campaign, e.g. 'semifinal-vs-kt'
  round: string,           // display label, e.g. 'Semifinal' | 'Final' | 'Quarterfinal'
  opponentId: string,      // team id for ratings lookup, e.g. 'KT'
  opponentLabel: string,   // display name, may differ from current fictional name, e.g. 'KT Rolster Bullets'
  bestOf: 2 | 3,           // games needed to win the series: BO3 => 2, BO5 => 3
  forcedLoss: boolean,     // true = historical loss, auto-resolved as loss, player cannot change
  historicalScore: string, // display only, e.g. '1–3' (never parsed, never affects logic)
  blurb?: string           // optional 1-line historical flavor shown on the node card
}
```

Field names, types, and value domains above are frozen. New per-campaign flavor goes through optional fields only, never renames. `historicalScore` is display-only by contract — game logic MUST NOT parse it.

### 1.3 Campaign progress (persisted state)

```js
CampaignProgress = {
  mode: 'campaign',             // discriminant vs season state (see §4.1)
  campaignId: string,           // Campaign.id
  nodeIndex: number,            // next node to play (0..nodes.length); == nodes.length means cleared
  status: 'active' | 'failed' | 'cleared',
  failedNodeId: string | null,  // set when status === 'failed'
  nodes: [ NodeResult, ... ]    // one entry per ATTEMPTED node, in order
}

NodeResult = {
  nodeId: string,               // CampaignNode.id
  forcedLoss: boolean,          // copied from the node at play time
  playerWon: boolean,           // winnable node: series winner === player; forced node: always false
  historical: boolean,          // true iff forcedLoss node (displayed as 'HISTORICAL LOSS', never WIN/LOSS)
  aWins: number, bWins: number, // series score from the player's perspective orientation (see §3.2)
  playerSide: 'home' | 'away',  // which side the player was on for this series
  log: [string, ...],           // series log lines (from sim, or synthetic for skipped forced nodes)
  detail: {                     // SAME compact seed shape as season results (re-sim-able)
    seed: number,
    homeLineup: LineupObj, awayLineup: LineupObj,
    homeTactic: Tactic, awayTactic: Tactic
  } | null                      // null ONLY when forced-loss node skips the sim (§3.1, option B)
}
```

---

## 2) New `src/data/campaigns.js` (data file only)

```js
export const CAMPAIGNS = [ Campaign, ... ]  // start with exactly one entry
```

Starter entry (shape example — real bracket values come from `docs/campaign-faker-first-lck.md` when it lands; this doc does not invent them):

```js
{
  id: 'faker-first-lck-win',
  title: "Faker's First LCK Win",
  description: '...',
  playerTeamId: 'T1',
  playerLabel: 'SKT T1',
  nodes: [ /* ordered CampaignNode[] per §1.2 */ ],
}
```

Rules for the data file:
- Pure data + labels. No sim logic, no RNG, no imports from engine/game.
- `opponentId` MUST be a valid id for ratings resolution (§5). `opponentLabel` is free text (historical name flavor).
- `bestOf: 2` = BO3 (current engine native). `bestOf: 3` = BO5 — see §3.3 for how BO5 is handled WITHOUT changing sim.js.
- Nodes array order IS the play order. No branching, no reordering at runtime.

---

## 3) Algorithm

### 3.1 Node resolution

When the player presses **Play** on the current node (`nodes[nodeIndex]`):

**Case A — `forcedLoss === true` (historical loss). Recommended: SKIP the sim (option B).**
1. Do NOT call `simulateSeries`. (Rationale: cheapest, zero engine interaction, result cannot leak a player win through any bug.)
2. Append a `NodeResult` with `playerWon: false, historical: true`, score taken from `historicalScore` for display, `detail: null`, and a synthetic log line: `` `Historical loss — ${playerLabel} fell ${historicalScore} to ${opponentLabel}. This game was lost.` ``
3. `nodeIndex++`. Status stays `active`. Player proceeds — this is never game-over.
4. Allowed alternative (option A, sim-then-override): run `simulateSeries` normally for flavor games, then override `playerWon = false` and relabel display as historical loss. Permitted ONLY if the UI clearly marks it historical and `playerWon` is forced false regardless of sim output. NOT recommended — it costs sim time and risks a display bug showing a fake win. If implemented, the stored `detail` must still re-sim to the same games (same seed discipline as season).

**Case B — `forcedLoss === false` (winnable). Sim normally.**
1. Build player lineup via existing `userLineup(state.teams[playerTeamId], state.lineup, state.form).lineup`; opponent via `bestLineup(state.teams[opponentId], form).lineup`. Player tactic = `state.tactic`; opponent tactic = `aiTactic(opponentId, playerTeamId, nodeIndex + 1)`.
2. `seed = (Math.random() * 0x7fffffff) | 0`; call existing `simulateSeries(playerLineup, playerTactic, oppLineup, oppTactic, mulberry32(seed), playerLabel, opponentLabel)` — player is ALWAYS side A (simplifies win check: `res.winner === 'A'`).
3. If player wins (`res.winner === 'A'`): append `NodeResult { playerWon: true, historical: false, ... }` with full `detail` (seed + both lineups/tactics, player as home — see §3.2), `nodeIndex++`. If `nodeIndex === nodes.length`: `status = 'cleared'` → victory screen.
4. If player loses: append `NodeResult { playerWon: false, historical: false, ... }` with full `detail`, set `status = 'failed'`, `failedNodeId = node.id`. → game-over screen, cannot continue (see §3.4).

### 3.2 Reuse of Results / MatchDetail (orientation contract)

Season `results[]` entries assume home/away orientation. Campaign reuses them by fixing the player as **home** in every stored `detail`:
- `detail = { seed, homeLineup: playerLineup, awayLineup: oppLineup, homeTactic: playerTactic, awayTactic: oppTactic }`, `playerSide: 'home'`.
- A campaign `NodeResult` converts 1:1 to the shape `recomputeGames(result)` expects (`result.detail` + `result.homeId/awayId`), so `Results.jsx` and `MatchDetail.jsx` render campaign series with NO changes: set `homeId = playerTeamId`, `awayId = node.opponentId`, `aWins/bWins` from the player's perspective, `round = nodeIndex + 1`, `userSide = 'home'`.
- Forced-loss nodes with `detail: null` MUST NOT be passed to `recomputeGames` — the Campaign screen renders them as a static historical-loss card (score + blurb), with no MatchDetail expander.

### 3.3 `bestOf` handling WITHOUT changing sim.js

- `bestOf: 2` → single `simulateSeries` call (native BO3). Done.
- `bestOf: 3` (BO5) → loop `simulateSeries` with fresh seeds until one side reaches 3 game-wins or 5 games are played; concatenate `games[]`/`log[]`. Each constituent series stores its own seed; `NodeResult.detail` becomes `{ seeds: [...], ... }` variant OR (simpler, recommended) store only the DECIDING structure: keep an array of per-game-series details. Implementer picks, but `recomputeGames` compatibility requires: either restrict v1 to `bestOf: 2` only, or extend `recomputeGames` with a campaign-specific `recomputeCampaignGames(nodeResult)` that replays the same seed list. **Recommendation for v1: ship `bestOf: 2` only** (all campaign nodes BO3); add BO5 looping in a follow-up. The schema already carries `bestOf` so data is forward-compatible.
- NO engine change: no flag on `simulateSeries`, no rigged lineups, no post-override of winnable results. The ONLY override in the system is the forced-loss skip/relabelling in §3.1-A, which lives in the campaign reducer, not the engine.

### 3.4 Game-over / victory transitions (state machine)

```
active --(winnable loss)--> failed     [terminal; only exit is RETRY_NODE or QUIT_TO_MENU]
active --(winnable win, nodes remain)--> active (nodeIndex++)
active --(winnable win, last node)--> cleared   [terminal; only exit is QUIT_TO_MENU / PLAY_AGAIN]
active --(forced loss)--> active (nodeIndex++, never failed/cleared by a forced node alone)
```

- `failed`: Campaign screen replaced by game-over card (which node, opponent, score, historicalScore context). Actions: `RETRY_CAMPAIGN_NODE` (re-attempt same node, keeps prior NodeResults up to nodeIndex — the failed attempt MAY be kept as history or dropped; recommended: drop it so `nodes.length === nodeIndex` always holds) or `QUIT_CAMPAIGN` (back to menu).
- `cleared`: victory card (campaign title, node recap with W / HISTORICAL markers). Actions: `QUIT_CAMPAIGN` / `RESTART_CAMPAIGN`.
- Invariants: a forced-loss node can NEVER set `failed` or `cleared` by itself (`cleared` requires the final node to be a player WIN — if the final node is a forced loss, clearing means surviving it, i.e. `nodeIndex === nodes.length` with `status` still `active` → treat as `cleared` on advancement; see acceptance §6.3).

---

## 4) UI / state integration

### 4.1 State shape + new actions (additive to `useGameState.js`)

```js
// Season state gains two optional fields (existing saves keep working):
{ ..., mode: 'season' | 'campaign', campaign: CampaignProgress | null }
```

New reducer actions (all campaign-scoped, no change to existing action semantics):
- `START_CAMPAIGN { campaignId, managerName }` — sets `mode: 'campaign'`, builds `freshCampaignState(campaign)`, reuses `freshState()` team/form/lineup scaffolding with `teamId = campaign.playerTeamId`.
- `PLAY_CAMPAIGN_NODE {}` — executes §3.1 for `nodes[nodeIndex]`. No-op unless `status === 'active'`.
- `RETRY_CAMPAIGN_NODE {}` — `status: 'failed' → 'active'`, clears `failedNodeId` (and drops the failed attempt entry per §3.4).
- `RESTART_CAMPAIGN {}` — resets progress to node 0, keeps campaignId/manager.
- `QUIT_CAMPAIGN {}` — `mode: 'season'`, `campaign: null` (or `RESET`-equivalent fresh state) → back to NewGame menu.
- Existing `SET_LINEUP` / `SET_TACTIC` / `TRAIN` keep working in campaign mode (lineup+tactics editors reused as-is; `SIGN`/market and `PLAY_ROUND`/standings are hidden in campaign mode, not removed).
- Persistence: same `SAVE_KEY` mechanism (`useEffect` JSON stringify already covers new fields). Version stays `1` iff loader accepts missing `mode`/`campaign` as season default; otherwise bump to `2` with a v1→v2 migrator (recommended: default `mode: 'season'` when absent, no bump needed).

### 4.2 Screens (new + modified)

1. **NewGame.jsx — mode choice (modified, additive).** Top section gains two radio-style buttons: `Season` (existing team picker + Start Season) vs `Campaign` (campaign picker list from `CAMPAIGNS`: title + description + node count; Start Campaign → `START_CAMPAIGN`). Default stays Season. One campaign in v1.
2. **Campaign.jsx — NEW screen (bracket path).** Vertical node list in order; per node card: `round` label, `playerLabel vs opponentLabel`, `historicalScore` + blurb, status icon (`✅ WIN` / `⏳ UPCOMING` / `📍 NEXT` / `🎞 HISTORICAL LOSS` / `❌ FAILED HERE`). Current node shows **Play** button (winnable) or **Continue** button (forced-loss auto-resolve — label it `Acknowledge historical result →` so the player knows no sim skill is involved). Completed winnable nodes expand inline via existing `MatchDetail` (same `recomputeGames` path, §3.2).
3. **Game-over screen** — part of Campaign.jsx (`status === 'failed'`): `CAMPAIGN FAILED` header, failed node round/opponent/score, flavor line (`${playerLabel} fell here historically/in this run — campaign over`), buttons `[Retry node] [Back to menu]`.
4. **Victory screen** — part of Campaign.jsx (`status === 'cleared'`): `🏆 CAMPAIGN CLEARED`, full node recap, buttons `[Play again] [Back to menu]`.
5. **Results.jsx / MatchDetail.jsx — reused UNCHANGED.** Campaign passes adapted entries (§3.2). No edits to either file in v1.
6. **App tab bar** — when `mode === 'campaign'`, tabs collapse to `Campaign | Lineup | Tactics | Results` (hide Dashboard/Standings/Market, which are season-only). Dashboard's `state.finished` card is never shown in campaign mode.

---

## 5) Rosters / ratings decision

**Recommendation (a): reuse current fictional LCK ratings for ALL campaign teams.** Concretely: `playerTeamId` and every `opponentId` resolve against `TEAMS` in `src/data/lck.js` (player names for flavor come from `playerLabel`/`opponentLabel`, NOT from roster edits). Rationale: zero data-balancing work, sim stays in its tuned envelope, shippable now; the campaign's challenge comes from node order + must-win pressure, not from stat archaeology. Real historical names appear ONLY as display labels (`playerLabel: 'SKT T1'`, `opponentLabel: 'KT Rolster Bullets'`, node blurbs) — never as rating claims. The `lck.js` header disclaimer (fictional values) covers this; add one line to the campaign picker: `Rosters use game-balanced fictional ratings; only names/scores evoke history.`

Option (b) (historical-flavored per-campaign ratings overlay) is explicitly DEFERRED: if added later, it ships as an optional `ratingsPatch` field on Campaign (role→delta map) applied at `START_CAMPAIGN` time, never as edits to `lck.js`.

---

## 6) Acceptance criteria

1. **Schema lock:** a validator (or test) constructs the starter campaign and asserts every field in §1.1–§1.2 exists with the correct type/domain; `historicalScore` is a non-empty string and is never read by game logic (grep: only `.jsx` display sites reference it).
2. **Winnable loss → game over:** on a `forcedLoss: false` node, forcing a player loss (test rigs lineup/tactic or seed) sets `status === 'failed'`, `failedNodeId === node.id`, appends exactly one `NodeResult` with `playerWon: false, historical: false`, and disables further `PLAY_CAMPAIGN_NODE` (no-op while failed).
3. **Historical loss never counts as a win:** every `forcedLoss: true` node resolves to `playerWon: false, historical: true`, advances `nodeIndex` by exactly 1, and can never set `status` to `failed`. Display shows HISTORICAL LOSS, never WIN.
4. **Victory condition:** `status === 'cleared'` IFF every winnable node has a `NodeResult` with `playerWon: true` and every forced node has been advanced past (`nodeIndex === nodes.length`). Clearing all winnable nodes + surviving all historical losses is the ONLY path to `cleared`.
5. **Retry works:** from `failed`, `RETRY_CAMPAIGN_NODE` restores `status === 'active'` at the same `nodeIndex` with the failed attempt dropped; a subsequent win advances normally.
6. **Seed persistence / MatchDetail parity:** every winnable `NodeResult.detail` re-sims via `recomputeGames` (or the campaign adapter) to byte-identical `games[]` after reload from `localStorage` (save → reload → expand detail → same scores/timelines).
7. **State persists:** reload mid-campaign (after ≥1 node) restores `campaignId`, `nodeIndex`, `status`, and all `NodeResults`; season saves without `mode` still load as season.
8. **Back to menu works:** `QUIT_CAMPAIGN` from active/failed/cleared returns to NewGame with no campaign residue (`campaign: null`), and starting a season afterwards plays normally (`PLAY_ROUND`, standings, `TOTAL_ROUNDS` unaffected).
9. **No engine change:** `git diff --stat` shows zero modifications under `src/engine/`; `simulateSeries` signature and `computeStrength`/`winProb` semantics untouched. Campaign logic lives in `src/game/` (reducer + adapter), `src/data/campaigns.js`, and `src/components/Campaign.jsx` (+ small NewGame/App wiring).
10. **BO3 v1 scope:** all v1 nodes use `bestOf: 2`; any node with `bestOf: 3` is rejected by the validator until the BO5 loop (§3.3) ships.

---

## 7) Risks / non-goals

- **Balance:** reusing season ratings means some historical underdog stories won't reproduce statically — accepted; difficulty comes from must-win-every-node pressure. Mitigation: tune via `aiTactic` opponent + node order, not ratings.
- **BO5:** out of v1 scope (validator rejects `bestOf: 3`); schema is forward-compatible.
- **No branching paths, no transfers/market, no standings in campaign.** No form carryover tuning beyond existing `TRAIN`/win-loss deltas (reuse as-is; do NOT add campaign-specific form rules in v1).
- **Faker bracket data** (`docs/campaign-faker-first-lck.md`) is pending — it arrives as DATA conforming to §1, never as a schema change.
