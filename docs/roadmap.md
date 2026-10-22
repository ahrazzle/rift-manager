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
