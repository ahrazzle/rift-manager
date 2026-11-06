// Broadcast Night shell + UI kit: IA mapping, topbar context, and kit renders.
// Browser-only behavior (layout, focus trap in a real DOM, axe) is covered by
// the Playwright runs; this suite pins the contracts other lanes build on.
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { renderToString } from 'react-dom/server'
import { reducer } from '../src/game/useGameState.js'
import { SAVE_KEY } from '../src/game/persistence.js'
import {
  navFor, resolveRoute, destinationOf, seasonContext, phaseTrack, gauntletTrack, shellKind, TAB_LABELS,
} from '../src/components/shell/nav.js'
import { hubStepsForMode } from '../src/game/tutorial.js'

const textOf = (node) => (typeof node === 'string' ? node : (node.children || []).map(textOf).join(''))

// ---------- IA: flat tab ids map onto five destinations ----------
const season = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1' })
const nav = navFor(season)
assert.deepEqual(nav.map((d) => d.id), ['hub', 'team', 'compete', 'club', 'guide'])
assert.deepEqual(destinationOf(nav, 'lineup').tabs, ['lineup', 'tactics', 'strategy', 'market'])
assert.deepEqual(destinationOf(nav, 'standings').tabs, ['standings', 'results'])
for (const id of ['dashboard', 'lineup', 'tactics', 'strategy', 'market', 'standings', 'results', 'club', 'guide', 'settings']) {
  assert.equal(resolveRoute(nav, id).tab, id, `${id} resolves to itself`)
  assert.ok(TAB_LABELS[id], `${id} has a label`)
}
assert.equal(resolveRoute(nav, 'team').tab, 'lineup', 'a destination id opens its first segment')
assert.equal(resolveRoute(nav, 'squad').tab, 'dashboard', 'Squad is Career-only; Season falls back to the Hub')
assert.equal(resolveRoute(nav, 'tournament').tab, 'dashboard', 'no bracket before the tournament exists')

const career = reducer(undefined, { type: 'START_CAREER', teamId: 'T1', managerName: 'Shell' })
assert.equal(shellKind(career), 'career')
assert.deepEqual(destinationOf(navFor(career), 'squad').tabs, ['lineup', 'tactics', 'strategy', 'squad'])

let finished = season
while (!finished.finished) finished = reducer(finished, { type: 'PLAY_ROUND' })
assert.ok(destinationOf(navFor(finished), 'tournament'), 'Compete › Bracket appears with the playoffs')
assert.deepEqual(phaseTrack(finished).map((s) => s.status), ['done', 'now', 'next', 'next'])
assert.equal(seasonContext(finished).primary, 'Playoffs', 'no clamped "Week 9 of 9" after the regular season')

// Week label = the week next to play (state.round), never clamped past the end.
const ctx1 = seasonContext(season)
assert.equal(`${ctx1.primary} ${ctx1.secondary}`, `Week 1 of ${season.totalRounds}`)
const after1 = reducer(season, { type: 'PLAY_ROUND' })
assert.equal(seasonContext(after1).primary, 'Week 2')

