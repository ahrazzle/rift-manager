# Portable roster backend draft

These modules are additive development work against main `ec498a2`. The live game does not import them. They are not a complete implementation of issues #43–45: confirmations, player cards, disabled reasons, modal choices and rendered report lines remain design-overhaul work. No production rollout is implied.

## Ownership and composition

| Module | Owns | Does not own |
| --- | --- | --- |
| transfers.js | Sell/release legality, fee, replacement, free agency, transfer history | Signing, chemistry, automatic academy cut |
| morale.js | Office deltas, joined-season backfill, annual tenure | Simulation, placement, renewal, form formula |
| academy.js | Persistent candidates, selected bench replacement, legacy offer migration | Main-roster development, simulation |
| adapter.js / composed.js | Public-reducer delegation, concrete leaf bindings and lifecycle order | React, UI, RNG generation, duplicated season logic |

Leaves have independent feature commits and do not depend on the adapter. The assembly branch includes those commits and adds integration tests. Cherry-pick the leaves once, then the assembly-only commits; do not apply an assembly diff that duplicates already-transplanted leaf changes.

`createRosterBackend(legacyReducer)` from `composed.js` binds the concrete leaves and exposes `selectAcademy` alongside `previewTransfer`. The lower-level `createBackendAdapter(legacyReducer, academyPorts)` receives the existing exported **public** reducer. Its `transition` returns `{state, ok, reason, effects}`; `reducer` exposes only the next state for a reducer consumer. Keep the envelope for confirmations and same-settle diagnostics. Rejected leaf actions preserve the original state reference and carry a human-readable reason. `migrate` performs additive save migration; it must be called after the existing save loader, without renaming save keys.

## Exact integration seams

Line numbers refer to frozen `src/game/useGameState.js`; locate the named cases when transplanting into the design branch.

| Existing hook | Optional adapter behavior |
| --- | --- |
| Public reducer matchSession guard, lines 2064–2084 | New sell/release/promotion commands refuse until MATCH_CLOSE, including result-stage sessions |
| START_CAREER, line 603 | Initialize managed joinedSeason without consuming randomness |
| SET_LINEUP, line 642 | Let legacy validate/change slot, then apply exactly -4/+3 once if slot truly changed |
| SIGN, line 691 | Let legacy charge fee and install starter, then set incoming 74 and previous starter -6 |
| TRADE_PLAYER, line 1735 | Let legacy enforce same role/OVR acceptance; incoming +3, no lineup-pair tick |
| ADVANCE_SEASON guard, line 1222 | Backfill before advancing; return caller's original state if legacy refuses |
| Placement tick, lines 1278–1285 | Tenure is logically after placement. Adapter can apply it after legacy returns because there is no later managed-roster morale change |
| defaultLineup reset, line 1363 | Tenure classifies **old lineup**, never the newly auto-selected starters |
| Academy roll, lines 1439–1443 | Preserve this one legacy roll and its generated candidate; ingest its result, never roll again |
| RESOLVE_PROMOTION, line 1482 | Replace legacy weakest-bench behavior with selected prospect/cut backend transition |
| load, line 2134 | Run additive backend migration after existing migration; persist ordinary JSON |

Tenure counts completed time at the boundary into the next season: `(completedSeasonIndex + 1) - joinedSeason >= 2`. A player joining season 1 receives no tenure tick after the first advance and receives one after the second. This resolves the issue's prose/formula ambiguity in favor of its explicit two-Advances acceptance requirement. Players missing the field are backfilled at the pre-advance current season, so they are not treated as veterans. Released players are not ticked. Retirement/refused advances are not ticked. Renewal and placement retain their existing clamp order before tenure.

Accepted legacy SIGN/SET_LINEUP actions receive their office deltas in all modes where legacy permits them; only trades and tenure are explicitly Career-only in issue #44. The adapter does not invent new special-mode action restrictions.

The academy port contract is `migrate(state)`, `resolve(state, action)`, and `afterAdvance(state, {before, rollAlreadyConsumed: true})`, each returning the same result envelope. `composed.js` adapts the leaf migration (which returns state) to this envelope and adds the `offerAcademy` port after successful locker-event resolution. The last port consumes `state.pendingPromotion`, which already contains this year's generated prospect or null. Persisted candidates must survive event precedence. Extra shortlist generation, if needed, must use an independent deterministic generator after a real offer; no global RNG draws may be inserted into the no-offer path.

## Transplant recipe and remaining work

1. Import the leaf modules and compose the tested adapter with the current public reducer. Keep production imports behind the integration review until the redesigned UI is ready.
2. Call migration when loading saves and initializing a Career. Accept old singular pendingPromotion objects. Serialize new fields normally.
3. Read previews before confirmations. Show player, role, fee, replacement and refusal reason. Use transition effects for immediate explanations rather than inferring events from changed numbers.
4. Add explicit academy prospect and cut selections. A no-bench offer must preserve candidates and support decline/dismiss with an honest reason.
5. Render `offseasonReport.transfers` and `.morale`, plus academy promotion notes. Transfer income is already in the budget; report it without paying it twice.
6. Run the backend integration suite and existing full tests/build against the combined design branch. Verify real UI controls and old saves in staging before claiming the issues complete.

No UI files, active reducer, package manifest, test runner, workflows, GUIDE or CHANGELOG are changed in this backend draft. The existing test runner discovers `test/backend-*.test.mjs` automatically.

## Draft landing policy

The transfer draft #48 and morale draft #49, academy draft and cumulative assembly draft target the frozen `gpt-forge/backend-base-20261106` branch at `ec498a2`. Assembly is a combined review vehicle, not a fourth independent feature. Native draft status prevents ordinary merging while `isDraft=true`; the non-main target also isolates the release route if readiness changes. These controls are not a permanent administrative lock.

Do not retarget or merge these drafts directly into main. Transplant each leaf once into the final design branch, add the assembly-only adapter/tests, then open a separate integration/release PR. Intentionally remove `backend-boundary.test.mjs` at that point: its frozen-base additive-only assertion is a quarantine check, and production integration necessarily changes existing files. Keep the behavior and lifecycle tests. Review and staging of the actual combined UI remain required before any release decision.

## Validation evidence

The cumulative assembly passes all 41 discovered test suites (36 existing suites plus five backend suites) and `npm run build`. The integration suite executes the real public reducer through a continuous sell → sign → advance → academy decline → JSON save roundtrip → next advance/reoffer → chosen promotion path. It also verifies two actual annual tenure boundaries, placement clamping before tenure, locker-event deferral, role/identity invariants, transaction reporting without repeat income, and unchanged seeded play/global RNG consumption.

Independent baseline/assembly production builds produced the same 24 output files with equal SHA-256 hashes. That establishes that these unimported backend modules do not change the current production artifact. It does not establish UI integration or deployment readiness. Existing Vite large-chunk advisory remains unchanged. Hosted CI is separate evidence and these quarantine-base drafts do not target the main-only workflow.

Feature review records: transfer draft #48, morale draft #49, academy draft #50. Architecture and leaf cross-reviews found no outstanding blocking defect at this assembly checkpoint.
