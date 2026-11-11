# Rift Manager — Roadmap

## Completed in the match-experiences release (2026-10-13)
- Four story modes with composable Draft and IGL add-ons.
- Animated icon map, optional Show simulation, paused IGL calls and playback controls.
- Interactive drafting and calls in regional, playoff, MSI, Worlds, scenario and gauntlet matches.
- Historical roster exhibitions with fixed standings preserved.
- Saved sessions, legacy mode migration, visible event history preserved after calls.
- 32 story/add-on combinations, saved stages and React playback/control regression coverage.

## Completed in the management-loop release (2026-10-12)
- Weekly preparation with visible form changes and match bonuses.
- Descriptive series review from recorded gold and objective events.
- Correct role-specific draft comfort and side mapping.
- Historical careers, matching-year international opponents, and full Draft/IGL postseasons.
- Save recovery across all modes, isolated staging saves, and reset confirmation.

## Completed in the Broadcast Night launch (2026-11-08, PR #61)
- Broadcast Night visual and IA overhaul, phases 2–7 (#46): shell and IA, hub and result (including the "What changed" strip), draft board, matchday, compete, team and new game, plus the Phase 7 legacy CSS sheet cleanup.
- Voluntary transfer sell/release (#43): half-fee sell with the same-role replacement named before anything moves; Release under the Market in Season, Sell and Release on Squad in Career.
- Deepened morale consequences (#44): signing 74/−6, lineup change −4/+3, trade-in +3, tenure +2/−3 after two completed seasons, `joinedSeason` live.
- Richer academy promotion choices (#45): persisted `academyByTeam`, explicit prospect + explicit bench cut, decline keeps the same prospects for next offseason.
- Follow-on (not in #61): legacy CSS class retirement, tracked in `docs/design/broadcast-night/BUILD-NOTES.md`.

## Remaining simulation and data work
- Broader browser/device accessibility playtesting; native Safari setup and map checkpoint verified.
- Verified historical roster sourcing; ratings remain fictional.
- Deeper event-level IGL causality. The current continuation changes strength and preserves revealed history; it does not model each player’s combat or pathfinding decisions.
- Balance evaluation across many careers, especially preparation and finances.


## LLM flavor pass (user-offered 2026-10-10)
- User will provide an OpenRouter API key IF this ships. Users are not technical
  enough for BYOK, so the key ships with the game (server-side proxy required —
  never bundle the raw key client-side).
- Candidate features: dynamic press-conference questions grounded in the actual
  season state, less repetitive headlines, varied IGL rationales.
- Templates remain the offline fallback. Not started; needs a backend proxy
  before any client work.

## itero.gg concepts (evaluated 2026-10-10)
- Champion-pool-aware draft suggestions: each player has comfort champions;
  draft UI highlights them, drafting comfort gives a small bonus. (Fits draft mode.)
- Post-game analysis shipped as descriptive event counts and gold patterns. Do not call dragons "uncontested": the event model does not record that evidence.

## OpenLeagueManager concepts (evaluated 2026-10-10, ideas only — GPL, no code)
- AI offseason roster churn (in current batch).
- Champion mastery/comfort (see itero note above).
- Scrim/prep week feeding match bonuses (shipped).

## UI/UX overhaul (design proposal, 2026-11-03)
- **Broadcast Night** direction approved after design-agent review; proposal, spec, prototypes, and assets live in `docs/design/broadcast-night/` (shipped 2026-11-08 in PR #61, phases 2–7 — see `SPEC.md` migration phases).

## Player feedback lanes (2026-11-05)
Captured from live feedback: development, transfers, and chemistry would deepen the addiction loop. Honest audit vs what already ships — do not invent a second sim on top of the prepare → decide → watch → adjust fantasy.

### Player development
- **Shipped (Career):** annual age/potential growth (`developPlayer`), traits, academy offers, prep that lifts form (not permanent OVR).
- **Gap:** visibility and agency more than a missing engine.
- **Shipped (2026-11-05, #34, #38):** visibility build per `docs/design/development-visibility.md`. Age and exact Pot on Squad, Market, and academy. Lineup outlook hint only (Career-honest). Dismissible Hub offseason report after Advance Season. No new growth rules.
- **Shipped (2026-11-08, PR #61, #45):** richer academy choice without a second career sim — persisted `academyByTeam`, explicit prospect + explicit bench cut, decline keeps the same prospects for next offseason.
- **Later:** playing-time / mentoring OVR paths only if they stay office decisions.

### Transfers
- **Shipped:** FA Market with budget/fees/wages, Career 1-for-1 trades, contracts/renewals, AI offseason churn.
- **Gap:** depth and Career budget sustain, not “no market.”
- **Shipped (2026-11-05, #37):** budget / FA pool refresh between seasons; Squad trades/coaches/academy documented in GUIDE.
- **Shipped (2026-11-08, PR #61, #43):** voluntary sell/release — half-fee sell with the same-role replacement named before anything moves. Slightly smarter trade AI stays open (role-aware 1-for-1 is fine).
- **Later (ideas only):** windows / bidding — do not overshadow prep → match → adjust.

### Team chemistry
- **Shipped (proxies):** per-player morale, press, career locker dilemmas, draft comfort (draft-scoped).
- **Gap:** no chemistry/cohesion system — calling it chemistry oversells.
- **Shipped (2026-11-08, PR #61, #44):** morale consequences deepened — signing 74/−6, lineup change −4/+3, trade-in +3, tenure +2/−3 after two completed seasons, `joinedSeason` live.
- **Avoid for now:** a separate chemistry meter that duplicates morale.

