# Portable morale and tenure hooks (draft)

This module is dormant until a future reducer integration calls it. It imports no
React, simulation, persistence or sibling backend module, consumes no randomness,
and changes no production UI. It does not implement chemistry or a second rating.

All exports return `{ state, ok, reason, effects }`. Success has `reason: null`;
refusal has a readable reason, no effects, and the exact original state reference.
For the two-state office hook, that original state is `before`. Unknown actions
pass `after` through unchanged. Inputs are never mutated. Effects are JSON records
with player ID, reason, message, before/after, actual delta and requested delta.
The current transition’s morale messages replace `lastEventLog`; previous office
messages are not accumulated into an unbounded history.
Clamping and integer rounding match the existing reducer.

## Integration ports

- `backfillJoinedSeason(state)`: call after Career creation and loading, before
  saving or an advance. Only the managed Career roster is migrated. Missing or
  invalid tenure becomes the current positive `career.seasonIndex`; existing valid
  tenure survives. Other modes and already-migrated saves retain identity.
- `applyOfficeMorale(before, after, action)`: call exactly once after an accepted
  legacy `SIGN`, `SET_LINEUP` or `TRADE_PLAYER`. A legacy identity refusal or same
  lineup slot returns `before` without logging. The caller must run action
  validation first; these hooks are not a replacement transfer reducer. They also
  reject missing incoming players, invalid lineup roles and non-Career trades.
- `applyTenureMorale(postPlacementState, { completedSeasonIndex, lineup })`: call
  exactly once inside Career advance, immediately after the existing placement
  morale tick and before automatic lineup reset and academy arrival. Pass the
  completed season's index and its pre-reset lineup explicitly. Forward effects
  into the existing offseason report's roster notes in the integrating adapter.
  Do not call this blindly after the whole legacy advance: clamping and lineup
  classification depend on lifecycle order.

## Rules and boundaries

Signing sets arrival morale to 74 and the displaced starter loses 6. A lineup
change gives the old starter -4 and new starter +3. Trade arrival receives +3 only,
including bench trades; never also run a lineup hook for the trade or signing.
Signing/trading stamps the current Career index, even if an incoming player's
old club supplied an earlier joinedSeason. Season-mode office morale works without
creating tenure. Sale/release automatic replacements cause no extra morale effect.

Eligibility at advance is `(completedSeasonIndex + 1) - joinedSeason >= 2`.
The entering season is used deliberately: join in season 1, advance to 2 without
a tick, advance to 3 with starter +2 or bench -3. Missing tenure at the lifecycle
port is backfilled to the completed index, so an old save is not immediately
veteran. Placement clamping happens first; a starter at 99 becomes 100 and a bench
player at 99 becomes 96. No form calculation or existing press, series, renewal,
placement, training or development delta is changed.

The academy owner sets a promoted player's morale to 74 and joinedSeason to the
current Career index at arrival. Do not route promotion through this SIGN hook:
academy may replace a bench player without displacing a starter. Cut/departing
players enter FA at 60 in the acquisition/transfer module. The next academy wave
must arrive after tenure so a new arrival cannot inherit a veteran tick.

Tenure is deliberately not self-deduplicating: the integrating lifecycle calls it
once per accepted advance; no speculative timestamps or duplicate save keys are
added. Save/load remains ordinary JSON with additive joinedSeason player fields.

## Verification

Run `node --test test/backend-morale.test.mjs`. Fixtures come from the real reducer,
including actual sign/lineup/trade actions. Tests freeze inputs and cover migration,
JSON round trips, both trade positions, repeat/invalid/no-op actions, mode and
retirement boundaries, finance/form preservation, clamp order, old lineup use and
two-advance eligibility. The combined adapter suite must verify the lifecycle port
inside real ADVANCE_SEASON; this leaf does not patch that production action.
