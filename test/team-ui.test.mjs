// Team lane render tests: wizard steps, player actions slot, Market/Squad table + morale,
// option groups, career dialogs on the shared Dialog.
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { reducer, mulberry32 } from '../src/game/useGameState.js'
import { buildAcademyPlayer } from '../src/data/academy.js'
import { DILEMMA_EVENTS } from '../src/data/events.js'

const temp = await mkdtemp(new URL('./.team-ui-', import.meta.url).pathname)
const textOf = (node) => (typeof node === 'string' ? node : (node.children || []).map(textOf).join(''))
const random = Math.random
let tree
const render = (el) => act(async () => { if (tree) tree.update(el); else tree = create(el) })
try {
  Math.random = mulberry32(2026)
  const bundle = async (entry) => {
    const out = `${temp}/${entry.replaceAll('/', '-')}.js`
    await build({ entryPoints: [`src/components/${entry}`], outfile: out, bundle: true, format: 'esm', platform: 'node',
      packages: 'external', jsx: 'automatic', loader: { '.webp': 'file' } })
    return import(out)
  }
  const { default: NewGame } = await bundle('NewGame.jsx')
  const { default: PlayerActions, MAX_PLAYER_ACTIONS } = await bundle('team/PlayerActions.jsx')
  const { default: Squad } = await bundle('Squad.jsx')
  const { default: Market } = await bundle('Market.jsx')
  const { default: Tactics } = await bundle('Tactics.jsx')
  const { default: Strategy } = await bundle('Strategy.jsx')
  const { EventModal, PromotionModal } = await bundle('CareerModals.jsx')
  const buttons = () => tree.root.findAllByType('button')
  const byLabel = (label) => buttons().find((b) => textOf(b) === label)
  const click = async (label) => {
    const b = byLabel(label)
    assert.ok(b, `button "${label}" exists`)
    await act(async () => b.props.onClick())
  }
  const byPrefix = (prefix) => buttons().find((b) => textOf(b).trim().startsWith(prefix))

  // ---- New game wizard: Mode -> Team -> Options, one primary per step ----
  const dispatched = []
  await render(React.createElement(NewGame, { state: {}, dispatch: (a) => dispatched.push(a), onOpenAbout() {} }))
  const stepItems = () => tree.root.findAll((n) => n.type === 'li' && String(n.props.className).includes('ng-step '))
  assert.equal(stepItems().length, 3, 'three steps in the indicator')
  assert.equal(stepItems().filter((n) => n.props['aria-current'] === 'step').length, 1)
  let t = textOf(tree.root)
  for (const m of ['Season', 'Career', 'Scenario', 'Gauntlet']) assert.ok(t.includes(m), `step 1 offers ${m}`)
  assert.ok(t.includes('About / Community') && t.includes('How to contribute'), 'hero keeps the community links')
  assert.equal(byLabel('Back'), undefined, 'no Back on the first step')
  assert.equal(tree.root.findAllByType('select').length, 0)
  await click('Next: Team →')
  const selects = tree.root.findAllByType('select')
  assert.equal(selects.length, 1, 'the Team step has the year select')
  assert.ok(tree.root.findAllByType('label').some((l) => l.props.htmlFor === selects[0].props.id), 'select is labelled')
  assert.ok(tree.root.findAllByType('svg').length > 10, 'team picker shows crests')
  assert.ok(byLabel('Back'))
  await click('Next: Options →')
  assert.equal(tree.root.findAllByProps({ role: 'switch' }).length, 4)
  assert.ok(tree.root.findAllByType('input').some((i) => i.props.id === 'coach-name'), 'coach name is labelled')
  assert.ok(!byLabel('Next: Options →'), 'last step has no Next')
  await click('Back')
  await click('Back')
  assert.ok(byLabel('Next: Team →'), 'Back returns to step 1')
  // Scenario mode swaps the Team step for the scenario list.
  await act(async () => byPrefix('Scenario').props.onClick())
  assert.equal(byPrefix('Scenario').props['aria-pressed'], true)
  await click('Next: Scenario →')
  assert.equal(tree.root.findAllByType('select').length, 0, 'scenario mode has no year select')
  assert.ok(tree.root.findAll((n) => n.type === 'button' && n.props['aria-pressed'] !== undefined).length >= 1, 'scenario list is a toggle group')
  await click('Next: Options →')
  assert.equal(tree.root.findAllByProps({ role: 'switch' }).length, 4)
  await act(async () => tree.unmount()); tree = null

  // ---- Player actions slot ----
  const player = { id: 'p1', name: 'Test', morale: 40 }
  let hit = []
  const acts = ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id.toUpperCase(), onClick: () => hit.push(id) }))
  await render(React.createElement(PlayerActions, { player, showMorale: true, actions: acts, note: 'Why not.' }))
  t = textOf(tree.root)
  assert.equal(MAX_PLAYER_ACTIONS, 3)
  assert.equal(buttons().length, 3, 'at most three actions render')
  assert.ok(t.includes('Cold') && t.includes('Morale'), 'morale indicator shows a word')
  assert.ok(t.includes('Why not.'))
  assert.equal(buttons()[0].props['aria-describedby'], tree.root.findAll((n) => n.type === 'p' && n.props.className === 'pa-note')[0].props.id)
  await act(async () => buttons()[1].props.onClick())
  assert.deepEqual(hit, ['b'])
  await render(React.createElement(PlayerActions, { player }))
  assert.equal(buttons().length, 0, 'an empty slot renders no buttons')
  await act(async () => tree.unmount()); tree = null

  // ---- Squad: roster rows carry the morale slot; trade picks via the slot ----
  let q = reducer(undefined, { type: 'START_CAREER', teamId: 'T1', managerName: 'Mozi' })
  await render(React.createElement(Squad, { state: q, dispatch: (a) => { q = reducer(q, a) } }))
  assert.ok(tree.root.findAll((n) => n.props['data-slot'] === 'player-actions').length >= q.teams.T1.length, 'every roster row has an actions slot')
  assert.ok(tree.root.findAll((n) => n.type === 'table').length >= 2, 'tables on desktop')
  assert.ok(tree.root.findAll((n) => n.type === 'th' && String(n.props.className).includes('pl-sticky')).length > 0, 'sticky name column')
  await click('Offer')
  assert.ok(byLabel('Selected'), 'offering marks the player selected')
  await act(async () => tree.unmount()); tree = null

  // ---- Market: affordable and not ----
  let m = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1' })
  await render(React.createElement(Market, { state: { ...m, finance: { budget: 0 } }, dispatch() {} }))
  assert.ok(buttons().filter((b) => textOf(b) === 'Sign').every((b) => b.props.disabled), 'no budget disables every Sign')
  assert.ok(textOf(tree.root).includes('Insufficient budget'))
  await click('Top')
  const roleRows = tree.root.findAll((n) => n.type === 'tr').length - 1
  assert.equal(roleRows, m.faPool.filter((p) => p.role === 'TOP').length, 'role filter narrows the table')
  await act(async () => tree.unmount()); tree = null

  // ---- Tactics / Strategy keep every option and explanation ----
  await render(React.createElement(Tactics, { state: m, dispatch() {} }))
  t = textOf(tree.root)
  assert.ok(t.includes('Early beats Late'))
  const toggles = tree.root.findAll((n) => n.type === 'button' && n.props['aria-pressed'] !== undefined)
  assert.ok(toggles.length >= 6, 'style + phase options are toggle buttons')
  let acts2 = []
  await render(React.createElement(Strategy, { state: m, dispatch: (a) => acts2.push(a) }))
  t = textOf(tree.root)
  for (const s of ['Dragons', 'Splitpush', 'Fearless ON', 'Fearless OFF', 'No swap', 'Roam']) assert.ok(t.includes(s), `strategy keeps ${s}`)
  await click('Roam')
  assert.deepEqual(acts2.at(-1), { type: 'SET_STRATEGY', roam: 'ROAM' })
  await act(async () => tree.unmount()); tree = null

  // ---- Career dialogs on the Dialog primitive ----
  const ev = DILEMMA_EVENTS[0]
  const es = { ...q, pendingEvent: { eventId: ev.id, playerId: q.teams.T1[0].id } }
  let resolved
  await render(React.createElement(EventModal, { state: es, dispatch: (a) => { resolved = a } }))
  const dlg = tree.root.findAll((n) => n.props.role === 'dialog')[0]
  assert.equal(dlg.props['aria-modal'], 'true')
  assert.ok(dlg.props['aria-labelledby'] && dlg.props['aria-describedby'])
  assert.ok(textOf(tree.root).includes(ev.title))
  assert.equal(buttons().filter((b) => textOf(b) === 'Choose →').length, ev.options.length, 'every choice is kept')
  await act(async () => buttons().filter((b) => textOf(b) === 'Choose →')[1].props.onClick())
  assert.deepEqual(resolved, { type: 'RESOLVE_EVENT', optionIndex: 1 })
  assert.equal(buttons().filter((b) => b.props['aria-label'] === 'Close').length, 0, 'a decision has no dismiss control')
  const prospect = buildAcademyPlayer('T1', 80)
  await render(React.createElement(PromotionModal, { state: { ...q, pendingPromotion: { player: prospect, teamId: 'T1' } }, dispatch: (a) => { resolved = a } }))
  await click('Promote →')
  assert.deepEqual(resolved, { type: 'RESOLVE_PROMOTION', promote: true })
  await click('Keep →')
  assert.deepEqual(resolved, { type: 'RESOLVE_PROMOTION', promote: false })
  console.log('team-ui: all passed')
} finally {
  if (tree) await act(async () => tree.unmount())
  Math.random = random
  await rm(temp, { recursive: true, force: true })
}
