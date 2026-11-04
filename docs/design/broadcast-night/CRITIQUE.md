# Rift Manager: UX/UI critique

Build audited: `main` @ 31e9bc5 (== `update/staging`), run locally with `vite preview`.
Live: https://lolsim.askaconsult.com/ · Staging: https://lck-manager-staging.vercel.app/
Evidence: `audit/NN-name-{1440,390}.png` (Playwright; 390 is 390x844 @2x), `audit/axe-results.json`, `lighthouse/*.report.html`.
Flow covered: New game → Season + Draft + IGL → press → every tab → Play Week → setup → draft → live map → IGL call → between games → result → press → results/standings → fast-forward → playoffs. Also Career/Squad, Scenario, Gauntlet, and Season with add-ons off.

Each finding has a **name**, the **harm** to the player, and the **fix**. They are ordered by severity.

---

## Top findings

### 1. "The win that never lands": the reward moment is unreachable
- **Evidence:** `22-match-result-1440.png`, `23-match-result-full-1440.png`, `31-matchday-noaddons-1440.png`, `seq-after-return-0..1.png`.
- **What happens:**
  - Winning a series shows a plain card: "MATCH COMPLETE / T1 wins 2–0. / Return to season →". On a 5,240 px page it has the same weight as every other panel.
  - With add-ons on, the viewport stays scrolled into MatchDetail, so the card is off-screen.
  - Return goes straight into the press-conference modal and then the next week's preview.
  - `Matchday.jsx` has a confetti verdict screen, but `Dashboard.jsx` never calls `setMatchday(true)`. The celebration is dead code.
- **Harm:** The core loop (prepare → play → result) has no payoff. Wins and losses feel identical, and the player can't tell what the result changed (table position, board trust, form).
- **Fix:**
  - Add a dedicated full-viewport Result stage. It shows the scoreline, a "what changed" strip (table move, board, form), the series MVP, and one primary Continue.
  - On a win, play a one-shot gold rim sweep and crest lift. It lasts under 1.2 s, doesn't loop, and becomes static under reduced motion.
  - Losses get the same layout with a calm tone and a pointer to the Review Room.
  - See `prototypes/match.html` (Result tab).

### 2. "Phone tax": mobile hides the game under the chrome
- **Evidence:** `05-dashboard-preview-390.png`, `17-rift-map-live-390.png`, `06-tab-lineup-390.png`.
- **What happens:**
  - The header stacks: brand, speed select, How to Play, New Game, board strip, and two rows of 7 tabs, taking about 300 css px.
  - Play Week first appears around 827 css px, just at or below the fold.
  - On the live match, the map starts about 760 css px down, under disabled tabs and the "Map display" settings.
  - Lineup overflows horizontally: `scrollWidth` is 552 on a 390 viewport (`axe-results.json`), because contract, morale and wage chips don't wrap.
- **Harm:** On a phone you scroll before every action and pan sideways to read your own roster. The live map, the most exciting screen, opens below the fold.
- **Fix:**
  - Use a 56 px top bar on mobile: team crest, week, and an overflow menu holding speed, guide and new game.
  - Add a 5-item bottom tab bar.
  - Hide the nav entirely during a match. A match is its own full-screen mode with one Leave control.
  - Let player chips wrap into a 2-column meta grid.
  - Add `min-width: 0` to the card grid.

### 3. "Two navs, neither honest": nav is flat, stays visible but disabled, and duplicates itself
- **Evidence:** `05`, `13-match-setup-1440.png`, `15-draft-start-1440.png`, `19-igl-decision-1440.png`, `29-season-end-dashboard-1440.png`, `30-tournament-1440.png`, `35-gauntlet-1440.png`.
- **What happens:**
  - There are 7–8 top-level tabs. Lineup, Tactics and Strategy are three tabs for what is one pre-match decision.
  - In a match the tabs stay on screen but disabled.
  - The phase stepper (Regional/Playoffs/MSI/Worlds/Done) is drawn as tab-shaped chips but isn't interactive.
  - In playoffs, the Dashboard and the new Playoffs tab render the same bracket.
  - Gauntlet mode still shows "managing T1 · LCK · Week 1/9 · Win the title · Board 60". That chrome belongs to Season mode.
- **Harm:** The player can't tell what's clickable, where to prepare, or what mode they're in. Disabled tabs look broken rather than intentional.
- **Fix:**
  - Use five destinations: **Hub · Team** (Lineup + Tactics + Strategy as sub-sections) **· Compete** (Standings, Results, Bracket) **· Market/Club · Guide**.
  - Draw the phase stepper as a progress track (dots and a line), not as buttons.
  - The header context strip should come from the mode: Gauntlet shows "Run 1 · Round 1/5"; Scenario shows the node.
  - Hide the nav during a match.

