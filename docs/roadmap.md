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
- **Broadcast Night** direction approved after design-agent review; proposal, spec, prototypes, and assets live in `docs/design/broadcast-night/` (implementation not started — see `SPEC.md` migration phases).

## Player feedback lanes (2026-11-05)
Captured from live feedback: development, transfers, and chemistry would deepen the addiction loop. Honest audit vs what already ships — do not invent a second sim on top of the prepare → decide → watch → adjust fantasy.

### Player development
- **Shipped (Career):** annual age/potential growth (`developPlayer`), traits, academy offers, prep that lifts form (not permanent OVR).
- **Gap:** visibility and agency more than a missing engine.
- **Near:** surface age/potential in lineup; offseason growth/regression summary after Advance Season.
- **Mid:** richer academy choice without a second career sim.
- **Later:** playing-time / mentoring OVR paths only if they stay office decisions.

### Transfers
- **Shipped:** FA Market with budget/fees/wages, Career 1-for-1 trades, contracts/renewals, AI offseason churn.
- **Gap:** depth and Career budget sustain, not “no market.”
- **Near:** budget / FA pool refresh between seasons; document Squad trades/coaches/academy in GUIDE.
- **Mid:** voluntary sell/release + slightly smarter trade AI (role-aware 1-for-1 is fine).
- **Later (ideas only):** windows / bidding — do not overshadow prep → match → adjust.

### Team chemistry
- **Shipped (proxies):** per-player morale, press, career locker dilemmas, draft comfort (draft-scoped).
- **Gap:** no chemistry/cohesion system — calling it chemistry oversells.
- **Near/mid:** deepen morale consequences after signs, bench, and tenure so existing systems matter more.
- **Avoid for now:** a separate chemistry meter that duplicates morale.

