# STABLE — Match Detail Screen: Visual + Interaction Design

> Status: **STABLE**. Locked against the engine shapes in the header brief
> (`GameResult`, per-series `games[]`, home/away side convention). Do not edit
> `src/` to implement this doc; implementation follows it.

## 0. Entry point (how it is reached from Results)

- `Results.jsx` keeps its current list: one `.card.result` per series, newest first,
  with `.result-head` (Week N + `.outcome.win/.loss`), `.result-score`, and the
  existing `<details>Match log</details>`.
- Addition: a **"Match detail →"** control per card (`.ghost` button, right-aligned
  row under the score). Label: `"Match detail →"` for user series, `"Details →"`
  for non-user series. Keyboard-focusable `<button>`, `aria-expanded` toggling.
- Interaction: click expands **inline** below the score (accordion, one open at a
  time; opening a second collapses the first) — no new tab/route, so the App tab
  bar (`Dashboard/Lineup/Tactics/Standings/Results/Market`) never changes.
  A `← Back to results` ghost button at the top of the open detail collapses it.
  Deep-linking/out-of-tab routing is out of scope.
- Non-user series (no `userSide`) get the same layout but labels show
  `homeId vs awayId` instead of `You vs Opp`, and the Coach Read block is hidden
  (nothing to coach).

```
┌ .card.result ─────────────────────────────┐
│ Week 7                    [ WIN ]         │  ← existing .result-head
│   T1  ──  2–1  ──  GEN                   │  ← existing .result-score
│                    [ Match detail → ]     │  ← NEW .ghost button
│ ┌ MatchDetail (expanded, inline) ───────┐ │
│ │ series header │ game tabs │ game card │ │
│ │ [← Back to results]                   │ │
│ └───────────────────────────────────────┘ │
│ ▸ Match log (existing <details>)          │
└───────────────────────────────────────────┘
```

## 1. Layout: Match Detail screen (per-game cards, best-of-3)

Series header (sticky within the open card, not page-sticky):

```
┌ .card.md ───────────────────────────────────────────┐
│ [← Back to results]                                 │
│ Week 7 · T1 (You, Home)  2 – 1  GEN (Away)  [ WIN ] │
│ Games: (1) W 32m · (2) L 28m · (3) W 35m            │  ← game tab strip
├ Game 3 · WIN · 35 min ──────────────────────────────┤
│ ┌ Gold graph ─────────────────────────────────────┐ │
│ │ SVG area chart + zero line + event markers      │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌ Player performance ─────────────────────────────┐ │
│ │ role-aligned You | Opp comparison               │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌ Events ─────────────────────────────────────────┐ │
│ │ chronological list with time + icon             │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌ Coach read ─────────────────────────────────────┐ │
│ │ 1–2 line tactic suggestion for NEXT game        │ │
│ └─────────────────────────────────────────────────┘ │
├ Game 2 · LOSS · 28 min (same 4 blocks) ─────────────┤
├ Game 1 · WIN · 32 min (same 4 blocks) ──────────────┤
└─────────────────────────────────────────────────────┘
```

Rules:

- Series score at top uses the existing `.result-score` pattern:
  `{homeLabel} {aWins}–{bWins} {awayLabel}`, where the user's side is labeled
  `You (T1)` and the other side `GEN`. Winner tag reuses `.outcome.win/.loss`
  from the user's perspective; non-user series show no outcome pill.
- Game order: **most recent game first** (Game 3, 2, 1) so the decisive game is
  visible without scrolling; each game is its own `.card`-nested section
  (`.md-game`) with header `Game N · WIN/LOSS · {durationMin} min`.
- Game tab strip (optional jump links): small `.tab` pills `G1 G2 G3` that
  anchor-scroll to each `.md-game`. Reuses `.tabs/.tab.active` styles.
- Each `.md-game` contains exactly four blocks in order:
  1. GoldGraph, 2. PlayerPerformance, 3. Events list, 4. CoachRead.
- Desktop (≥641px): blocks stack vertically full-width; only the player
  comparison is two-column internally (see §2). No side-by-side blocks —
  graphs need full width.
- Mobile (≤640px): identical order; player comparison stacks (see §5).

ASCII of one game card (desktop):

