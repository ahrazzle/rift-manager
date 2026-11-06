# Broadcast Night: build notes

The durable record of what the Broadcast Night overhaul built, what each part must keep doing, and what comes next. Read it before changing a screen this overhaul touched. `SPEC.md` is the design brief; this file records what shipped, where it differs from the brief, and why.

Each capability has a stable ID. Paths are current implementation links; if a file moves, update the link and keep the ID.

Shared rules that hold for every capability below:

- **One job per hue.** Blue and red mean map sides, in draft and match only. Win and loss mean outcomes. Gold means trophies, MVP and achievements only. Warn means "needs attention". Team colour is for crests and thin "you" accents, never text or buttons. White is the one primary action per view.
- **Tokens only.** Colours, type, space, radius, elevation and motion come from `src/styles/tokens.css`. No hard-coded hex outside it (the white primary hover is the one exception, shared with `primitives.css`).
- **No engine, economy or save-format changes.** The overhaul is presentation. The only new file under `src/game/` is a pure read-only helper (`seriesSnapshot.js`); `tutorial.js` changed copy and anchor ids only.
- **Accessibility floor.** axe (wcag2a, wcag2aa, best-practice) reports 0 violations; at 390 px `scrollWidth` equals the viewport; every action works from the keyboard with a visible focus ring; dialogs trap focus and close on Esc; with reduced motion nothing moves beyond an opacity fade; no meaning rests on colour alone (pips carry W/L, deltas an arrow, risk shows bars, side is named in text).
- **Default play is unchanged.** With Draft, IGL and Show simulation off, a season plays the same screens and the same results as before the overhaul.

## BN-SHELL: shell and information architecture

**Purpose.** One frame for the whole game: five destinations instead of a row of tabs, and a focused mode while a match runs.

**Must keep holding.**
- Five destinations: Hub, Team (Lineup, Tactics, Strategy, Market or Squad), Compete (Standings, Results, Bracket), Club, Guide (How to play, Settings). Desktop: 232 px rail and 64 px topbar. Under 900 px: topbar and a five-item bottom tabbar.
- Internal tab ids stay flat (`dashboard lineup tactics strategy market squad standings results tournament campaign club guide settings`). `setTab('lineup')` from any screen lands on Team › Lineup.
- While `state.matchSession` is set the nav hides and a mode bar shows the matchup, the stage and the stage's controls. Back exists only in `setup` (cancel) and `result` (Done).
- The topbar keeps the `.topbar` class (`game/tutorialScroll.js` reads its height) and the week label is the week about to be played.
- Each destination page has exactly one `<h1>` (from `PageHeader`); screens start at `<h2>`.

**Implementation.** `src/App.jsx`, `src/components/shell/` (`AppShell.jsx`, `nav.js`, `modeBar.jsx`, `PageHeader.jsx`, `Track.jsx`, `ClubPage.jsx`, `SettingsPanel.jsx`), `src/components/Guide.jsx`, `src/styles/shell.css` (also hosts the Guide/About modals, the site footer and the walkthrough overlay). Tests: `test/shell.test.mjs`, `test/app-safety.test.mjs`, `test/management-ui.test.mjs`, `test/scroll-reset.test.mjs`.

**Contracts other code relies on.**
- `navFor(state)` / `resolveRoute` in `shell/nav.js` map tab ids to destinations. Add a segment by adding its id there and a label in `TAB_LABELS`.
- Mode bar API, imported from `shell/index.js` only: `useModeBar({ title, subtitle, backLabel, onBack, backHidden })`, `<ModeBarActions>` (portals controls into the bar), `useHasModeBar()` (true inside the shell; false in tests, where controls stay inline).
- Walkthrough anchors owned by the shell: `tour-team-nav`, `tour-board` (topbar chip on desktop, Club tab on mobile), `tour-tactics-tab`, `tour-strategy-tab`.
- `#main-content`, `.app.broadcast-shell`, `.guide-body` are read by `utils/scrollToTop.js`.

## BN-KIT: shared UI kit

