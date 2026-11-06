# Broadcast Night UI kit

Shared React components for every Broadcast Night screen. Import from `src/components/ui/index.js`:

```jsx
import { Button, Card, Chip, Seg, Pips, Delta, Meter, EmptyState, Dialog, BottomSheet, Icon, RoleIcon } from '../ui/index.js'
```

Styles come from `src/styles/primitives.css` (`.btn .chip .seg .pip .meter`) and `src/styles/ui.css`. Both use the tokens in `tokens.css` only. Build on them; do not fork values. If you need something the kit lacks, build it in your lane folder and say so in your report so the loom can promote it.

Color rule: one job per hue. Blue and red mean sides (draft and match only). Win and loss mean outcomes. Gold means trophies, MVP and achievements. Warn means "needs attention". Team color is for crests and thin "you" accents, never text.

## Components

**Button**: `variant` primary | secondary (default) | quiet; `size` md | lg; `icon` (sprite name); `iconOnly` + `label` for a 44px icon button; `href` renders a link. One primary per view.
```jsx
<Button variant="primary" size="lg" icon="play" onClick={play}>Play week 3</Button>
<Button variant="quiet" icon="more" iconOnly label="More options" />
```

**Card**: `variant` default | hero (team-tinted) | inset; `title` (h2, 18/600), `titleAs`, `eyebrow`, `action` (right of the title). With a title it renders a labelled `<section>`.
```jsx
<Card title="Starting five" action={<Button variant="quiet" onClick={() => setTab('lineup')}>Manage lineup</Button>}>…</Card>
```

**Chip**: static, never interactive. `tone` neutral | blue | red | win | loss | gold | warn; optional `icon`.
```jsx
<Chip tone="gold" icon="star">MVP</Chip>
```

**Seg**: segmented control. `variant="toggle"` (default) is a group of `aria-pressed` buttons for filters. `variant="tabs"` is a tablist with roving tabindex and arrow keys (Left/Right, Home/End select). Props: `name`, `items` `[{ id, label, tour? }]`, `value`, `onChange`, `label` (accessible name), `panelId`, `fill` (equal-width columns). Pair tabs with a panel that uses `segTabId(name, value)`.
```jsx
<Seg variant="tabs" name="draft-role" label="Role filter" items={roles} value={role} onChange={setRole} panelId="pool" />
<div role="tabpanel" id="pool" aria-labelledby={segTabId('draft-role', role)}>…</div>
```

**Pips**: form pips with the letter inside. `results` is an array of `'W' | 'L' | null` (null is an upcoming game, drawn dashed). `label` prefixes the screen-reader summary.
```jsx
<Pips results={['W', 'W', 'L', null]} label="Gen.G form" />
```

**Delta**: ▲ / ▼ / – with the number and a spoken phrase. Positive `value` means better. `unit` is read aloud; `suffix` is shown.
```jsx
<Delta value={2} unit="places" />   // ▲ 2, "up 2 places"
```

**Meter**: always paired with a number in text. `variant="neutral"`: `value`, `max`, `label`, `valueText`. `variant="split"`: two-sided bar, `value` is the left share 0..100, `leftLabel`, `rightLabel`, optional centre `label`. `hideText` only when the number is printed elsewhere.
```jsx
<Meter label="Board confidence" value={64} valueText="64 / 100" />
<Meter variant="split" value={54} leftLabel="T1" rightLabel="GEN" label="Close match" />
```

**EmptyState**: dashed box. One sentence of cause as children, the fixing action in `action`, optional `title` and `icon`.
```jsx
<EmptyState action={<Button onClick={clear}>Clear search</Button>}>No champion matches “zz”.</EmptyState>
```

**Dialog / BottomSheet**: one primitive. Centered on desktop, bottom sheet under 900px (`sheet="always"` forces a sheet, `sheet="never"` keeps it centered). Scrim, `aria-modal`, focus trap, Esc closes, focus moves to `initialFocusRef` or the first control, and returns to the opener on close. Render it only while open. Props: `title` (required), `description`, `onClose`, `actions`, `size` sm | md | lg, `dismissible` (default true). It portals to `document.body`.
```jsx
{open && (
  <Dialog title="Baron is up. How do we play it?" onClose={close}
    actions={<><Button variant="quiet" onClick={close}>Let the IGL decide</Button><Button variant="primary" onClick={go}>Lock in</Button></>}>
    …
  </Dialog>
)}
```