```
┌ .md-game ──────────────────────────────────────────┐
│ Game 3 · [WIN] · 35 min            You led +4.2k avg│
│ ┌─ Gold ────────────────────────────────────────┐ │
│ │ +8k ┤            ╱╲  ▲ baron 24'               │ │
│ │  0  ┼────────────╱──╲──────────── zero line     │ │
│ │ -8k ┤╲╱         ╱    ◆ dragon 18'              │ │
│ │     └┬──┬──┬──┬──┬──┬── 0' 10' 20' 30' 35'      │ │
│ │ Legend: (green fill) You ahead · (red) Behind  │ │
│ └───────────────────────────────────────────────┘ │
│ ROLE │ YOU (T1)              │ OPP (GEN)           │
│ TOP  │ Zeus 3/2/5 182cs ★…   │ Kiin 2/4/3 165cs …  │
│ … role-aligned rows …                             │
│ ┌─ Events ──┐  ┌─ Coach read ──────────────────┐  │
│ │ 12' tower…│  │ Mid-game dip (−3.1k)… → Early/ │  │
│ └───────────┘  │ Defensive. (simulated)         │  │
└───────────────────────────────────────────────────┘
```

## 2. Component breakdown (props use the locked shapes — no changes)

### 2.1 `MatchDetail`

```jsx
MatchDetail({
  round: number,            // week number
  homeId: string, awayId: string,
  aWins: number, bWins: number,
  userSide: 'home' | 'away' | null,  // null = non-user series
  games: GameResult[],      // 2 or 3 entries, locked shape
  onBack: () => void,
})
```

- Derives: `youWonSeries`, `youAreA = userSide === 'home' || userSide === null
  ? label-as-A : flip`. **Side mapping rule (critical):** the engine's `side`
  `'A'` always means home. If the user is away, every "You" lookup uses
  `side === 'B'`, and gold-diff sign is flipped for display
  (`displayDiff = userIsHome ? diff : -diff`) so "above zero = you ahead"
  always holds. Labels passed down: `youLabel` (`"You (T1)"`), `oppLabel`.
- Renders series header + game tabs + one `GameCard` per game (reverse order).
- Hides `CoachRead` when `userSide == null`.

### 2.2 `GameCard`

```jsx
GameCard({ game: GameResult, youAreA: boolean, youLabel, oppLabel, gameLabel })
```

- Header: `Game {game.game} · {WIN|LOSS} · {durationMin} min` + avg-diff chip
  (`You +4.2k avg` / `You −1.8k avg`, muted).
- Composes `GoldGraph + PlayerPerformance + EventList + CoachRead`.

### 2.3 `GoldGraph`

```jsx
GoldGraph({ timeline: [{t, diff}], events, durationMin, youAreA: boolean })
// timeline: gold(A)−gold(B); flip sign when !youAreA before render.
```

- Hand-built SVG, no library. `viewBox="0 0 600 220"`,
  `preserveAspectRatio="none"` avoided — use `xMidYMid meet` with
  `width:100%; height:auto` so strokes don't distort; fixed height 220px
  desktop / 180px mobile via CSS.
- Scales: x = `t / durationMin`; y symmetric `±maxAbs` (min clamp 3000g) so the
  zero line stays vertically centered.
- Elements: zero-baseline dashed line; area path split into two fills
  (above-zero vs below-zero via clip); main polyline 2px; x ticks at 0/10/20/…
  minutes; y labels `+Nk / −Nk` (thousands); end-state dot + final-diff label.
- Event markers: circles/diamonds positioned at `(t, diffAt(t))` (interpolated
  on the line), `<title>` tooltip with `` `${t}' ${icon} ${note}` ``. Toggles:
  small legend chips act as filters (click to dim a type). Hover enlarges
  marker (r 4→6) and shows tooltip; touch = tap marker.
- Downsampling: if `timeline.length > 200`, stride-sample to ≤200 points.

### 2.4 `PlayerPerformance`

```jsx
PlayerPerformance({ players: [10 × locked player], youAreA: boolean })
// each: {id,name,role,side,kills,deaths,assists,cs,dmgShare,kp,rating,mvp}
```

