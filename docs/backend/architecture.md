# Roster backend: transfers, morale, academy

These modules are production code. `src/game/useGameState.js` composes them with the public reducer (`const rosterBackend = createRosterBackend(reducer)`, after the `reducer` definition); the game hook dispatches through `rosterBackend.reducer` and `load()` returns `rosterBackend.migrate(...)` after every legacy backfill. UI lives in `src/components/team/ManagedRoster.jsx` (Sell/Release via `PlayerActions`, confirmations, disabled reasons from `previewTransfer`), the academy dialog in `src/components/CareerModals.jsx` (explicit prospect + bench-cut via `selectAcademy`), and the report sections in `src/components/hub/OffseasonReport.jsx`. Player-facing rules are in `docs/GUIDE.md`.

History: built as quarantined drafts #48–#51 against frozen base `ec498a2`, then transplanted leaf-by-leaf and wired in the Broadcast Night launch (PR #61, closing issue #60). The frozen-base quarantine test (`backend-boundary.test.mjs`) was retired at integration, as planned; the behavior and lifecycle suites remain.

## Ownership and composition

| Module | Owns | Does not own |
| --- | --- | --- |
| transfers.js | Sell/release legality, fee, replacement, free agency, transfer history | Signing, chemistry, automatic academy cut |
| morale.js | Office deltas, joined-season backfill, annual tenure | Simulation, placement, renewal, form formula |
| academy.js | Persistent candidates, selected bench replacement, legacy offer migration | Main-roster development, simulation |
| adapter.js / composed.js | Public-reducer delegation, concrete leaf bindings and lifecycle order | React, UI, RNG generation, duplicated season logic |

Leaves do not depend on the adapter and stay portable (no React, no `useGameState` import). The exported `reducer` in `useGameState.js` remains the unwrapped public reducer on purpose: the backend composes it, and `test/backend-integration.test.mjs` uses it as the legacy parity reference. Production code must dispatch through `rosterBackend`, never the bare `reducer`.

`createRosterBackend(legacyReducer)` from `composed.js` binds the concrete leaves and exposes `selectAcademy` alongside `previewTransfer`. The lower-level `createBackendAdapter(legacyReducer, academyPorts)` receives the existing exported **public** reducer. Its `transition` returns `{state, ok, reason, effects}`; `reducer` exposes only the next state for a reducer consumer. Keep the envelope for confirmations and same-settle diagnostics. Rejected leaf actions preserve the original state reference and carry a human-readable reason. `migrate` performs additive save migration; it must be called after the existing save loader, without renaming save keys.

## Exact integration seams

Line numbers refer to `src/game/useGameState.js` at integration; locate by the named case if they drift.

