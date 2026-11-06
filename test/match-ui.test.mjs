// These controls use real React effects with host nodes as explicit test doubles.
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { reducer, mulberry32 } from '../src/game/useGameState.js'
import { currentStep, aiDraftMove } from '../src/game/draft.js'

const temp = await mkdtemp(new URL('./.match-ui-', import.meta.url).pathname)
const text = (node) => typeof node === 'string' ? node : (node.children || []).map(text).join('')
let tree
const byText = (label) => tree.root.findAllByType('button').find(b => text(b) === label)
const click = async label => {
  const b = byText(label); assert.ok(b, `${label} exists`); assert.ok(!b.props.disabled, `${label} enabled`)
  await act(async () => b.props.onClick())
}
try {
  await build({ entryPoints: ['src/components/NewGame.jsx', 'src/components/MatchExperience.jsx', 'src/components/AnimatedRift.jsx'], outdir: temp,
    bundle: true, format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic', loader: { '.md': 'text', '.webp': 'file' } })
  const { default: NewGame } = await import(`${temp}/NewGame.js`)
  const { default: MatchExperience } = await import(`${temp}/MatchExperience.js`)
  const { default: AnimatedRift } = await import(`${temp}/AnimatedRift.js`)
  const entries = []
  await act(async () => { tree = create(React.createElement(NewGame, { state: {}, dispatch: a => entries.push(a) })) })
  assert.equal(tree.root.findAll(n => n.props.className?.includes('mode-card') && text(n).includes('Live pick/ban')).length, 0)
  const switches = () => tree.root.findAllByProps({ role: 'switch' })
  assert.equal(switches().length, 4, 'Draft, IGL, Show simulation, Fearless draft')
  await act(async () => switches()[0].props.onChange({ target: { checked: true } }))
  await act(async () => switches()[1].props.onChange({ target: { checked: true } }))
  assert.equal(switches()[2].props.checked, true)
  assert.equal(switches()[2].props.disabled, true, 'IGL always has a map')
  await click('Start Career →')
  assert.equal(entries[0].matchOptions.draft, true)
  assert.equal(entries[0].matchOptions.igl, true)
  await act(async () => tree.unmount())

  const createState = (options) => {
    let s = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', matchOptions: options })
    s = { ...s, simSpeed: 'instant' }
    return reducer(s, { type: 'PREVIEW_MATCH', action: { type: 'PLAY_ROUND' } })
  }
  let state = createState({ igl: true })
  let allStates = []
  function Host() {
    const [s, set] = React.useState(state)
    state = s; allStates.push(s)
    return React.createElement(MatchExperience, { state: s, dispatch: a => set(prev => reducer(prev, a)) })
  }
  await act(async () => { tree = create(React.createElement(Host)) })
  await click('Enter the Rift →')
  await click('Skip to call')
  assert.equal(state.matchSession.stage, 'decision')
  assert.equal(byText('Finish game'), undefined)
  assert.ok(tree.root.findAllByType('svg').length > 0)
  assert.ok(tree.root.findAllByType('button').filter(b => b.props.className === 'igl-call-option').length === 7)
  const chosen = tree.root.findAllByType('button').find(b => b.props.className === 'igl-call-option')
  await act(async () => chosen.props.onClick())
  assert.equal(state.matchSession.current.callId, 'dragons')
  await click('Finish game')
  assert.equal(state.matchSession.stage, 'between')
  assert.equal(state.round, 1)
  await click('Enter game 2 →')
  await click('Skip to call')
  // Escape hatch: the shotcaller (the user's support) picks a call from this game's seed.
  const seed = state.matchSession.current.seed
  await click('Let Keria decide')
  assert.equal(state.matchSession.current.callId, state.matchSession.current.prompt.options[(seed >>> 0) % 7].id)
  assert.ok(tree.root.findAll(n => n.props.className === 'feed-item feed-blue feed-pin' || n.props.className === 'feed-item feed-red feed-pin').length === 1, 'the call is posted to the play-by-play')
  await click('Finish game')
  if (state.matchSession.stage === 'between') {
    await click('Enter game 3 →'); await click('Skip to call')
    await act(async () => tree.root.findAllByType('button').find(b => b.props.className === 'igl-call-option').props.onClick())
    await click('Finish game')
  }
  assert.equal(state.matchSession.stage, 'result')
  assert.equal(state.round, 2)
  assert.ok(byText('Return to season →'))
  await act(async () => tree.unmount())

  // Timer-driven instant playback must still stop for IGL; it cannot bypass a call.
  const sample = allStates.find(s => s.matchSession.stage === 'map').matchSession.current
  let checkpoints = 0, completions = 0
  await act(async () => { tree = create(React.createElement(AnimatedRift, { game: sample.game, homeName: 'T1', awayName: 'FOX', speed: 'instant', decisionAt: sample.decisionAt,
    onCheckpoint: () => checkpoints++, onComplete: () => completions++ })) })
  await act(async () => { await new Promise(r => setTimeout(r, 160)) })
  assert.equal(checkpoints, 1)
  assert.equal(completions, 0)
  await act(async () => tree.unmount())

  // Draft without watching resolves and advances; AI and player moves cannot hang.
  state = createState({ draft: true })
  state = reducer(state, { type: 'MATCH_START' })
  while (!state.matchSession.draft.done) {
    const d = state.matchSession.draft, move = aiDraftMove(d, mulberry32(d.step + 6))
    state = reducer(state, currentStep(d).side !== d.userSide ? { type: 'MATCH_DRAFT_AI' } : { ...move, type: move.type === 'ban' ? 'MATCH_DRAFT_BAN' : 'MATCH_DRAFT_PICK' })
  }
  await act(async () => { tree = create(React.createElement(Host)) })
  // The draft board's done state carries the lock CTA as "Start game N" (Broadcast Night SPEC §3.3);
  // it dispatches the same MATCH_DRAFT_LOCK the old "Play this game →" button did.
  await click('Start game 1')
  assert.equal(state.matchSession.stage, 'between', 'the game-stage effect finishes a draft-only game')
  await act(async () => tree.unmount())
  console.log('React toggles, map controls, IGL checkpoint/timers and draft-only lifecycle pass')
} finally {
  if (tree) await act(async () => tree.unmount())
  await rm(temp, { recursive: true, force: true })
}