**Icon / RoleIcon**: inline SVGs from `src/assets/ui/icons.svg` and `roles.svg` (copies of `docs/design/broadcast-night/assets`). Decorative (`aria-hidden`) unless you pass `title`. Icon names: `hub team compete club guide more settings check alert play pause search up down mail ban arrow star back close`. Roles: `TOP JNG MID BOT SUP`.
```jsx
<Icon name="check" size={16} />  <RoleIcon role="MID" title="Mid" />
```

## Shell contract (for screen lanes)

The shell (`src/components/shell/`) owns the chrome. Screens render inside it unchanged.

- **Navigation.** Internal tab ids stay flat: `dashboard lineup tactics strategy market squad standings results tournament campaign club guide settings`. `setTab('lineup')` jumps straight to Team › Lineup; the shell maps ids to destinations in `shell/nav.js` (`navFor(state)`, `resolveRoute`). To add a segment, add its id to the destination's `tabs` in `navFor` and a label in `TAB_LABELS`; App renders the screen for that id.
- **Page title and segments.** For Team, Compete, Club and Guide, App renders `<PageHeader>` above your screen: a display `<h1>` (the destination), a one-line context, and the destination's `Seg` tablist on the right. Your screen is inside `role="tabpanel"`. So screens do **not** render an `<h1>` or their own sub-page tabs; start with cards and `<h2>`. The Hub has no visible header (an sr-only `<h1>Hub</h1>`), matching the prototype. Page-level actions go in `PageHeader`'s `actions` slot (a one-line prop in App; the loom merges it) or in the first row of your screen.
- **Mode screens (Draft, Matchday).** While `state.matchSession` is set, the shell hides the nav and shows a mode bar: Back + title. Defaults come from the session: title `T1 vs GEN`, subtitle `LCK · Week 3 · Draft · Game 1`; Back exists in `setup` (cancels) and `result` (closes). Override from your screen:
  ```jsx
  import { useModeBar, ModeBarActions } from '../shell/index.js'
  useModeBar({ title: 'T1 vs GEN', subtitle: 'Game 2 · Live', backLabel: 'Leave', onBack: confirmLeave, backHidden: false })
  <ModeBarActions><Button variant="quiet" icon="pause" iconOnly label="Pause" /></ModeBarActions>
  ```
  `useModeBar` takes strings/booleans plus an `onBack` function (read from a ref, so a fresh arrow each render is fine). It resets when your component unmounts. `ModeBarActions` portals into the right side of the bar. The mode bar is not sticky, so your own sticky scorebug can sit at `top: 0`.
- **Layout.** Content column `.shell-content`: max-width 1360px, padding 32px (16px under 900px), centered beside the 232px rail. Mode screens get max-width 1400px; on `.stage-map` / `.stage-decision` the column is full width (kept from the old arena layout). Card gap 24px desktop / 16px mobile. Breakpoint 900px: rail → bottom tabbar (64px + safe-area). Nothing of yours may be `position: fixed` at the bottom under 900px without adding `calc(var(--tabbar) + env(safe-area-inset-bottom))`. Sticky things inside the page sit below `var(--topbar)` (64px, 56px under 900px).
- **Team color.** The shell sets `--team` on the app root from the managed club's color. Use it for crests, the 3px "you" bar and similar thin accents only.
- **Walkthrough anchors.** `tour-team-nav` (Team nav item, rail and tabbar), `tour-board` (topbar board chip on desktop, Club tab on mobile), `tour-tactics-tab` / `tour-strategy-tab` (Team segment tabs). Screens keep their own: `tour-matchup tour-prep tour-play-week tour-advance-season tour-igl-decision tour-review tour-match-options`. The overlay picks the first anchor that is laid out, so desktop/mobile duplicates are fine.