- Splits into `youPlayers` (user side) and `oppPlayers` (other side), each
  sorted to fixed role order `TOP JNG MID BOT SUP`; rows joined by role so
  TOP-vs-TOP etc. align even if array order varies.
- Desktop: one `.table` with 3 column groups:
  `ROLE | YOU(name KDA CS DMG% KP% rating bar) | OPP(same)`.
  Mobile: two stacked mini-tables (see §5).
- MVP: at most one `★` per game (engine guarantees `mvp:true` on ≤1 player);
  if none, no star is shown (no fallback election).
- Rating bar: 0–10 → width %; numeric label kept (`7.8`).

### 2.5 `EventList`

```jsx
EventList({ events: [{t, type, side, note}], youAreA: boolean })
```

- Sorted ascending by `t`; row: `12' [icon] Tower — You — {note}`.
  Side label mapped through `youAreA` (`You`/`Opp`).
- Reuses `.log` styling; icons are text glyphs (see §3), never emoji images.

### 2.6 `CoachRead`

```jsx
CoachRead({ timeline, userWonGame: boolean, durationMin })
```

- Pure function `coachReadForGame(timeline thirds, userWonGame)`:
  split duration into thirds (early/mid/late), average display-diff per third
  (`e, m, l`). Decision table:
  - `e > +1500 && m < −1000` → lost mid tempo → `Early / Defensive`.
  - `l > +2000 && won` → strong close → `Late`.
  - `e < −1500 && l > 0` → slow start, good comeback → `Balanced / Mid`.
  - `avg < −1500 && lost` → outscaled/outplayed → `Balanced` + honest line.
  - else → trend-following (`ahead early → Early`, `ahead late → Late`).
- Output: 1–2 lines + tactic chips (`Style: X · Phase: Y`) + suffix
  `(simulated)` for honesty. Hidden for non-user series.

## 3. Visual treatment (tokens only — no new palette)

| Element | Treatment |
|---|---|
| Surface | `.md-game` = `var(--panel)` card; inner blocks `var(--panel2)` 10px radius, 1px `var(--line)` border, 12–14px padding |
| Typography | Game header 16px/700; block titles (`Gold`, `Players`, `Events`, `Coach read`) 13px uppercase `var(--muted)` letterspaced; body 14–15px; numbers tabular |
| Gold ahead (you) | Line + fill `var(--good)` `#22c55e`, fill 18% opacity |
| Gold behind | Line + fill `var(--bad)` `#ef4444`, fill 18% opacity |
| Zero line | 1px dashed `#3a4150`; axis labels 11px `var(--muted)` |
| Winner tags | Reuse `.outcome.win/.loss`; game duration `var(--muted)` 13px |
| Event markers | 8px shapes w/ dark stroke: tower `■` `#eab308`, dragon `◆` `var(--good)`, baron `▲` `#a855f7` (sole non-token exception, LoL-baron purple), teamfight `✖` `var(--accent)`, ace `★` `#fff`, kill `●` `var(--muted)` (dimmed to r=3, toggleable, default ON but visually quiet) |
| Rating bar | Track `#0b0e13` 6px radius (matches `.mini-bar`); fill: ≥8 `var(--good)`, 6–8 `var(--warn)`, <6 `var(--muted)`; width `rating*10%` |
| MVP | `★` in `var(--warn)` `#eab308` after name + `MVP` `.badge` (reuse) |
| You columns | Left column header tinted `rgba(34,197,94,.12)`; `tr.me`-like row wash for the user's cells; `You` label `var(--good)` |
| Coach read | Left border 3px `var(--accent)` (matches `.role-head`); tactic chips reuse `.tac-mult` green for suggested style/phase |
| Spacing | 16px between blocks; 10px inner; 8px section margins; matches `.card` rhythm |
| Focus | Visible `:focus-visible` outline `var(--accent)` on detail toggle, tabs, markers |

## 4. Microcopy / labels

- Buttons: `Match detail →` / `← Back to results`; game tabs `G1 G2 G3`;
  events `<summary>` stays `Match log` (untouched).
