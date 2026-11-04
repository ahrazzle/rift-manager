# Rift Manager: "Broadcast Night" build brief (for grk-smith)

Source of truth for this redesign. It pairs with `CRITIQUE.md` (the why) and `prototypes/*.html` (the what).
- Token and component CSS: `src/base.css`. Copy the values; don't re-derive them.
- Audited build: `ahrazzle/rift-manager` main @ 31e9bc5.
- Scope: visual system, IA and interaction only. No engine or gameplay changes, except one wiring fix (Phase 3, Result stage).

---

## 0. Direction (decided)

| | A · Broadcast Night (**pick**) | B · War Room | C · Hextech Glass |
|---|---|---|---|
| Mood | Neutral dark broadcast package. Content is lit, chrome recedes. | Coach's notebook: warm paper-dark, tactical grid, monospace data | Neon glass, glow, client-like |
| Palette | #0B0F15 / #18202C / #F2F5F8, side #5B9BFF / #FF6B6B, win #3DDC84, gold #F2C14E | #17150F / #EDE6D6, olive #8C9A5B, amber #D9A441, brick #C2553F | #080A18 / #1B2450, cyan #00E5FF, violet #8B5CF6 |
| Type | Barlow Condensed 600/700 + Inter | IBM Plex Sans + IBM Plex Mono | Rajdhani + Exo 2 |

Board: `prototypes/directions.html`.

**Why A:**
- The current UI's core problem is that red means everything: brand, CTA, blue/red side, losses and warnings (Critique #4).
- A fixes this at the token level. The chrome is neutral and every hue has exactly one job, so color becomes information again.
- It keeps the esports broadcast energy through condensed display type and the scorebug, not through glow.
- It passes AA on every surface with margin. It renders cheaply on low-end phones.
- It stays clearly away from official game art, which C does not.
- B is a strong second for a "manager sim" read, but its amber collides with the reward gold, and its olive/brick pair is weak for red-green colorblind players.

---

## 1. Tokens

All values live in `src/base.css` `:root`. Port them 1:1 into `src/styles/tokens.css`.

### 1.1 Color: one job per hue