### 4. "Red means everything": color carries no meaning
- **Evidence:** `05`, `15-draft-start-1440.png`, `16-draft-mid-1440.png`, `29`, `30`, `33-career-squad-1440.png`.
- **What happens:**
  - Accent red `#e2012d` is used for the brand, every primary button, the active tab, the user's team tile, "VS" glyphs, link text, and the draft role pills under "Your comp · **Blue**".
  - The opponent tile uses its own team color. Fox is green `#22c55e`, the same green as "95% win" and "WIN" badges.
  - The playoff page has three equal red primaries (Enter next match, Watch match, Enter match). Squad has six red "Hire" buttons.
- **Harm:**
  - The player can't read side (blue/red), outcome (good/bad), or priority (the one thing to do next) from color.
  - Red text on panels is 3.73:1, which fails AA for body text.
- **Fix:**
  - Use neutral chrome and a white primary button, with **one** primary per view.
  - Side colors (blue `#5B9BFF`, red `#FF6B6B`) appear only in draft and match.
  - Win/loss green/red is used only for outcomes.
  - Gold is reserved for reward and trophy.
  - Team colors show only on crests, never on text.

### 5. "Draft by spreadsheet": the most strategic screen has the least information design
- **Evidence:** `15-draft-start-1440.png`, `16-draft-mid-1440.png`, `17-draft-complete-1440.png`, `15/16 @390`.
- **What happens:**
  - The pick order is a row of tiny B/P chips with no side and no "who's on the clock" signal.
  - Bans are about 16 px thumbnails.
  - The champion pool is a nested 430 px scroll box inside the page scroll.
  - Picking opens a second role-picker modal, even though `champions.js` already lists each champion's roles.
  - On mobile both comps stack above the pool, so you scroll about 2,300 css px to reach a champion.
  - Portraits come from Riot Data Dragon, which is official art.
- **Harm:** Drafting is slow and error-prone. The player can't see the matchup forming, and the pick/ban rhythm (the tension) is lost. The official art is also a licensing risk.
- **Fix:**
  - Lay the board out as a sides-facing split: blue on the left, red on the right, bans as rows of 5 per side.
  - Add a single turn banner: "Your pick · Blue · 4 of 10".
  - The pool fills the remaining space with role filters and search. Tiles show original monogram glyphs with a phase tag.
  - Selecting a champion opens an inline detail and a Lock in button. The role is inferred from `roles[0]`, with a one-tap override.
  - On mobile, a compact 2-row draft strip stays sticky above the pool, and Lock in sits in a bottom sheet.
  - There is no countdown timer, so no fake urgency.

### 6. "Hub without a headline": dashboard hierarchy is inverted
- **Evidence:** `05-dashboard-preview-1440.png` (full), `12-focus-visible-check-1440.png`, `25-dashboard-after-match-1440.png`.
- **What happens:** The page order is:
  1. A non-interactive phase card
  2. The matchup card, where Play Week is the 9th element
  3. The "Coach's Office" with a marketing-style headline ("Win the week before match day.")
  4. A trophy cabinet of 15 **locked** achievements, then fixtures
  
  Other problems:
  - At 1440 the content is a 1020 px column with about 420 px of dead margin on each side.
  - "Fan hype · Cautious" is a red→amber bar with no scale.
  - The last-five-series pips are empty dots that read as decoration.
- **Harm:** The one decision that matters every week (am I ready, then play) competes with decoration. The locked trophies are a wall of "not yet" every week, which is mildly discouraging and not information.
- **Fix:** Use a 12-column hub.
  - **Next match** hero: crests, win estimate, readiness checklist (Lineup ✓ / Tactics ✓ / Strategy ✓) and Play.
  - A right rail for the table snippet and inbox (board, press).
  - Week fixtures below.
  - Move trophies to Club and show only earned ones there, with locked ones collapsed into a count.
  - Label hype with a scale (Cold → Electric) and a number.

### 7. "Interruptions that aren't choices": press conference
- **Evidence:** `04-press-preseason-1440.png`, `24-press-conference-1440.png`.
- **What happens:**
  - A modal fires preseason and after every match, asking the same question ("How do you rate your team's form heading into this week?").
  - "Confident" gives +2 hype, +3 board and +2 morale, so it strictly dominates the other answers.
- **Harm:** It's a forced click with no real trade-off. It blocks the result moment and trains players to mash the first button.
- **Fix:**
  - Make it a non-blocking Inbox item on the Hub with a visible "Skip" that costs nothing.
  - Vary the questions by context (after a win, a loss, an upset).
  - Make the options trade-offs (e.g. hype up and pressure up). This is a design-side request; balancing is for the game designer.