// Gauntlet ladder replaces the season track.
const gauntlet = reducer(reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', mode: 'gauntlet' }), { type: 'GAUNTLET_START' })
assert.equal(shellKind(gauntlet), 'gauntlet')
if (gauntlet.gauntlet) {
  const steps = gauntletTrack(gauntlet)
  assert.equal(steps.length, gauntlet.gauntlet.target)
  assert.equal(steps[0].status, 'now')
}

// Walkthrough: nav steps point at the shell's Team anchor.
for (const mode of ['season', 'career']) {
  const steps = hubStepsForMode(mode)
  for (const key of ['lineup', mode === 'season' ? 'market' : 'squad']) {
    assert.equal(steps.find((s) => s.key === key).anchor, 'tour-team-nav')
  }
  assert.equal(steps.find((s) => s.key === 'board').anchor, 'tour-board')
}

// ---------- Rendered shell + kit ----------
const temp = await mkdtemp(new URL('./.shell-', import.meta.url).pathname)
let tree
try {
  await build({
    entryPoints: ['src/App.jsx', 'src/components/ui/index.js'],
    outdir: temp, bundle: true, format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic',
    loader: { '.md': 'text', '.webp': 'file' },
  })
  const { default: App } = await import(`${temp}/App.js`)
  const ui = await import(`${temp}/components/ui/index.js`)

  // App shell markup: skip link first, one main, nav anchors, week label.
  globalThis.localStorage = { getItem: (k) => (k === SAVE_KEY ? JSON.stringify(after1) : null), setItem() {} }
  const html = renderToString(React.createElement(App))
  assert.match(html, /^<div class="app broadcast-shell[^"]*"[^>]*><a class="skip" href="#main-content">/, "skip link is first in the DOM")
  assert.equal((html.match(/<main /g) || []).length, 1)
  assert.match(html, /<main id="main-content"/)
  assert.match(html, /data-tour="tour-team-nav"/)
  assert.match(html, /data-tour="tour-board"/)
  assert.match(html, /Week 2<span class="faint"> (<!-- -->)?of 9<\/span>/)
  assert.match(html, /<h1 class="sr-only">Hub<\/h1>/)
  assert.match(html, /<label class="label" for="sim-speed-select">Sim speed<\/label>/)
  assert.doesNotMatch(html, /How to Play<\/button>/, 'How to Play left the header')

  // Mode bar replaces the nav while a match session runs.
  const preview = reducer(after1, { type: 'PREVIEW_MATCH', action: { type: 'PLAY_ROUND' } })
  globalThis.localStorage = { getItem: (k) => (k === SAVE_KEY ? JSON.stringify(preview) : null), setItem() {} }
  const mode = renderToString(React.createElement(App))
  assert.match(mode, /shell--mode/)
  assert.doesNotMatch(mode, /shell-nav|shell-tabbar/)
  assert.match(mode, /<strong>[A-Z0-9]+ vs [A-Z0-9]+<\/strong>/)
  assert.match(mode, /Week 2 · Match setup/)
  assert.match(mode, />Back<\/button>/)

  // Seg tablist: roving tabindex + arrow keys select.
  let value = 'a'
  const items = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }]
  const render = () => React.createElement(ui.Seg, { variant: 'tabs', name: 't', label: 'T', items, value, onChange: (v) => { value = v }, panelId: 'p' })
  await act(async () => { tree = create(render()) })
  const tabs = () => tree.root.findAll((n) => n.props.role === 'tab')
  assert.deepEqual(tabs().map((t) => t.props.tabIndex), [0, -1, -1])
  assert.equal(tabs()[0].props['aria-controls'], 'p')
  assert.equal(tabs()[0].props.id, ui.segTabId('t', 'a'))
  await act(async () => tabs()[0].props.onKeyDown({ key: 'ArrowLeft', preventDefault() {} }))
  assert.equal(value, 'c', 'ArrowLeft wraps to the last tab')
  await act(async () => tree.update(render()))
  await act(async () => tabs()[2].props.onKeyDown({ key: 'Home', preventDefault() {} }))
  assert.equal(value, 'a')
  await act(async () => tree.unmount())
  tree = null

  // Toggle variant uses aria-pressed.
  const toggle = renderToString(React.createElement(ui.Seg, { items, value: 'b', label: 'Filter' }))
  assert.match(toggle, /role="group"/)
  assert.match(toggle, /aria-pressed="true"[^>]*>B</)

  // Pips: letter inside, summary for screen readers.
  const pips = renderToString(React.createElement(ui.Pips, { results: ['W', 'L', null], label: 'Form' }))
  assert.match(pips, /Form: win, loss, upcoming/)
  assert.match(pips, /class="pip w"[^>]*>W</)
  assert.match(pips, /class="pip n"/)

  // Delta: glyph + number + spoken phrase.
  const up = renderToString(React.createElement(ui.Delta, { value: 2, unit: 'places' }))
  assert.match(up, /ui-delta--up/)
  assert.match(up, /up 2 places/)
  assert.match(renderToString(React.createElement(ui.Delta, { value: 0 })), /no change/)

  // Meter always prints its number.
  assert.match(renderToString(React.createElement(ui.Meter, { label: 'Board confidence', value: 64 })), />64</)
  assert.match(renderToString(React.createElement(ui.Meter, { variant: 'split', value: 54, leftLabel: 'T1', rightLabel: 'GEN' })), /54%[\s\S]*46%/)

  // Button: icon-only buttons are named; max one primary is a convention.
  const iconBtn = renderToString(React.createElement(ui.Button, { icon: 'more', iconOnly: true, label: 'More' }))
  assert.match(iconBtn, /aria-label="More"/)
  assert.match(iconBtn, /class="btn icon-btn"/)

  // Card with a title is a labelled section.
  const card = renderToString(React.createElement(ui.Card, { title: 'Starting five' }, 'x'))
  assert.match(card, /<section class="ui-card" aria-labelledby="([^"]+)"[\s\S]*<h2 id="\1">Starting five<\/h2>/)

  // Dialog: named, modal, close button, Esc wired through onClose.
  let closed = 0
  await act(async () => {
    tree = create(React.createElement(ui.Dialog, { title: 'More', onClose: () => { closed++ } }, 'body'))
  })
  const dlg = tree.root.find((n) => n.props.role === 'dialog')
  assert.equal(dlg.props['aria-modal'], 'true')
  const named = tree.root.find((n) => n.props.id === dlg.props['aria-labelledby'])
  assert.equal(textOf(named), 'More')
  await act(async () => tree.root.find((n) => n.props['aria-label'] === 'Close' && n.type === 'button').props.onClick())
  assert.equal(closed, 1)
  await act(async () => tree.unmount())
  tree = null

  // Icons render inline without a sprite on the page.
  assert.match(renderToString(React.createElement(ui.Icon, { name: 'hub' })), /<svg[^>]*aria-hidden="true"[^>]*><path/)
  assert.match(renderToString(React.createElement(ui.RoleIcon, { role: 'MID', title: 'Mid' })), /role="img" aria-label="Mid"/)

  console.log('Shell IA, topbar context, mode bar and UI kit checks passed')
} finally {
  if (tree) await act(async () => tree.unmount())
  delete globalThis.localStorage
  await rm(temp, { recursive: true, force: true })
}