- Gold axes: x `0' 10' 20' 30'…` + axis caption `Game time (min)`;
  y `+8k / 0 / −8k` + caption `Gold diff (you − opp)` — sign always from the
  user's perspective. Legend: `▔ You ahead (green) · ▔ Behind (red) · - - even`.
  Tooltip: `` `24' ▲ Baron — You: "stole pit at 6k down"` ``.
- Players header: `ROLE | YOU (T1) — KDA CS DMG KP Rating | OPP (GEN) — …`;
  KDA cell `3/2/5`; CS `182`; `DMG 24%`; `KP 68%`; rating `7.8` + bar.
- Events rows: `` `12' ■ Tower — You — took top T1` ``; empty: `No events logged.`
- Coach-read phrasing examples (pick by §2.6 table, always ends `(simulated)`):
  - `"Dominated early (+3.4k) but bled mid (−2.1k). Protect the mid rotation — consider Style: Defensive · Phase: Early. (simulated)"`
  - `"Slow start (−2.0k early) into a strong close (+3.1k late). Trust scaling — consider Style: Balanced · Phase: Late. (simulated)"`
  - `"Out-golded all game (−2.8k avg) in a loss. Nothing to force — consider Style: Balanced · Phase: Mid. (simulated)"`
  - `"Even gold, won on fights. Fine as-is — consider keeping Style/Balanced. (simulated)"`
- Series header: `Week 7 · You (T1) 2–1 GEN · WIN`; non-user: `Week 7 · HLE 1–2 DK`.

## 5. Responsive behavior

- Breakpoint **640px** (matches existing `.plrows` media query — no new value).
- ≥641px: player comparison is a single `.table` (role-aligned columns);
  gold graph 220px tall; events + coach-read stack full-width.
- ≤640px: player table becomes **two stacked `.table`s** — `Your team (by role)`
  then `Opponent (by role)`, each row `ROLE name KDA CS DMG KP rating`;
  graph 180px tall, x-ticks thinned (every 10'); event markers stay tappable
  (min 24px touch target via transparent halo); tabs scroll horizontally.
- `.app` max-width 980px unchanged; detail never scrolls horizontally —
  tables wrap numbers (`white-space: nowrap` on KDA only) and rating bar
  shrinks to 48px min.

## 6. Empty / loading states & acceptance checklist

Empty/loading (engine is synchronous; states are data-driven, not spinners):

| Case | Display |
|---|---|
| No games array / `games.length === 0` | `No game data recorded for this series.` (hint style); graph + players hidden |
| `goldTimeline` empty or 1 point | Graph area shows `No gold data for this game.` + still render events/players |
| `events` empty | `No events logged.` |
| `players` missing a role | Row shows `—` cells for the missing side; never misalign roles |
| Non-user series | CoachRead block omitted entirely (not "N/A") |
| Duration 0 / negative | Render `– min`, clamp graph x-domain to ≥1 min |

Acceptance checklist:

- [ ] Reached from Results via `Match detail →` per card; inline expand/collapse,
      one open at a time; `← Back to results` collapses; no new route/tab.
- [ ] Series header shows `You X–Y Opp` + outcome pill; non-user shows plain score.
- [ ] Every game (2 or 3, newest first) has its own card: winner tag, duration,
      GoldGraph, PlayerPerformance, EventList, CoachRead.
- [ ] Gold graph: zero baseline centered, green-above/red-below fills, axis
      labels (`min`, `±k`, `Gold diff (you − opp)`), event markers with `<title>`
      tooltips showing `note`, legend with type toggles; sign flipped when user
      is away so up = you ahead.
- [ ] Player performance: rows aligned TOP→SUP, both sides show KDA/CS/DMG%/KP%/
      rating-bar+MVP ★; mobile stacks to two tables at ≤640px.
- [ ] Coach read: 1–2 lines derived from early/mid/late thirds, names a Style +
      Phase suggestion, ends `(simulated)`; hidden for non-user series.
- [ ] Only tokens used (`--bg/panel/panel2/line/text/muted/accent/good/bad/warn`
      + `#0b0e13` track + single baron-purple exception); reuses
      `.card/.tabs/.tab/.ghost/.table/.outcome/.log/.badge` conventions.
- [ ] No `src/` file touched; hand-built SVG (no chart dependency); no horizontal
      scroll at 360px width.
