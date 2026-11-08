# Transfer backend

Sell/Release behavior is implemented in `src/game/backend/transfers.js` and wired into the shipped game through the roster backend (`docs/backend/architecture.md`). The leaf itself stays pure: no reducer, React, or RNG dependency.

## Public contract

- `previewTransfer(state, action)` returns `{ ok, code, reason }`. On success it also returns `playerId`, `playerName`, `role`, `ovr`, `fee`, `isStarter`, `replacementId`, and `replacementName`. The latter two are null for bench departures. Refusal codes are stable strings and reasons are human-readable.
- `applyTransfer(state, action)` returns `{ state, ok, code, reason, effects }`. Refusal preserves the exact input state object with an empty effects array. Success has null code/reason and one transaction effect.
- `selectTransferReport(state, seasonIndex)` returns `{ seasonIndex, transactions, saleIncome }`. It reads history without changing state or crediting income a second time.

Commands are `{ type: 'SELL_PLAYER' | 'RELEASE_PLAYER', playerId }`. Career must be active; Season supports Release only. Missing mode follows the existing old-save Season convention. Campaign/Scenario, Gauntlet, Draft, and IGL do not support these commands. Sacked managers and an open `matchSession` (including results awaiting close) cannot change rosters.

Career Sell uses exactly `Math.round(signingFee(player) / 2)` and requires a finite, accurately representable budget. A zero or negative budget is permitted: selling receives money. Release receives no fee and works without finance. Other finance metadata is preserved. Both move the departing player to the free-agent pool with `team: 'FA'` and `morale: 60`; neither names a buyer club. The pool is not capped during this action; the existing offseason refresh owns its cap.

The last player of a role cannot leave. Starters cannot be released. Selling a starter requires a same-role bench replacement; the first eligible player in roster order takes the slot, deterministically. Preview names this replacement. Other players' morale is unchanged, including the new starter: no extra chemistry rule or automatic lineup penalty is invented. The departure removes its form entry. Invalid or duplicate outgoing lineup assignments are refused, avoiding ghost starters.

## Persistence and lifecycle handoff

Existing saves need no migration. A successful departure adds `transferHistory`, an array of plain JSON transaction records. Each includes type (`PLAYER_SOLD` or `PLAYER_RELEASED`), message, player ID/name/role, managed team ID, season index, round, fee, and replacement ID. Season records use null season index. The same transaction is emitted in `effects`; `lastEventLog` receives its honest immediate message. Records preserve past player names and fees independently of later roster changes.

For the next Career offseason report, call `selectTransferReport(beforeAdvance, beforeAdvance.career.seasonIndex)` and attach its result to that completed season's report. Sale income is historical context; it already entered the budget when sold and must not be added again. History survives ordinary state spreads and JSON save round-trips. Report selection does not consume it, so dismissal/reload is safe. A new-game reset should naturally discard it with the rest of the old state.

## Complete versus deferred

Complete: pure previews and transitions, mode and finance guards, role safety, deterministic replacement, atomic roster/FA/form/budget/log updates, optional persisted transaction history, report selector, and frozen real-roster tests. No RNG, React import, or sibling backend dependency is used.

Deferred to the coordinated integration: production reducer routing, Squad/Season controls, confirmation dialogs, disabled reasons and exact fee display, offseason report attachment/rendering, public guide/roadmap/changelog updates, staging validation and final visual overhaul. AI offseason churn, academy cuts, signing/trade rules and fees are unchanged.

Run `node test/backend-transfers.test.mjs`. It tests Career and Season, denied modes/actions, missing finance, zero-budget sale, starter replacement and refusal, last-of-role, form cleanup, FA morale, retired/sacked/match-session guards, exact no-op identity, frozen inputs, repeat departure refusal, history selection, and JSON persistence. The file is discovered automatically by the existing test runner.