| Existing hook | Adapter behavior |
| --- | --- |
| Public reducer matchSession guard (`reducer`, line 2038) | Sell/release/promotion commands refuse until MATCH_CLOSE, including result-stage sessions |
| START_CAREER, line 607 | Initialize managed joinedSeason without consuming randomness |
| SET_LINEUP, line 646 | Let legacy change the slot, then apply exactly -4/+3 once if the slot truly changed (a refused hook returns the caller's state, so no-op clicks do nothing) |
| SIGN, line 695 | Let legacy charge the fee and install the starter, then set incoming morale 74 and the previous starter -6 |
| TRADE_PLAYER, line 1739 | Let legacy enforce same-role/OVR acceptance; incoming +3, no lineup-pair tick |
| ADVANCE_SEASON, line 1226 | Backfill before advancing; return the caller's original state if legacy refuses |
| Placement morale tick (inside ADVANCE_SEASON) | Tenure runs after placement. The adapter applies it after legacy returns because no later managed-roster morale change exists |
| defaultLineup reset (inside ADVANCE_SEASON) | Tenure classifies the **old lineup**, never the newly auto-selected starters |
| Academy roll (inside ADVANCE_SEASON) | Preserve this one legacy roll and its generated candidate; ingest its result, never roll again |
| RESOLVE_PROMOTION, line 1486 | Intercepted by the academy transition (selected prospect/cut). The legacy weakest-bench case remains only as the unwrapped reducer's frozen behavior for parity tests |
| load, line 2146 | Backend migration runs after existing migration (`rosterBackend.migrate(...)` at the return); ordinary JSON, no renamed save keys |

Tenure counts completed time at the boundary into the next season: `(completedSeasonIndex + 1) - joinedSeason >= 2`. A player joining season 1 receives no tenure tick after the first advance and receives one after the second. This resolves the issue's prose/formula ambiguity in favor of its explicit two-Advances acceptance requirement. Players missing the field are backfilled at the pre-advance current season, so they are not treated as veterans. Released players are not ticked. Retirement/refused advances are not ticked. Renewal and placement retain their existing clamp order before tenure.

Accepted legacy SIGN/SET_LINEUP actions receive their office deltas in all modes where legacy permits them; only trades and tenure are explicitly Career-only in issue #44. The adapter does not invent new special-mode action restrictions.

The academy port contract is `migrate(state)`, `resolve(state, action)`, and `afterAdvance(state, {before, rollAlreadyConsumed: true})`, each returning the same result envelope. `composed.js` adapts the leaf migration (which returns state) to this envelope and adds the `offerAcademy` port after successful locker-event resolution. The last port consumes `state.pendingPromotion`, which already contains this year's generated prospect or null. Persisted candidates must survive event precedence. Extra shortlist generation, if needed, must use an independent deterministic generator after a real offer; no global RNG draws may be inserted into the no-offer path.

## How it is wired

1. `useGameState.js` composes the adapter with the public reducer once (`rosterBackend`). The hook's recovery reducer dispatches every action through `rosterBackend.reducer`; match-session actions pass through to the legacy reducer unchanged.
2. Migration runs when loading saves (last step of `load()`) and when a Career starts (`START_CAREER` through the adapter). Old singular `pendingPromotion` offers are accepted and become the persisted list. New fields (`joinedSeason`, `academyByTeam`, `academyOfferSeasonByTeam`, `transferHistory`) serialize as ordinary JSON; no save keys were renamed.
3. UI reads previews before confirming. `ManagedRoster` shows player, role, exact fee, the named replacement starter, and the refusal reason on disabled buttons; confirmations use the shared `ConfirmDialog`. Immediate explanations come from the transitions (`lastEventLog`, transaction messages), never inferred from changed numbers.
4. The academy dialog requires an explicit prospect and bench cut (`prospectId` + `cutId`). A no-bench offer preserves candidates and shows the honest reason with a decline control; declining keeps the prospects for next off-season.
5. The Hub off-season report renders `offseasonReport.transfers` (with sale income marked as already in the budget), `.morale` tenure lines, and `academyPromotions` notes.
6. Season mode exposes Release on the Market screen's roster card; Sell stays Career-only, enforced by the same preview the reducer applies.

## Validation evidence

`npm test` runs the leaf suites (`backend-transfers`, `backend-morale`, `backend-academy`), the real-reducer integration suite (`backend-integration`: sell → sign → advance → academy decline → JSON save roundtrip → next advance/reoffer → chosen promotion, two tenure boundaries, placement clamping before tenure, locker-event deferral, no repeat income, unchanged seeded play/RNG), and `roster-backend-ui` (production-reducer stamps, one-time `load()` migration of an old career save, Sell/Release controls with confirmation and refusals, report rendering). Hosted Checks (`test` + build) gate `main`; merging publishes the Pages site, which re-runs tests and build before deploying.

Historical note: as unimported drafts, these modules once produced byte-identical production builds (24 files, equal SHA-256). That quarantine evidence no longer applies — the modules are imported and change the game exactly as documented above. The Vite large-chunk advisory is pre-existing and unchanged.