| Token | Value | Job | Never use for |
|---|---|---|---|
| `--bg` | #0B0F15 | page | |
| `--s1` `--s2` `--s3` | #121822 / #18202C / #1F2936 | card / inset / raised + hover | |
| `--line` | #263040 | decorative dividers | control borders (1.38:1) |
| `--line-strong` | #6B788B | inputs, buttons, cut lines, empty slots | |
| `--text` / `--text-2` / `--text-3` | #F2F5F8 / #B4BDC9 / #8E9AA8 | primary / secondary / meta | |
| `--primary` / `--on-primary` | #F2F5F8 / #0B0F15 | the **one** primary action per view | |
| `--blue` `--blue-bg` | #5B9BFF / #14243D | blue side in draft and match | links, info |
| `--red` `--red-bg` | #FF6B6B / #3A181C | red side in draft and match | errors, losses, CTAs |
| `--win` `--win-bg` | #3DDC84 / #11301F | W pips, ▲ deltas, positive GD | brand |
| `--loss` `--loss-bg` | #FF8577 / #3A1A17 | L pips, ▼ deltas, negative GD | side |
| `--warn` | #FFC857 | needs-attention (readiness, objective up) | rewards |
| `--gold` `--gold-2` `--gold-bg` | #F2C14E / #FFE3A1 / #2E2512 | trophies, MVP, achievements **only** | warnings, money |
| `--focus` | #7CC4FF | focus ring | |
| `--team` | per club (T1 #e2012d) | crests, 3 px "you" row accent, rail active bar | text, buttons |

**Measured contrast** (WCAG 2.1):

- **Body text:**

  | Text | Worst surface | Ratio |
  |---|---|---|
  | `--text-2` | s3 | 7.74 |
  | `--text-3` | s3 | 5.14 (6.71 on bg) |

- **Side colors and outcome chips:**

  | Color | Background | Ratio |
  |---|---|---|
  | blue | blue-bg | 5.62 |
  | blue | s1 | 6.42 |
  | red | red-bg | 5.70 |
  | win | win-bg | 8.03 |
  | loss | loss-bg | 6.62 |
  | gold | gold-bg | 9.01 |
  | warn | s2 | 10.65 |
  | focus | s3 | 7.84 |
  | on-primary | primary | 17.55 |

- **Non-text (3:1 minimum):** `--line-strong` is 4.28 on bg, 3.97 on s1, 3.65 on s2 and 3.28 on s3.
- **Team colors:** some fail as text (e.g. DK #002fa7 on bg), so team color is never used for text. Crests carry a white monogram.

### 1.2 Type

- **Display:** `"Barlow Condensed", "Arial Narrow", "Roboto Condensed", system-ui, sans-serif`
  - Weights 600/700, uppercase, +0.01–0.02em tracking.
  - Use only for headlines, scorelines, the scorebug clock, and team abbreviations at 24 px and up.
- **UI:** `Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
  - Weights 400/500/600/700.
  - Set `font-feature-settings: "tnum" 1` globally so numbers align.
- **Loading:** Google Fonts with `display=swap` and preconnect. Self-host in production; see the asset list.
- **Scale (rem, 16 base):** 12 · 14 · 16 · 18 · 20 · 24 · 32 · 40 · 56 · 72
  - Body is 16/1.5. Dense tables use 14.
  - Labels are 12 / 600 / uppercase / +0.06em in `--text-2`. Never put a label in `--text-3` on s2 or s3 below 14 px.
  - Mobile headline max is 40. Display 72 is reserved for the Result stage on desktop.

### 1.3 Space, radius, elevation, layout

- **Space (4-pt):** 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64. Card padding is 24 on desktop and 16 on mobile. Gap between cards is 24 on desktop and 16 on mobile.
- **Radius:**
  - sm 6: pips, tags
  - md 10: buttons, inputs, tiles
  - lg 16: cards, sheets
  - pill: chips
- **Elevation:**
  - `--e1`: cards
  - `--e2`: scorebug, sticky bars
  - `--e3`: dialogs, bottom sheets, the draft detail bar
  - Elevation is never the only separator. Pair it with a surface step.
- **Layout:**
  - Rail is 232 px and the topbar 64 px.
  - Content max-width is 1360 (matchday 1400, result 960).
  - Breakpoint 900 px: rail → 5-item bottom tabbar, `.desk-only` hidden.
  - Touch targets are at least 44×44.

### 1.4 Motion

| Token | ms | Use |
|---|---|---|
| `--d-instant` | 80 | press feedback |
| `--d-fast` | 140 | hover, tab switch, chip toggle |
| `--d-base` | 220 | panel/feed item enter, sheet slide |
| `--d-slow` | 360 | lock-in pop, headline rise |
| `--d-reward` | 1100 | the one reward sweep (single run, never loops) |

Easings:
- `--ease-out` cubic-bezier(.2,.8,.2,1) for entrances
- `--ease-in-out` (.65,0,.35,1) for map dot travel and progress
- `--ease-spring` (.34,1.56,.64,1) for lock-in only

Rules:
- Motion explains a state change or celebrates a real outcome. It is never ambient decoration. Today's pulsing CTA glow, shimmer and looping confetti are removed (Critique #18).
- `@media (prefers-reduced-motion: reduce)` sets every animation and transition to about 0. The reward sweep is replaced by a static gold ring. Map dots jump instead of gliding.
- No count-up timers or countdowns anywhere. Decisions are untimed (see §3.3).

---

## 2. Component inventory

All are prototyped in `src/base.css` and `src/*.html`. Every interactive state needs default, hover, `:focus-visible` (2 px `--focus` ring with 2 px offset, global) and active, and disabled where noted.

| Component | Variants | States / notes |
|---|---|---|
| **AppShell** | desktop (rail + topbar), mobile (topbar + tabbar), **mode** (full-screen draft/match: back button + title only) | Skip link first in DOM. Main nav hidden in mode. |
| **Rail** | – | Brand, club card (crest, manager, season), 5 nav items with `aria-current="page"` + 3 px team bar, sim speed select pinned bottom (labelled) |
| **Tabbar** (mobile) | 5 items | Active: text color plus a 3 px top bar in `--team`. Fixed with safe-area inset. |
| **Topbar** | – | Context ("Week 3 of 9", split name), **PhaseTrack** (Regional › Playoffs › MSI › Worlds: done/now/next), board chip, budget chip; mobile shows crest + week + overflow (⋯) |
| **Card** | default, hero (gradient tint from team color at 12%), inset | `card-h` (h2 18/600 + quiet action link) |
| **Button** | primary (white), secondary (outlined line-strong), quiet, icon (44²), lg (56 h) | hover, active (+1 px), disabled (text-3, line border, `cursor:not-allowed`; never opacity-only); **max one primary per view** |
| **Chip** | neutral, blue, red, win, loss, gold | static, never interactive |
| **Seg** (segmented / tabs) | toggle group (`aria-pressed`) or tablist (`role=tab`, arrow keys) | selected = s3 + text |
| **Select / Input** | – | 44 h, line-strong border, visible label (or sr-only label) |
| **Meter** | neutral, odds (two-sided), side gold share (blue vs red-bg) | always paired with a number in text |
| **Pips** | W / L / upcoming (dashed) | letter inside, not color-only |
| **Delta** | ▲ win / ▼ loss / – neutral | icon + number + sr-only "places up" |
| **Crest** | 20 / 28 / 32 / 40 / 48 / 132 (trophy) | from `assets/crest-*.svg`; alt="" when the name is adjacent |
| **RoleIcon** | TOP JNG MID BOT SUP | `assets/roles.svg` symbols |
| **ChampGlyph** | 20–72 px | Original monogram tile with a hue from the id hash. **Replaces ddragon portraits.** States: available, selected (text border on the tile), banned (grayscale + "Banned"), picked (grayscale + "Picked"), locked-in (spring pop). |
| **StandingsTable** | compact (hub rail: top 4) / full | "You" row (s2 + 3 px team inset + "You" tag + `aria-current`), playoff cut line (2 px line-strong + "Playoff line" label row), ▲▼ movement, form pips, GD colored by sign |
| **ReadinessItem** | ok (check, win), todo (alert, warn) | Link to the fixing screen; never blocks Play |
| **InboxItem** | info, optional request (Answer / Skip), report | **Press is never a modal** (Critique #7) |
| **OddsBar** | – | neutral bar + "Close match / Favoured / Underdog" + `<details>` "Why 54%" |
| **Scorebug** | desktop, mobile (sticky, compact) | crests, kills, clock (tabular), series score, gold-share meter, towers |
| **MapView** | – | `assets/rift-map.svg` + side dots (initial letter, 22/16 px) + objective ping (warn ring); `role=img` with a text summary |
| **EventFeed** | – | `aria-live=polite`, side bar color + bold actor, newest first |
| **DecisionDialog** | desktop centered / mobile bottom sheet | 3 options with Risk/Reward bars (shape, not color), "No timer" note, "Let the IGL decide" escape, Esc closes, focus to first option |
| **DraftBoard** | desktop 3-col, mobile strip + bottom sheet | turn banner (side-colored left bar + order ribbon), role filter seg, search, pool grid, detail bar (glyph, tags, fit line, role select, Lock in) |
| **ResultStage** | win, loss | see §3.3; loss = same layout, no gold, calm copy + "Open review" |
| **ChangedStrip** | 4 tiles | label / value / delta vs previous |
| **EmptyState** | – | dashed line-strong border, one sentence of cause + the action to fix |
| **BottomSheet / Dialog** | – | scrim rgba(5,8,12,.72), e3, `aria-modal`, focus trap, Esc |

---

## 3. Screens and IA

### 3.1 Navigation (replaces the 7–8 header tabs + "Season Hub" buttons)

The five destinations are the same in every mode. Content adapts by mode. Critique #3.

| Nav | Contains (current tabs → new home) |
|---|---|
| **Hub** | Dashboard (`dashboard`), BoardCard, Preparation summary, inbox (press, scout, board) |
| **Team** | Lineup, Tactics, Strategy, Squad (Career), Market (Season) as a seg: *Lineup · Tactics · Strategy · Squad/Market* |
| **Compete** | Standings, Results, Tournament/Playoffs/MSI/Worlds as a seg: *Standings · Results · Bracket* (+ Gauntlet ladder / Scenario objectives in those modes) |
| **Club** | board objectives, finances, trophies/achievements (locked ones collapsed to a count, Critique #17), save/new game |
| **Guide** | Guide.jsx, settings (sim speed duplicate, motion, map display) |

- **Draft and Matchday are modes, not tabs.** Entered from the Hub CTA, they hide the nav and have a single "Back" (with a confirm if it leaves mid-series).
- The topbar always shows **where you are in the season**: PhaseTrack, plus the week that is *next to play* (fixes the "Week 2/9 while showing week 1 result" mismatch, Critique #11).
- Gauntlet and Scenario must not inherit Season chrome. Swap the PhaseTrack for the gauntlet ladder or scenario objective.

### 3.2 Hub (`prototypes/hub.html`)

1. **Hero:** "Next match · Best of 3". Crests, records, OddsBar + "Why 54%", readiness row (3 items), then **Play week 3** (primary, lg) and "Review strategy" (quiet). On mobile the hero is the first thing under the topbar and Play sits above the fold at 390×844.
2. **Starting five:** role, name, OVR, form delta. Links to Team › Lineup.
3. **This week's fixtures:** five rows, yours first.
4. **Right rail** (stacks below on mobile): LCK table top 4 with the cut line, inbox, fan hype meter (informational only, no streak language).
5. **Removed:** dev/debug text, the duplicate "Season Hub" buttons, the long add-on explanation (moved to Guide).

### 3.3 Draft (`prototypes/draft.html`)

- **Desktop:** blue column | centre | red column.
  - Each side column shows a header (crest, side chip), 5 ban slots (slash in the side color), and 5 pick slots that show the player and role.
  - The active slot is highlighted in its side color.
- **Turn banner:** "Your pick · Pick 2 of 5" + open roles + the opponent's comp so far. A 20-step order ribbon shows bans (short) and picks (tall). **No timer.** The AI turn shows "Their coach is deciding" for about 0.9 s.
- **Pool:**
  - Role seg + search, with an empty state for no matches.
  - Tiles are 92 px minimum. Each tile carries a phase tag, role badge and name.
  - Banned and picked tiles are disabled, with state text on the tile and in the accessible name.
- **Detail bar** (sticky bottom, e3): glyph, roles/phase/styles chips, a fit line ("Adds poke to your comp. Goes to Faker (MID)."), a role select when ambiguous, and **Lock in {name}**.
- **Mobile:**
  - Sticky two-row strip (picks and 3 bans per side) under the mode bar.
  - Icon-only role seg (sr-only labels), 4-col pool.
  - The detail becomes a fixed bottom sheet with a full-width Lock in.
- **Order:** standard 6 bans → B1 R1 R2 B2 B3 R3 → 4 bans → R4 B4 B5 R5 (matches `game/draft.js`, verified).
- **Done state:** "Draft complete" + **Start game 1**. "Auto-draft rest" is a quiet action for players who don't want to draft.

### 3.4 Matchday: live (`prototypes/match.html#live`)

- **Mode bar:** back, "Week 3 · LCK", pause/play (`aria-pressed`), speed seg 1×/2×/4×, "Skip to result" (quiet).
- **Scorebug:**
  - T1 9 · 18:42 · 5 GEN, with series state "T1 leads 1–0" and "Game 2".
  - Gold share meter + towers.
  - Sticky on mobile.
- **Grid 7/5:**
  - MapView (role=img summary, legend).
  - Objectives table (dragons, grubs, herald, towers, baron) + **decision callout** ("Baron is up. Oner wants your call. The game pauses while you decide.").
  - Play-by-play feed.
- **Player strip:** 5 cards with KDA (champion hidden at 390).
- **Removed from the live screen:** the main nav, the map display settings (moved to Guide › Settings), and disabled tabs.

### 3.5 Matchday: IGL decision (`#decision`)

- Dialog (mobile bottom sheet), titled "Baron is up. How do we play it?" with one line of context.
- **3 options:** Bold / Measured / Safe, each with one sentence of trade-off and Risk/Reward bars (3 bars, filled = text-2; shape carries the meaning, not color).
- Footer: "No timer." plus which ratings drive the odds, and **Let Oner decide** (escape hatch).
- After the choice, the outcome is posted to the feed and the callout turns into a confirmation.

### 3.6 Matchday: result (`#result`): the reward moment

- **Hero** (gold-bg radial):
  - `assets/trophy.svg` crest with **one** gold rim sweep: conic mask, 1100 ms, `--ease-out`, 250 ms delay, then a static gold ring.
  - Eyebrow "Series won · Week 3", H1 "T1 beat Gen.G", crests + "2 – 0".
  - **Continue** (primary) + "Review the series".
- **What changed:** Standings (1st, held), Board trust 68 ▲4, Fan hype 70 ▲8, Keria form 66 ▲5. Values come from state diffs, never invented.
- **MVP card:** gold chip, glyph, one sentence that credits the player's decision ("Your Baron call in game 2 started the swing"), KDA + kill share.
- **Games list** + "Up next: HLE · Week 4". Information only, no countdown.
- **Loss variant:** no trophy and no gold. H1 "Gen.G took it 2–1", the same changed strip (▼ in loss color), and the MVP slot becomes "What to look at", linking to the Review Room.
- **Anti-patterns banned:** streak counters, "don't break your streak", "come back tomorrow" nudges, loot-box reveals, auto-advancing timers.

### 3.7 Compete › Standings (`prototypes/standings.html`)

- **Seg:** Standings · Results · Bracket (tablist, arrow keys).
- **Table:** position, crest + name, W–L, GD (signed, colored), form pips (hidden at 390), movement ▲▼.
  - Playoff line after 4th (top-4: 1v4, 2v3 BO3 + BO3 final, per `engine/season.js`).
  - "You" row highlighted.
  - A `<caption>` that names the cut.
- **Side:**
  - **Playoff picture** ("if it ended today", seeded semis + final TBD), which turns the bracket into a projection every week (Critique #15).
  - **What's at stake** (cut distance, board goal, this week's opponent).

### 3.8 Not prototyped (apply the system)

- **New game:** a 3-step wizard (Mode → Team → Options), not one long form (Critique #10). Every select gets a label (fixes the axe `select-name` violation).
- **Team › Squad:** a card grid on mobile; on desktop a table with sticky name column.
- **Team › Lineup:** chips wrap (fixes scrollWidth 552 at 390).
- **IGL panel in MatchDetail:** becomes DecisionDialog.
- **PressModal:** becomes an InboxItem with optional Answer/Skip. Never blocks Continue.

---

## 4. Asset list (`assets/` is the only source)

| File | Use | Notes |
|---|---|---|
| `assets/icons.svg` | sprite: `i-hub i-team i-compete i-club i-more i-check i-alert i-play i-pause i-search i-up i-down i-mail i-ban i-arrow i-star` | 24 grid, 2 px stroke, `currentColor` |
| `assets/roles.svg` | sprite: `role-TOP role-JNG role-MID role-BOT role-SUP` | original geometric marks, not Riot's role icons |
| `assets/crest-{T1,GEN,HLE,DK,KT,KDF,DRX,NS,BRO,FOX}.svg` | team crests | monogram shields in the team colors from `src/data`; **not** official logos. Add the remaining leagues by the same template (shield path + `fill` + 2–3 letter monogram). |
| `assets/trophy.svg` | result hero, Club trophies | gold laurel + cup; reward-only |
| `assets/rift-map.svg` | MapView | abstract 3-lane square, blue base bottom-left, red top-right; not the game's minimap |
| Fonts | Barlow Condensed 600/700, Inter 400–700 | Self-host WOFF2 under `assets/fonts/` in production (OFL) and preload Inter 400 + Barlow 700. Prototypes use Google Fonts. |

**Remove:** `DDRAGON_URL` and all `ddragon` portrait usage (`game/draft.js:28`, `components/Draft.jsx`). Champion art is Riot IP and loads from a third-party CDN. Use ChampGlyph. The `ddragon` field in `data/champions.js` can stay as dead data or be dropped.

---

## 5. Phased migration plan

Each phase ships on its own and leaves the app working. Verify every phase with Playwright shots at 1440 and 390 + axe (0 violations), plus mobile Lighthouse with Accessibility ≥95.

### Phase 1: Tokens and primitives (no layout change)
- Create `src/styles/tokens.css` from `base.css :root`. Import it first in `main.jsx`.
- **Map old to new in `styles.css`:**

  | Old token | New token |
  |---|---|
  | `--bg0` | `--bg` |
  | `--bg1` / `--panel` | `--s1` |
  | `--panel2` | `--s2` |
  | `--panel3` | `--s3` |
  | `--muted` | `--text-2` |
  | `--faint` | `--text-3` (fixes contrast) |
  | `--good` | `--win` |
  | `--bad` | `--loss` |
  | `--radius` 14 | `--r-lg` 16 |

  Then remove the old names.
- **`--accent` (#e2012d): split by usage:**
  - CTA backgrounds → `--primary` / `--on-primary`
  - side-red → `--red`
  - "you" highlights → `--team`
  - links → `--text` underline
  - errors → `--loss`
  
  Grep: `rg -n "var\(--accent" src`.
- **Gold:** `--gold` #f5b301 → `--gold` #F2C14E, and audit that it's only used on trophies, MVP and achievements. Money uses `--text`.
- **Primitives:** add `.btn .chip .seg .card .pip .meter .table` from base.css. Add the global `:focus-visible` ring and skip link. Keep the existing reduced-motion block (styles.css:804) and extend it with `scroll-behavior` and the reward override.
- **Fonts:** load them and set the display family on headings/scoreline classes.
- **Fix:** footer contrast, `heading-order`, `landmark-one-main` (wrap the tab content in `<main>`), `select-name` (year select, new-game selects).

### Phase 2: Shell and IA
- Rewrite the header in `App.jsx` (lines ~170–280) into `AppShell` + `Rail` + `Topbar` + `Tabbar`. The `nav` arrays become the 5 destinations; old tab ids become sub-routes:
  - `lineup|tactics|strategy|squad|market` → `team/*`
  - `standings|results|tournament` → `compete/*`
- Each destination with sub-pages gets a `Seg` component.
- Move the speed select, How to Play and New Game out of the header (Rail footer / Club / Guide; mobile overflow ⋯).
- Add PhaseTrack. Correct the week label to the next week to play.
- Gauntlet/Scenario variants of the topbar.
- **Delete dead code:** `components/ModesDashboard.jsx`, `components/WatchLive.jsx` (not imported).

### Phase 3: Hub and Result (the loop)
- `Dashboard.jsx` (625 lines) is split into `HubHero` (OddsBar, Readiness, CTA), `StartingFive`, `Fixtures`, `TableMini`, `Inbox`.
- `BoardCard.jsx` and `Preparation.jsx` fold into Inbox and Readiness.
- `PressModal.jsx` becomes `InboxItem` (optional); remove the blocking modal after Return.
- **Result stage:** promote `Matchday.jsx`'s verdict screen into `ResultStage`, and **wire it** by setting the matchday/result flag when a series finishes (today `setMatchday(true)` is never called in `Dashboard.jsx`). Scroll to top on entry.
- **Motion:** replace confetti with the trophy sweep. Build ChangedStrip from a snapshot of standings, board, hype and form taken before the series.

### Phase 4: Draft
- `Draft.jsx` (309 lines): the layout becomes DraftBoard, `champPortrait()` becomes `ChampGlyph`, and the role filter + search + detail bar are added. Add a mobile strip + bottom sheet.
- Keep `game/draft.js` order and AI. Remove `DDRAGON_URL`.

### Phase 5: Matchday
- `MatchExperience.jsx` / `MatchDetail.jsx` (499 lines) become a mode screen: Scorebug, MapView (`AnimatedRift.jsx` restyled to the asset map + side dots, honoring reduced motion), Objectives, EventFeed and the player strip.
- `match.css` (126 lines) is folded into components.
- The IGL panel becomes DecisionDialog (untimed, escape hatch).
- `MatchOptions.jsx` map settings move to Guide › Settings. `MatchReview.jsx` is reached from ResultStage "Review".

### Phase 6: Compete, Team, Club, New game
- `Standings.jsx`: cut line row, movement, GD, caption, playoff picture.
- `Tournament.jsx`: a real bracket (columns + connectors) under Compete › Bracket.
- `Results.jsx`: becomes Compete › Results.
- `Squad.jsx`, `Lineup.jsx`: card grid at mobile; chips wrap.
- `management.css` (62 lines) is folded in.
- `NewGame.jsx`: a 3-step wizard.
- `CareerModals.jsx`, `ConfirmDialog.jsx`: use the Dialog primitive.
- `Gauntlet.jsx`, `Campaign.jsx`: mode-specific topbar.

### Phase 7: Cleanup
- Delete the remaining legacy rules in `styles.css` (target: under 300 lines of app-level CSS on top of tokens and primitives).
- Remove unused keyframes (glow pulses, shimmer).
- Run a final audit at 1440 and 390.

---

## 6. Acceptance checks per screen
- At 390, `document.documentElement.scrollWidth === 390`.
- The primary action is visible above the fold at 390×844 (Hub Play, Draft Lock in, Result Continue).
- axe shows 0 violations with wcag2a + wcag2aa + best-practice.
- Keyboard only: every action is reachable, the focus ring is visible, and dialogs trap focus and close on Esc.
- With `prefers-reduced-motion: reduce`, nothing moves more than an opacity fade.
- No color-only meaning: pips carry a letter, deltas an arrow, risk shows bars, and side is also given as text.
