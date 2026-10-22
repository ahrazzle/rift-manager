# P0 UX Design — Stage-Gated Bracket, Dilemma Events, PNG Export (Leo, LOCKED)

Code-free schema/component contract for P0 items 1/4/6 (from `similar-games-research.md`).
Ownership split: `p0-engine-design.md` owns `tournament.resolver` / `forcedWinner` / `games[]`
per-match detail. This doc owns only the UX/state surface below. No engine changes here.

Requires: `npm install html2canvas` (for §3).

---

## 1. Stage-gated bracket reveal + keyboard + manual-resolver UI

**Problem today:** `Tournament.jsx` renders `t.rounds.map(...)` all-at-once (QF/SF/F
visible with TBD slots); `PLAY_TOURNAMENT_ROUND` already sims exactly one round
(`useGameState.js` finds first round with an undecided match, sims it, feeds winners
forward). So gating is purely presentational + one counter.

### 1a. State addition (in `useGameState.js` reducer)

```js
// buildTournamentObject: add
revealedRounds: 1, // QF visible at build; SF/F render as locked placeholders
```

- `PLAY_TOURNAMENT_ROUND`: after computing `rounds/status/championId`, return
  `tournament: { ...t, rounds, status, championId, revealedRounds: Math.min(t.revealedRounds + 1, 3) }`.
- `load()` backfill for old saves: `if (parsed.tournament && parsed.tournament.revealedRounds == null) parsed.tournament.revealedRounds = 3`.
- No other reducer changes. Engine-owned `resolver`/`forcedWinner` (see engine doc)
  ride on the same tournament object; this counter is orthogonal.

### 1b. `Tournament.jsx` changes

```jsx
// Replace t.rounds.map(...) with:
const visible = t.rounds.slice(0, t.revealedRounds ?? 3);
{visible.map((round) => ( /* existing round block unchanged */ ))}
{t.revealedRounds < 3 && t.status === 'active' && (
  <p className="hint">🔒 {3 - t.revealedRounds} round(s) locked — sim to reveal.</p>
)}
```

- The existing Play/Simulate button becomes the "Next round" button (same
  `playRound` → `dispatch({ type: 'PLAY_TOURNAMENT_ROUND' })`, same `busy` guard,
  same `userInRound ? 'Play …' : 'Simulate …'` label). No second button.
- `current` derivation unchanged (first round with `!m.winner`); it always lies
  inside `visible` because sim order == reveal order.

### 1c. Keyboard stepping

```jsx
import { useEffect } from 'react'

useEffect(() => {
  function onKey(e) {
    if (e.key !== 'n' && e.key !== 'N' && e.key !== 'ArrowRight') return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (!current || busy || t.status !== 'active') return;
    // skip when a manual-resolver match in the current round is still undecided
    // (user must click a winner first — see §1d)
    playRound();
  }
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [current, busy, t.status]);
```

- Keys: `n` / `N` / `ArrowRight`. Ignore when focus is in a form field.
- Add hint text under the button: `Press N or → to sim the round.`
- Listener lives in `Tournament.jsx`, cleaned up on unmount (return above).
  Dashboard embeds `<Tournament>` for the active bracket, so no second listener.

### 1d. Manual-resolver UI (engine doc owns `resolver` + `SET_TOURNAMENT_WINNER`)

When `t.resolver === 'manual'` (selector UI owned by engine doc), each **undecided,
revealed** match renders two winner buttons instead of `vs`:

```jsx
{t.resolver === 'manual' && !match.winner && match.homeId && match.awayId && (
  <div className="actions">
    <button className="primary" onClick={() =>
      dispatch({ type: 'SET_TOURNAMENT_WINNER', roundIndex: ri, matchIndex: i, winnerId: match.homeId })}>
      {nameOf(state, match.homeId)} →
    </button>
    <button className="primary" onClick={() =>
      dispatch({ type: 'SET_TOURNAMENT_WINNER', roundIndex: ri, matchIndex: i, winnerId: match.awayId })}>
      {nameOf(state, match.awayId)} →
    </button>
  </div>
)}
```

- Needs `ri`/`i` indices: change the round block to `visible.map((round, ri) => … round.matches.map((m, i) => …))` and pass `roundIndex`/`matchIndex` into `MatchCard`.
- `PLAY_TOURNAMENT_ROUND` must skip matches with a `forcedWinner` (engine doc);
  the round button stays enabled and sims whatever is still undecided.