**Purpose.** One set of React components so every screen draws cards, buttons, chips and controls the same way.

**Must keep holding.** Components use tokens and `primitives.css` only. A screen that needs something missing builds it locally and promotes it here once a second screen needs it.

**Implementation.** `src/components/ui/` (contract in `README.md`): Button, Card, Chip, Seg, Pips, Delta, Meter, EmptyState, Dialog/BottomSheet, Icon/RoleIcon, ChampArt/ChampGlyph, OddsBar/OddsWhy, TrophyMark, useMedia. Styles: `src/styles/primitives.css`, `src/styles/ui.css`. Legacy class names still rendered by a few screens (`.card`, `.primary`, `.ghost`, `.table`) are styled in `src/styles.css` to look exactly like the kit.

**Contracts.** Props as documented in the README. `Dialog` is the only modal: scrim, `aria-modal`, focus trap, Esc, focus return; bottom sheet under 900 px. `OddsWhy` takes `explainWinProb()` output from `game/logic.js`. `ChampArt` always falls back to `ChampGlyph` on a missing or failed portrait.

**Stays local on purpose.** `compete/MatchBox.jsx` (Standings and Bracket only) and `result/ChangedStrip` (Result only) have one consumer family each.

## BN-HUB: the weekly loop

**Purpose.** Answer "what do I do this week?" at a glance: next match, the odds and why, readiness, one Play button.