### 8. "Low-ink text and weak focus": readability and keyboard access
- **Evidence:** `axe-results.json` and Lighthouse `before-mobile-run1.report.html` (Accessibility 87). The axe sweep flagged the color-contrast rule on every screen, plus `select-name` on New Game. `12-focus-visible-check-1440.png`.
- **What happens:**
  - Contrast math for the tokens:
    - `--faint #5b6675` is 3.44:1 on bg0, 3.14 on panel and 2.74 on panel3. It's used 9× for meta text (axe also flagged the footer).
    - Accent red text is 3.73:1 on panel.
    - `--line #232d3d` borders are 1.38:1, so control boundaries are nearly invisible (WCAG 1.4.11 asks for 3:1).
  - Most buttons have no `:focus-visible` style. Focus on a tab is a faint 1 px light border (shot 12).
  - The sim-speed `<select>` has no label.
  - There's no `<main>` landmark, and heading order skips.
  - Most body text is 11–13 px.
- **Harm:** Low-vision players and anyone on a bright screen lose the meta text (form, contract, factors). Keyboard players lose their place.
- **Fix:**
  - Text tokens should be at least 4.5:1 on every surface (see SPEC tokens). Control borders at least 3:1.
  - Add a global `:focus-visible` ring: 2 px of `--focus` with a 2 px offset.
  - Set a 14 px body minimum and 12 px only for uppercase labels at 600 weight.
  - Use `<main>`, labelled selects, and sequential headings.

---

## Secondary findings

| # | Name | Evidence | Harm | Fix |
|---|---|---|---|---|
| 9 | Dev text in UI | `01-newgame-default` ("All names live in src/data/lck.js") | Breaks immersion and looks unfinished | Remove it; move to README |
| 10 | Mode-first form | `01` @390 is 2,567 css px tall; the default mode is Career but the CTA label changes per mode | Long scroll before play, and the CTA is unclear | A 3-step new-game flow (Mode → Team → Options) with a sticky CTA |
| 11 | Week counter lies | `31-matchday-noaddons-1440`: header says "Week 2/9" while showing the Week 1 result | The player's mental model of time breaks | The header shows the week being viewed; it advances after Continue |
| 12 | IGL squeezed | `19-igl-decision-1440` | A key decision is cramped into a side column, and disabled playback controls are low-contrast | Show the decision as a centered overlay on the paused map, with 2–3 option cards (risk/reward lines) |
| 13 | Standings without stakes | `28-standings-after-1440` | Rank colors only explained in legend text; no cut lines, no movement, no form | Draw the top-2/top-4 cut lines, add ▲▼ movement and last-5 form pips, and pin the user row |
| 14 | Bracket isn't a bracket | `30-tournament-1440` | A vertical list of cards; the final is hidden; "YOUR MATCH" is a 9 px label | Use a 2-column bracket with connector lines. The user's path is highlighted and gets one primary action |
| 15 | Squad is a wall | `33-career-squad-1440` (3,345 px) | Staff, coach trades and the transfer market sit on one page, with 6 red "Hire" buttons and no comparison against the current coach | Use sub-tabs (Roster · Staff · Market), compare-against-current deltas (+0.6 vs kkOma) and a ghost Hire |
| 16 | Empty states that look broken | `05` last-five pips; `results` tab before week 1 | Blank dots and an empty list without guidance | Use explicit empty copy ("No series yet. Your first is Week 1 vs FOX") with an action |
| 17 | Locked-trophy wall | `05` | 15 padlocks shown every week | Show earned trophies only; locked ones as a count in Club |
| 18 | Motion is decoration only | `rise` entrance on every card | Motion doesn't explain state changes such as a pick locking or a result landing | Use motion for state change only (see SPEC motion). Reduced-motion is already honored globally; keep that |

## What's already good (keep)
- `prefers-reduced-motion` is handled globally (styles.css:804) and the map auto-pauses.
- The "Why 95%? top factors" explainer is the right instinct; promote it.
- The Review Room post-match analysis has good content; it needs a better entry point, not a rewrite.
- Performance is excellent: Lighthouse mobile Performance is 98–99 and LCP 0.8 s.

## Lighthouse (mobile, before)
| Target | Perf | A11y | Best Pr. | SEO |
|---|---|---|---|---|
| Local build (`vite preview`), run 1/2 | 99/99 | 87/87 | 96/96 | 91/91 |
| Live lolsim.askaconsult.com | 98 | 87 | 96 | 100 |
| Staging vercel | 97 | 87 | 96 | 100 |

Lighthouse only audits the first screen (New Game). In-game screens were checked with axe-core instead (see `audit/axe-results.json`).