- MatchDetail expand + `isUser` badge unchanged.

---

## 2. Career dilemma events (`pendingEvent` + `RESOLVE_EVENT`)

Pure state transforms. Engine untouched.

### 2a. `src/data/events.js` — locked shape

```js
// One event = { id, title, description, chance (0..1 weight), options: [Option, Option] }
// Option = { label, oddsText, detail, apply: (draft) => { log } }
// apply mutates a draft slice { teams, form, lineup? } and returns a log string.
// Randomness resolves INSIDE apply via Math.random() so odds text stays honest.
export const DILEMMA_EVENTS = [
  {
    id: 'wrist-injury',
    title: 'Star player wrist injury',
    description: 'Your starting mid laner reports wrist pain before the split.',
    chance: 0.4,
    options: [
      {
        label: 'Rest the split (-3 OVR, misses season)',
        oddsText: '100%: -3 OVR to {player}, season over for them',
        detail: 'Safe. They recover for next season.',
        apply: (draft, playerId) => { /* ovr -3 on playerId; returns log */ },
      },
      {
        label: 'Play through it (50% recover, else worse)',
        oddsText: '50% full recovery · 50% -5 OVR + form crash',
        detail: 'Coin flip. Champion mentality or career-shortening gamble.',
        apply: (draft, playerId) => { /* Math.random() < 0.5 ? heal : ovr -5, form 20; returns log */ },
      },
    ],
  },
  {
    id: 'locker-room-conflict',
    title: 'Locker-room conflict',
    description: 'Two starters clash over shotcalling. The room picks sides.',
    chance: 0.3,
    options: [
      {
        label: 'Back the veteran (rookie -2 OVR, form +)',
        oddsText: '100%: rookie -2 OVR, veteran +5 form',
        detail: 'Order restored, at a development cost.',
        apply: (draft, playerId) => { /* … */ },
      },
      {
        label: 'Back the rookie (50/50: +2 or -2 OVR team ripple)',
        oddsText: '50% rookie +2 OVR · 50% veteran -2 OVR',
        detail: 'Bet on the future. Veterans have long memories.',
        apply: (draft, playerId) => { /* … */ },
      },
    ],
  },
  {
    id: 'betting-scandal',
    title: 'Betting scandal rumor',
    description: 'A tabloid links your substitute to a betting ring. Unproven.',
    chance: 0.3,
    options: [
      {
        label: 'Suspend immediately (safe, -form across roster)',
        oddsText: '100%: all starters -3 form, story dies',
        detail: 'Boring. Effective.',
        apply: (draft, playerId) => { /* … */ },
      },
      {
        label: 'Deny and play on (75% nothing / 25% scandal: random starter -4 OVR)',
        oddsText: '75% no effect · 25% random starter -4 OVR',
        detail: 'Three-to-one odds. Tabloids love denials.',
        apply: (draft, playerId) => { /* … */ },
      },
    ],
  },
];
```

Rules: exactly 2 options per event; every option shows `oddsText` verbatim in UI;
`apply` is the only place randomness lives; `playerId` = event target, picked by
the reducer (random starter from managed roster), never by UI.

### 2b. Reducer — two cases in `useGameState.js`

```js
// State: top-level pendingEvent: null | { eventId, playerId }
// Backfill in load(): if (!('pendingEvent' in parsed)) parsed.pendingEvent = null;

// In ADVANCE_SEASON, after building the reset state (before return):
//   with ~35% probability and a non-empty managed roster:
//   pendingEvent = { eventId: weightedPick(DILEMMA_EVENTS), playerId: randomStarterId }
// Gate: if (state.pendingEvent) return state; // resolve first — blocks season advance, never blocks RETIRE.

case 'RESOLVE_EVENT': {
  // action: { optionIndex: 0 | 1 }
  // Guards: mode === 'career', career active, state.pendingEvent != null,
  //   event = DILEMMA_EVENTS.find(e => e.id === pendingEvent.eventId), option exists.
  // Clone teams/form, run option.apply(draft, pendingEvent.playerId) inside try/catch
  //   (a throwing apply = no-op except clearing pendingEvent? NO — on throw, return state unchanged).
  // Append apply's log string to results? No — events have no results entry.
  //   Career log: none exists; surface via `state.lastEventLog = log` (transient, overwritten next event).
  // Return { ...state, teams, form, pendingEvent: null, lastEventLog: log }.
}
```