**Must keep holding.**
- The hero has exactly one primary, **Play week N**, carrying `data-tour="tour-play-week"`. Readiness checks link to the screen that fixes them and never block Play.
- Press is an optional inbox item (Answer shows each reply's exact effect; Skip). No blocking press modal.
- Achievements and the review room's "Plan next week" focus survive the Hub remount after a series (`hub/hubMemory.js`).
- After the regular season the hero becomes season status; in Career the Advance Season CTA carries `tour-advance-season`.

**Implementation.** `src/components/Dashboard.jsx` (composition), `src/components/hub/*`, `src/styles/hub.css`. Tests: `test/hub-result.test.mjs`, `test/development-visibility-ui.test.mjs`, `test/transfers-offseason.test.mjs`.

**Contracts.** `Dashboard({ state, dispatch, setTab, totalRounds })`. Anchors: `tour-matchup`, `tour-prep`, `tour-play-week`, `tour-advance-season`. The odds figure, the Why list and Team › Strategy come from one seeded estimate and must agree.

## BN-RESULT: the result payoff

**Purpose.** Make the end of a series feel like a broadcast moment and say plainly what it changed.

**Must keep holding.**
- `MatchExperience` stage `result` renders only `<ResultStage state session onContinue tutorial persistTutorial skipTutorial />`; ResultStage owns the scoreline hero (no separate billboard above it).
- Win: gold radial, trophy with one rim sweep, then static. Loss: no gold, calm copy, "What to look at". Spectator: neutral, no strip.
- "What changed" is derived, never stored: standings before and after, fan hype, kickoff form of the MVP, and the playoff line in the same unit as Standings ("series clear of 5th").
- A reload on the result screen renders the same thing (nothing read from Hub-local state).

**Implementation.** `src/components/result/ResultStage.jsx`, `src/game/seriesSnapshot.js` (pure: reverts the round's results on a copy of the table), `src/styles/result.css`. Review room: `src/components/MatchReview.jsx` + `MatchDetail.jsx` behind "Review the series", with the review tip (`tour-review`).

**SPEC exception.** No "Board trust" tile: a series never moves board confidence (only press answers and the end-of-split review do), so the tile would invent a number.

## BN-DRAFT: the draft board

**Purpose.** A broadcast-style pick and ban that keeps the current, tested draft rules.

**Must keep holding.**
- Role-first picks, flex picks, legal and illegal mid-draft swaps and the real Fearless lockout behave exactly as `src/game/draft.js` defines. The board restyles; it never re-implements the rules.
- All 173 champion portraits load from the existing image source; `ChampGlyph` is only the fallback.
- Banned, picked and Fearless-locked tiles are disabled and say why in their accessible name.
- Phones: a sticky two-row strip and a bottom sheet for assign/move flows.

**Implementation.** `src/components/Draft.jsx` (entry), `src/components/draft/*`, `src/styles/draft.css`. Tests: `test/draft-board-ui.test.mjs`, `test/draft.test.mjs`, `test/match-ui.test.mjs`.

**Contracts.** `Draft` props from `MatchExperience`: `draft userSide gameLabel fearlessCount fearlessActive teams series onBan onPick onPickFlex onAssignFlex onRearrange onLock`. Lock dispatches `MATCH_DRAFT_LOCK` via "Start game N". The mode bar keeps the matchup title; the draft adds "Draft · Game N of M" and a score chip.

**SPEC exceptions.** Portraits kept (shipped and accepted before this overhaul). No pick-then-assign and no separate "Lock in {champion}" step: a pick commits on click into the chosen role, as the current rules require; the detail bar and sheet appear only where a selection step already existed (flex assign, move/swap).

## BN-MATCH: the match broadcast

**Purpose.** Watch a game like a broadcast and make the in-game call without losing the map.

**Must keep holding.**
- Scorebug (crests, kills, clock, series state, centre-anchored gold lead, towers; sticky on phones), the Rift card, objectives, player strip and a play-by-play (polite live region, newest first).
- Pause, speed and skip live in the mode bar. Skip stops at an unanswered IGL call. Reduced-motion browsers start paused.
- The IGL call is an untimed dialog (bottom sheet on phones): every engine call with when it pays, honest stakes, and "Let the team decide". The walkthrough tip never covers `.igl-call-grid`.
- The live and decision stages use the full content width.

**Implementation.** `src/components/MatchExperience.jsx`, `AnimatedRift.jsx`, `MatchDetail.jsx`, `MatchReview.jsx`, `MatchOptions.jsx`, `src/components/match/*`, `src/styles/matchday.css`. Scripts: `scripts/igl-scroll-verify.mjs`, `scripts/tutorial-igl-mobile-shot.mjs`. Tests: `test/match-broadcast-ui.test.mjs`, `test/match-ui.test.mjs`, `test/map-display.test.mjs`, `test/match-experience.test.mjs`.

**Contracts.** `.igl-call-grid`, `.igl-call-option` (exact class, one per engine call) and `.igl-decision` are read by `TutorialOverlay` placement and by the scripts. `data-tour="tour-igl-decision"` sits in the dialog title. Map display preferences are set in Guide › Settings.

**SPEC exceptions.** All seven engine calls are offered (the engine has seven; hiding some would change play). Risk and reward are shown once for the decision, not per option, because the engine grades every call the same way (the fitting call adds strength, any other costs a little). "Let the team decide" replaces the brief's named-IGL escape hatch: the game has no in-game-leader player, so the team takes one of the same seeded calls. No Back during a series: leaving mid-series has no defined outcome in the save model.

## BN-COMPETE: standings, results and bracket

**Purpose.** Show where the season stands and what is at stake, with facts computed from the table.

**Must keep holding.** Standings caption names the cut; the "You" row, GD, form pips with letters, movement arrows and a playoff line row. "What's at stake" lines are computed, never invented. The bracket has real columns and connectors for playoffs, MSI and Worlds, one primary ("Enter next match"). Gauntlet and Scenario keep their own ladder/path chrome.

**Implementation.** `Standings.jsx`, `Results.jsx`, `Tournament.jsx`, `Gauntlet.jsx`, `Campaign.jsx`, `src/components/compete/*`, `src/styles/compete.css`. Tests: `test/compete-ui.test.mjs`.

## BN-TEAM: team management and new game

**Purpose.** Roster, plan and transfers on the kit, with development visible, and a short New Game.

**Must keep holding.**
- Age, potential (Pot) and growth outlook stay visible where they were (Lineup outlook; Squad and Market age and Pot); honest money labels in Market.
- New Game is three steps: mode, club or scenario, coach and match options. The match-options walkthrough tip opens on step 3, where `tour-match-options` renders.
- Every Squad and Market row renders a `PlayerActions` slot.

**Implementation.** `Lineup.jsx`, `Tactics.jsx`, `Strategy.jsx`, `Squad.jsx`, `Market.jsx`, `NewGame.jsx`, `CareerModals.jsx`, `ConfirmDialog.jsx`, `PlayerTags.jsx`, `src/components/team/*`, `src/styles/team.css`. Tests: `test/team-ui.test.mjs`, `test/market-ui.test.mjs`, `test/development-visibility-ui.test.mjs`.

**Contracts.** `PlayerActions({ player, actions, note, showMorale })`, where `actions` is up to three `{ id, label, onClick, variant?, disabled?, icon?, ariaLabel? }`. Today: Sign (Market), Offer and Want (trade board). This is the slot for the pending backend work (sell and release transfers, morale, academy promotion): each new control is one more entry in `actions` from the screen that owns the row, with no layout change. A fourth action belongs in a dialog, not the row. `PlayerList` passes `getActions(player)` and `getNote(player)`.

## BN-CREST: club crests

**Purpose.** An original mark for every club (194 known ids across all leagues, seasons and scenarios) that reads at 24 px.

**Must keep holding.** One shield-and-monogram family for every club, the current LCK ten included (curated colours, no motif); other clubs take their colour from team data or a stable hash and a motif from their id. White monogram at 3.6:1 or better; the rim lightens on dark clubs. Monogram length fits the size (2 characters at 28 px and below, 3 up to 40 px, up to 4 above).

**Implementation.** `src/components/TeamCrest.jsx`, `src/components/teamCrestModel.js`, club-marks section of `docs/BRAND.md`, `scripts/crest-sheet.mjs` (contact sheet at 24/48/96 px). Tests: `test/crests.test.mjs`. Ships as its own pull request.

**Contracts.** `<TeamCrest teamId name size className [short color label] />`. Decorative unless `label` is passed (only when the crest is the sole identifier). Screens never draw team marks any other way.

## BN-TOUR: first-run walkthrough

**Purpose.** Teach the loop once, in place, without blocking play.

**Must keep holding.** Match-options tip on New Game step 3; Hub tour (Career: board, matchup, prep, lineup, squad, play week; Season: market instead of squad) and the end card; contextual Tactics, Strategy, Advance Season, IGL and review tips. Skippable anytime, replayable from Guide › How to play. The card never covers the heading of what it points at (tall anchors pin the card above the tabbar on phones) and never covers `.igl-call-grid`.

**Implementation.** `src/game/tutorial.js` (copy, anchors), `src/components/TutorialHost.jsx`, `TutorialOverlay.jsx`, `src/game/tutorialScroll.js`. Tests: `test/tutorial.test.mjs`.

## Evidence (composed build)

Checked on the composition of every phase plus the crest system: `npm test` and `npm run build` pass; Playwright at 1440x900 and 390x844 (plus full page) across New Game steps 1–3, Hub (Season, Career, after the regular season), Team (Lineup, Tactics, Strategy, Market, Squad), Compete (Standings, Results, Bracket), Club, Guide and Settings, match setup, draft (ban, pick, Fearless game 2, complete), live match, IGL decision, between games, Result win and loss, review room, Gauntlet and Scenario: axe 0 violations and `scrollWidth` equal to the viewport on every screen, no console errors, no non-opacity animation under reduced motion. The full walkthrough replays at both widths. A whole default Season was played on the build before and after the overhaul to confirm the same screens and outcomes.

## Next actions

1. Land the backend transfers, morale and academy controls through `PlayerActions` (BN-TEAM).
2. Retire the remaining legacy class names (`.card`, `.primary`, `.ghost`, `.table`) by moving MatchDetail, the review room, the walkthrough card and the Guide/About modals onto kit components; then `src/styles.css` holds only base rules.
3. Move `MatchDetail` and the review room fully onto kit Cards and Buttons (they render through the legacy classes today).
4. Re-run `scripts/crest-sheet.mjs` whenever a dataset adds clubs; check 4-character monograms (for example NORD, 5P1T) at 48 px.
