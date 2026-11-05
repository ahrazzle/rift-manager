// Development visibility UI: component render tests for the merged #34 feature.
// Ported from the render section of the parallel Cayde build (local branch
// feat/development-visibility, never pushed) and adapted to #34's merged UI:
// plain-word outlook chips (no emoji), "Off-season report · split N complete",
// academy modal "Pot N", Season note "no annual player growth".
// The growthOutlook purity checks live in development-visibility.test.mjs
// with #34's thresholds; this suite only asserts what renders, where.
// Run: node test/development-visibility-ui.test.mjs
import { mkdtemp, rm } from 'node:fs/promises'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { reducer, mulberry32 } from '../src/game/useGameState.js'
import { buildAcademyPlayer } from '../src/data/academy.js'

Math.random = mulberry32(909)
let failures = 0
const check = (c, m) => { if (!c) { console.error('FAIL:', m); failures++ } else console.log('ok  :', m) }
const temp = await mkdtemp(new URL('./.dev-vis-ui-', import.meta.url).pathname)
const textOf = (node) => typeof node === 'string' ? node : (node.children || []).map(textOf).join('')
// Outlook chips are plain words on main (rising / steady / declining /
// at ceiling), and PlayerTags also renders a "Steady" morale label, so match
// the chip by class, never by text.
const outlookChips = (root) => root.findAll((n) =>
  typeof n.props?.className === 'string' && n.props.className.includes('outlook-chip'))

try {
  // ---------- a real post-advance Career state for the Dashboard panel ----------
  function finishForAdvance() {
    let s = reducer(undefined, { type: 'START_CAREER', teamId: 'T1', managerName: 'DevVisUI' })
    let guard = 0
    while (!s.finished && guard++ < 60) s = reducer(s, { type: 'PLAY_ROUND' })
    let pg = 0
    while (s.phase === 'playoffs' && s.tournament?.status === 'active' && pg++ < 10) {
      s = reducer(s, { type: 'PLAY_TOURNAMENT_ROUND' })
    }
    return { ...s, board: { ...s.board, confidence: 100, expectation: 'Avoid last place' } }
  }
  const pre = finishForAdvance()
  const adv = reducer(pre, { type: 'ADVANCE_SEASON' })
  const report = adv.offseasonReport
  check(report != null, 'advance sets offseasonReport (precondition)')
  check(Array.isArray(report?.roster) && report.roster.length > 0, 'report has roster rows (precondition)')

  // ---------- UI: visibility rules ----------
  const bundle = async (entry) => {
    const out = `${temp}/${entry.replaceAll('/', '-')}.js`
    await build({ entryPoints: [`src/components/${entry}`], outfile: out,
      bundle: true, format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic' })
    return await import(out)
  }
  const { default: Lineup } = await bundle('Lineup.jsx')
  const { default: Market } = await bundle('Market.jsx')
  const { default: Squad } = await bundle('Squad.jsx')
  const { default: Dashboard } = await bundle('Dashboard.jsx')
  const { PromotionModal } = await bundle('CareerModals.jsx')
  let tree
  const render = async (el) => act(async () => {
    if (tree) tree.update(el)
    else tree = create(el)
  })

  // Lineup, Career: age + outlook chip, never exact potential.
  let lstate = reducer(undefined, { type: 'START_CAREER', teamId: 'T1', managerName: 'Mozi' })
  await render(React.createElement(Lineup, { state: lstate, dispatch: (a) => { lstate = reducer(lstate, a) } }))
  const lineupText = textOf(tree.root)
  check(lineupText.includes('Age'), 'Lineup (Career): age shown on rows')
  check(outlookChips(tree.root).length > 0, 'Lineup (Career): outlook chip shown')
  check(!/Pot/.test(lineupText), 'Lineup (Career): exact potential never shown')

  // Lineup, Season: age but no outlook chip, and an honest no-growth note.
  let sstate = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1' })
  await render(React.createElement(Lineup, { state: sstate, dispatch: (a) => { sstate = reducer(sstate, a) } }))
  const seasonText = textOf(tree.root)
  check(seasonText.includes('Age'), 'Lineup (Season): age still shown')
  check(outlookChips(tree.root).length === 0, 'Lineup (Season): no outlook chip')
  check(seasonText.includes('no annual player growth'), 'Lineup (Season): honest no-annual-growth note')

  // Market FA cards: age + exact potential.
  let mstate = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1' })
  const fa = mstate.faPool[0]
  await render(React.createElement(Market, { state: mstate, dispatch: (a) => { mstate = reducer(mstate, a) } }))
  const marketText = textOf(tree.root)
  check(marketText.includes(`Age ${fa.age}`), 'Market: FA card shows age')
  check(marketText.includes(`Pot ${fa.potential}`), 'Market: FA card shows exact potential')

  // Squad trade cards: age + exact potential.
  let qstate = reducer(undefined, { type: 'START_CAREER', teamId: 'T1', managerName: 'Mozi' })
  const mine = qstate.teams.T1[0]
  await render(React.createElement(Squad, { state: qstate, dispatch: (a) => { qstate = reducer(qstate, a) } }))
  const squadText = textOf(tree.root)
  check(squadText.includes(`Age ${mine.age}`), 'Squad: trade card shows age')
  check(squadText.includes(`Pot ${mine.potential}`), 'Squad: trade card shows exact potential')

  // Academy modal: exact potential beside the age line.
  const prospect = buildAcademyPlayer('T1', 80)
  const pstate = { ...qstate, pendingPromotion: { player: prospect, teamId: 'T1' } }
  await render(React.createElement(PromotionModal, { state: pstate, dispatch: () => {} }))
  const modalText = textOf(tree.root)
  check(modalText.includes(`age ${prospect.age}`), 'Academy: modal shows age')
  check(modalText.includes(`Pot ${prospect.potential}`), 'Academy: modal shows exact potential')

  // Dashboard: the offseason panel renders on the Hub and dismisses.
  let dstate = adv
  const renderDash = async () => render(React.createElement(Dashboard, {
    state: dstate,
    dispatch: (a) => { dstate = reducer(dstate, a) },
    setTab: () => {},
    totalRounds: dstate.totalRounds,
  }))
  await renderDash()
  const dashText = textOf(tree.root)
  check(dashText.includes('Off-season report'), 'Dashboard: offseason panel renders on the Hub')
  check(dashText.includes(`split ${report.seasonIndexCompleted} complete`), 'Dashboard: panel names the completed split')
  check(dashText.includes(report.roster[0].name), 'Dashboard: panel lists a roster player')
  check(dashText.includes('OVR'), 'Dashboard: panel shows OVR deltas')
  const dismissBtn = tree.root.findAllByType('button').find((b) => textOf(b).includes('Dismiss'))
  check(dismissBtn != null, 'Dashboard: panel has a Dismiss button')
  await act(async () => { dismissBtn.props.onClick() })
  await renderDash()
  check(!textOf(tree.root).includes('Off-season report'), 'Dashboard: dismiss clears the panel')
} finally {
  await rm(temp, { recursive: true, force: true })
}

if (failures > 0) { console.error(`${failures} FAILURE(S)`); process.exit(1) }
console.log('development-visibility-ui: all passed')