Notes: `ADVANCE_SEASON`'s existing guards (international active, max seasons)
stay first; the pendingEvent gate goes with them. `RESOLVE_EVENT` touches only
`teams` (ovr edits), `form`, `pendingEvent`, `lastEventLog` — never standings,
schedule, or tournament. Retired careers: `isRetired` guard like other actions.

### 2c. UI placement — modal in `Squad.jsx` (career-only screen)

```jsx
// Top of Squad's <div className="stack">, before "1. My Staff":
{state.pendingEvent && <EventModal state={state} dispatch={dispatch} />}

function EventModal({ state, dispatch }) {
  const ev = DILEMMA_EVENTS.find((e) => e.id === state.pendingEvent.eventId);
  const p = (state.teams[state.teamId] || []).find((x) => x.id === state.pendingEvent.playerId);
  if (!ev) return null;
  return (
    <div className="card modal" role="dialog" aria-modal="true" aria-label={ev.title}>
      <h2>⚠️ {ev.title}</h2>
      <p>{ev.description}</p>
      {p && <p className="hint">Involved: {p.name} (OVR {p.ovr}, {p.role})</p>}
      {ev.options.map((o, i) => (
        <div key={i} className="fa-card">
          <div className="fa-top"><span className="fa-name">{o.label}</span></div>
          <p className="hint">Odds: {o.oddsText}</p>
          <p>{o.detail}</p>
          <button className="primary" onClick={() => dispatch({ type: 'RESOLVE_EVENT', optionIndex: i })}>
            Choose →
          </button>
        </div>
      ))}
    </div>
  );
}
```

- Blocking: modal renders until resolved; Squad is the career tab so the player
  meets it in the natural post-advance flow. No Dashboard changes.
- After resolve, show `state.lastEventLog` one-shot hint at top of Squad
  (`{state.lastEventLog && <p className="hint">{state.lastEventLog}</p>}` —
  cleared on next `RESOLVE_EVENT`, harmless if it lingers).
- Event pool lives in `src/data/events.js`; UI imports it directly (no prop drilling).

---

## 3. Shareable PNG export (`exportPng` + 3 buttons)

### 3a. Util — `src/utils/exportPng.js` (new file)

```js
import html2canvas from 'html2canvas';

// Captures a rendered card node and triggers a PNG download.
// elementRef: React ref object pointing at the card DOM node.
// filename: e.g. 'lck-standings.png' (extension added if missing).
// Returns Promise<void>; throws on capture failure (caller shows hint).
export async function exportPng(elementRef, filename) {
  const node = elementRef?.current;
  if (!node) throw new Error('Nothing to export yet');
  const name = filename.endsWith('.png') ? filename : `${filename}.png`;
  const canvas = await html2canvas(node, { backgroundColor: '#10141b', scale: 2 });
  const a = document.createElement('a');
  a.download = name;
  a.href = canvas.toDataURL('image/png');
  a.click();
}
```

Caller pattern (identical at all 3 sites):

```jsx
import { useRef, useState } from 'react';
import { exportPng } from '../utils/exportPng.js';

const shotRef = useRef(null);
const [shotErr, setShotErr] = useState(null);
// …
<div className="card" ref={shotRef}> {/* existing card content */} </div>
<button className="ghost" onClick={async () => {
  setShotErr(null);
  try { await exportPng(shotRef, 'lck-standings-s1.png'); }
  catch { setShotErr('Export failed — try again.'); }
}}>Download PNG ⬇</button>
{shotErr && <p className="hint">{shotErr}</p>}
```

### 3b. The 3 button placements (minimal — card + ref + button only)

1. **Season final Standings** — `Standings.jsx`: attach `ref={shotRef}` to the
   outer `<div className="card">`; button under the table next to the
   `W = series wins…` hint. Filename: `'lck-standings.png'`. (Season mode's
   shareable artifact; works in career too — same component.)
2. **Career history** — `App.jsx` `CareerEpitaph`: ref on the outer
   `<div className="card">` wrapping the history table; button after the table,
   before `New Game →`. Filename: `'lck-career-history.png'`.
3. **Multi-league final Tournament result** — `Tournament.jsx`: ref on the
   header card (title + champion line); button inside that card, rendered only
   when `t.status === 'done'`. Filename: `` `lck-${t.kind}-bracket.png` ``
   (`lck-msi-bracket.png` / `lck-worlds-bracket.png`).
