// Compete (Broadcast Night Phase 6a): Standings, Results and Bracket render
// tests plus the derived-data model (movement, form, GD) they stand on.
// Run: node test/compete-ui.test.mjs
import { mkdtemp, rm } from 'node:fs/promises'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { reducer, mulberry32, orderStandings } from '../src/game/useGameState.js'

Math.random = mulberry32(4242)
globalThis.window ??= { addEventListener() {}, removeEventListener() {} } // Tournament's N / right-arrow listener
let failures = 0
const check = (c, m) => { if (!c) { console.error('FAIL:', m); failures++ } else console.log('ok  :', m) }
const temp = await mkdtemp(new URL('./.compete-ui-', import.meta.url).pathname)
const textOf = (node) => typeof node === 'string' ? node : (node.children || []).map(textOf).join('')
const cls = (n) => (typeof n.props?.className === 'string' ? n.props.className.split(/\s+/) : [])
const byClass = (root, c) => root.findAll((n) => typeof n.type === 'string' && cls(n).includes(c))

const bundle = async (entry) => {
  const out = `${temp}/${entry.replaceAll('/', '-')}.js`
  await build({ entryPoints: [`src/components/${entry}`], outfile: out, bundle: true, format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic' })
  return await import(out)
}

try {
  const model = await bundle('compete/model.js')
  const { default: Standings } = await bundle('Standings.jsx')
  const { default: Results } = await bundle('Results.jsx')
  const { default: Tournament } = await bundle('Tournament.jsx')

  const season = () => reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', managerName: 'T' })
  const play = (s, n) => { for (let i = 0; i < n; i++) s = reducer(s, { type: 'PLAY_ROUND' }); return s }
  let tree
  const render = async (el) => act(async () => { if (tree) tree.update(el); else tree = create(el) })

  // ---------- model: derived tables must agree with the engine ----------
  const mid = play(season(), 5)
  const rebuilt = model.tableThrough(mid, 5).map((r) => r.teamId)
  const engine = orderStandings(mid.standings).map((r) => r.teamId)
  check(JSON.stringify(rebuilt) === JSON.stringify(engine), 'tableThrough(last round) reproduces the engine order')
  const rows = model.standingRows(mid)
  check(rows.length === 10 && rows[0].rank === 1, 'standingRows: ranked rows for the league')
  check(rows.every((r) => r.gd === mid.standings[r.teamId].gameWins - mid.standings[r.teamId].gameLosses), 'standingRows: GD is game wins minus losses')
  check(rows.every((r) => r.form.length === Math.min(5, mid.standings[r.teamId].W + mid.standings[r.teamId].L)), 'standingRows: form has one pip per played series, max 5')
  check(rows.every((r) => r.move != null), 'standingRows: movement known from week 2 on')
  check(model.standingRows(play(season(), 1)).every((r) => r.move == null), 'standingRows: no movement after week 1 (nothing to compare, nothing invented)')
  check(model.standingRows(season()).every((r) => r.form.length === 0 && r.move == null), 'standingRows: preseason has no form and no movement')
  const prev = model.tableThrough(mid, 4).map((r) => r.teamId)
  const t1 = rows.find((r) => r.teamId === 'T1')
  check(t1.move === prev.indexOf('T1') + 1 - t1.rank, 'standingRows: movement equals previous rank minus current rank')

  // ---------- Standings render ----------
  await render(React.createElement(Standings, { state: mid }))
  const table = tree.root.findAllByType('table')[0]
  check(table != null, 'Standings: renders a <table>')
  const caption = tree.root.findAllByType('caption')[0]
  check(caption && /after 4th place/i.test(textOf(caption)) && /top 4/i.test(textOf(caption)), 'Standings: caption names the playoff cut')
  const trs = tree.root.findAllByType('tr')
  const cutRow = trs.find((r) => cls(r).includes('cmp-cutrow'))
  check(cutRow && /Playoff line/.test(textOf(cutRow)), 'Standings: labelled playoff line row')
  const bodyRows = trs.filter((r) => cls(r).includes('cmp-row'))
  check(cls(bodyRows[3]).includes('cut') && trs.indexOf(cutRow) === trs.indexOf(bodyRows[3]) + 1, 'Standings: cut line sits directly after 4th')
  const you = bodyRows.filter((r) => cls(r).includes('you'))
  check(you.length === 1 && you[0].props['aria-current'] === 'true' && /You/.test(textOf(you[0])), 'Standings: exactly one You row with aria-current and a You tag')
  const gdCells = byClass(tree.root, 'c-gd').filter((n) => n.type === 'td')
  check(gdCells.every((c, i) => { const g = rows[i].gd; const t = textOf(c); return g > 0 ? t.startsWith('+') && cls(c).includes('is-pos') : g < 0 ? t.startsWith('−') && cls(c).includes('is-neg') : t === '0' }), 'Standings: GD carries a sign in text as well as color')
  check(textOf(tree.root).includes('Playoff picture') && textOf(tree.root).includes('If it ended today'), 'Standings: playoff picture, "if it ended today"')
  check(textOf(tree.root).includes('Winner SF1') && textOf(tree.root).includes('Winner SF2'), 'Standings: final is TBD (Winner SF1 / SF2)')
  check(textOf(tree.root).includes('At stake') || textOf(tree.root).includes('at stake'), 'Standings: What’s at stake panel')
  check(textOf(tree.root).includes('Board goal') && /This week/.test(textOf(tree.root)), 'Standings: stake lines cover board goal and this week’s opponent')
  check(tree.root.findAllByType('h1').length === 0, 'Standings: no h1 of its own (the shell page header owns it)')
  check(tree.root.findAll((n) => n.props?.role === 'tablist').length === 0, 'Standings: no tabs of its own')
  check(textOf(tree.root).includes('Download PNG'), 'Standings: Download PNG kept')
  // semis seeded 1v4 and 2v3 from the live table
  const pic = model.playoffPicture(mid, rows)
  check(pic.semis[0][0].teamId === rows[0].teamId && pic.semis[0][1].teamId === rows[3].teamId && pic.semis[1][0].teamId === rows[1].teamId && pic.semis[1][1].teamId === rows[2].teamId, 'playoffPicture: semis are 1v4 and 2v3')

  // Preseason: no movement column at all
  await render(React.createElement(Standings, { state: season() }))
  check(!/Movement is since last week/.test(textOf(tree.root)), 'Standings: week 0 has no movement note')

  // ---------- Results ----------
  await render(React.createElement(Results, { state: mid }))
  const series = byClass(tree.root, 'cmp-series')
  check(series.length === mid.results.length, 'Results: one row per series')
  const mine = series.filter((n) => cls(n).includes('is-you'))
  check(mine.length === mid.results.filter((r) => r.isUser).length && mine.every((n) => n.props['aria-current'] === 'true' && /(Win|Loss)/.test(textOf(n))), 'Results: your series highlighted, with Win/Loss in words')
  check(tree.root.findAllByType('h1').length === 0, 'Results: no h1')
  await render(React.createElement(Results, { state: season() }))
  check(/No matches played yet/.test(textOf(tree.root)), 'Results: empty state')

  // ---------- Bracket (regional playoffs) ----------
  let fin = play(season(), 9)
  check(fin.tournament?.kind === 'playoffs', 'precondition: playoffs bracket exists after week 9')
  const dispatched = []
  await render(React.createElement(Tournament, { state: fin, dispatch: (a) => dispatched.push(a) }))
  const cols = byClass(tree.root, 'cmp-br-col')
  check(cols.length === 2, 'Bracket: playoffs render 2 round columns (SF, Final)')
  check(cols.every((c) => /BO3/.test(textOf(c))), 'Bracket: every round header carries its BO length')
  check(byClass(tree.root, 'cmp-br-slot').filter((n) => n.type === 'li').length === 3, 'Bracket: 2 semis + 1 final')
  check(byClass(tree.root, 'cmp-br-feed').length === 1, 'Bracket: the final has an incoming connector')
  check(byClass(tree.root, 'cmp-br-slot').some((n) => cls(n).includes('on-path')), 'Bracket: your series is on the highlighted path')
  check(tree.root.findAll((n) => n.props?.role === 'region' && n.props.tabIndex === 0).length === 1, 'Bracket: scroll container is a labelled, focusable region')
  const enter = tree.root.findAllByType('button').find((b) => /Enter next match/.test(textOf(b)))
  check(enter != null, 'Bracket: Enter next match kept')
  await act(async () => { enter.props.onClick() })
  check(dispatched.at(-1)?.type === 'PREVIEW_MATCH' && dispatched.at(-1).action.type === 'PLAY_TOURNAMENT_ROUND', 'Bracket: Enter next match dispatches the same action')
  const own = tree.root.findAllByType('button').find((b) => /Enter match/.test(textOf(b)))
  await act(async () => { own.props.onClick() })
  check(dispatched.at(-1).action.matchIndex === fin.tournament.rounds[0].matches.findIndex((m) => m.isUser), 'Bracket: per-match Enter dispatches with its matchIndex')
  check(tree.root.findAllByType('select').length === 1, 'Bracket: resolver select kept')
  check(tree.root.findAllByType('h1').length === 0, 'Bracket: no h1')

  // decided matches: winner in text + check, seeds on playoffs
  let done = reducer(fin, { type: 'PLAY_TOURNAMENT_ROUND' })
  await render(React.createElement(Tournament, { state: done, dispatch: () => {} }))
  check(byClass(tree.root, 'is-winner').length === 2, 'Bracket: each decided semifinal marks one winner')
  check(/\(won\)/.test(textOf(tree.root)), 'Bracket: winners are announced in text, not color alone')
  check(byClass(tree.root, 'cmp-mt-seed').length >= 4, 'Bracket: playoff seeds shown')

  // MSI: three columns, champion chip at the end
  let msi = done
  let g = 0
  while (msi.tournament.status === 'active' && g++ < 5) msi = reducer(msi, { type: 'PLAY_TOURNAMENT_ROUND' })
  msi = reducer(msi, { type: 'BUILD_TOURNAMENT', kind: 'msi' })
  await render(React.createElement(Tournament, { state: msi, dispatch: () => {} }))
  check(byClass(tree.root, 'cmp-br-col').length === 3, 'Bracket: MSI renders 3 columns (QF, SF, Final)')
  check(byClass(tree.root, 'cmp-br-feed').length === 3, 'Bracket: MSI has connectors into SF and Final')
  g = 0
  while (msi.tournament.status === 'active' && g++ < 5) msi = reducer(msi, { type: 'PLAY_TOURNAMENT_ROUND' })
  await render(React.createElement(Tournament, { state: msi, dispatch: () => {} }))
  check(/Champion:/.test(textOf(tree.root)) && byClass(tree.root, 'chip-gold').length === 1, 'Bracket: finished event shows one gold champion chip')
} finally {
  await rm(temp, { recursive: true, force: true })
}

if (failures > 0) { console.error(`${failures} FAILURE(S)`); process.exit(1) }
console.log('compete-ui: all passed')
