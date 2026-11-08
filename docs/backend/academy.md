# Academy backend

The persistent academy lifecycle in `src/game/backend/academy.js` runs in production through the roster backend, with the choice dialog in `src/components/CareerModals.jsx` (see `docs/backend/architecture.md`). The leaf itself stays pure.

## Ports

- `migrateAcademy(state) -> state`: Career-only, idempotent backfill of `academyByTeam`. Converts legacy `pendingPromotion: {player, teamId}` into a persistent list and `{teamId, prospectIds}` offer. Existing persisted identities take precedence; a genuinely new identity colliding with a main-roster/FA identity receives a deterministic suffix.
- `afterAcademyAdvance(before, after) -> {state, ok, reason, effects}`: call after a successful legacy advance. Consumes its already-rolled singular standout without another probability roll. Uses a separate seeded stream and the existing player builder to fill a successful offer to three total prospects. Never drops persisted players, including lists longer than three. No new candidate means no extra RNG calls or generation. Empty-list missed-roll paths preserve the exact legacy output reference.
- `offerAcademy(state) -> envelope`: call after a locker event resolves. Offers persisted candidates when no event or offer is pending. Does not generate or draw random numbers.
- `selectAcademy(state) -> {prospects, bench, reason}`: read-only choices and a visible no-bench explanation. `bench` lists non-starters; an explicit cross-role selection still passes final role coverage validation.
- `resolveAcademy(state, action) -> envelope`: consumes `RESOLVE_PROMOTION`. Promotion requires `promote: true`, `prospectId`, and `cutId`. Decline accepts `promote: false` or `declineAll: true`. Refusals retain exact input state identity with readable reason and stable code.

Run migration explicitly on load. Command validation may read an in-memory migrated view, but an invalid command never partially saves a migration. Preserve academy state with ordinary save serialization and state spreads. A fresh game discards old fields naturally.

## Decisions and persistence

Promotion replaces precisely the selected bench player, preserving roster size and starter lineup. A cut cannot remove the last player of a role unless the promoted player fills that role. The academy flag is stripped, all other prospect data retained, and arrival fields become morale 74, the existing contract (default 2), joinedSeason equal to the current Career season. Form starts at 50. The cut player's form entry is deleted and they enter FA at morale 60, with no fee or teammate morale penalty.

An existing offseason report receives an `academyPromotions` record naming the promotion and cut. The same structured effect and immediate log provide evidence when there is no report. No academy stats grow or age automatically.

Decline retains every prospect and clears the modal. `academyOfferSeasonByTeam` records the current season of a resolved offer so locker resolution cannot immediately reoffer declined or remaining prospects. The next advance makes them eligible again. Locker events take priority; existing prospects are reoffered after event resolution, even when that year's new-standout roll was skipped or missed.

No-bench promotion returns `NO_BENCH` without discarding kids. Explicit decline dismisses that blocking offer and logs why promotion was unavailable. The UI must present the reason and dismissal control. Other malformed or illegal choices similarly leave state intact. Non-Career, inactive/sacked Career and open-match requests cannot promote.

## Integration and remaining work

Complete: persistent lists, old singular-save migration, explicit promotion and bench selection, starter/role guards, deterministic enriched shortlist on hits, collision-safe new identities, deferred offers, report records, save round-trips, and frozen real-roster tests. The pure module has no React or sibling backend imports.

Deferred: production reducer/load wiring, modal cards and confirmation text, age/Pot/outlook display through existing visibility helpers, ordinary personal names, report rendering, public guide/roadmap/changelog updates and staging validation. Current generator labels remain honest; no new naming database or growth engine was introduced.

Validation: `node test/backend-academy.test.mjs`. Tests cover migration idempotence, persisted declines, repeated annual same-role identities, separate RNG, no-offer identity, replay safety, locker-event priority/reoffer, selected cut and full player propagation, FA/arrival morale, no-bench dismissal, illegal/malformed selections, mode/lifecycle guards, report names and JSON round-trip.
