// Exercise real React controls and persistence effects without claiming browser
// layout or native dialog behavior: host nodes are explicit test doubles.
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { reducer, mulberry32 } from '../src/game/useGameState.js'
import { STAGING_SAVE_KEY, SAVE_KEY } from '../src/game/persistence.js'

const temp = await mkdtemp(new URL('./.management-ui-', import.meta.url).pathname)
const random = Math.random
const storage = new Map([[SAVE_KEY, 'live save must remain untouched']])
let rejectWrites = false
let tree
const textOf = (node) => typeof node === 'string' ? node : (node.children || []).map(textOf).join('')
const button = (label) => tree.root.findAllByType('button').find((b) => textOf(b) === label)
const click = async (label) => {
  const node = button(label)
  assert.ok(node, `button ${label} is available`)
  assert.ok(!node.props.disabled, `button ${label} is enabled`)
  await act(async () => node.props.onClick())
}
try {
  await build({ entryPoints: ['src/App.jsx', 'src/components/WatchLive.jsx'], outdir: temp,
    bundle: true, format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic', loader: { '.md': 'text', '.webp': 'file' } })
  const { default: App } = await import(`${temp}/App.js`)
  const { default: WatchLive } = await import(`${temp}/components/WatchLive.js`)
  Math.random = mulberry32(1907)
  globalThis.window = { location: { hostname: 'lolsim.askaconsult.com', pathname: '/staging/' } }
  globalThis.document = { activeElement: { isConnected: true, focus() {} } }
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => { if (rejectWrites) throw new Error('QuotaExceededError'); storage.set(key, value) },
  }
  const state = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1' })
  storage.set(STAGING_SAVE_KEY, JSON.stringify(state))
  await act(async () => { tree = create(React.createElement(App), { createNodeMock: (element) => element.type === 'dialog' ? { showModal() {}, close() {} } : null }) })
  const focus = tree.root.findAllByType('button').find((b) => textOf(b).includes('Matchup scrims') && b.props['aria-pressed'] !== undefined)
  await act(async () => focus.props.onClick())
  await click('Run matchup scrims →')
  const prepared = JSON.parse(storage.get(STAGING_SAVE_KEY))
  assert.equal(prepared.preparation.focus, 'scrims')
  assert.equal(prepared.trainedRound, 1)
  assert.equal(tree.root.findAll((n) => n.props.role === 'status').some((n) => textOf(n).includes('Matchup scrims completed')), true)
  assert.equal(storage.get(SAVE_KEY), 'live save must remain untouched')

  await click('New Game')
  assert.equal(JSON.parse(storage.get(STAGING_SAVE_KEY)).teamId, 'T1', 'opening confirmation preserves the save')
  assert.equal(tree.root.findAllByType('dialog').length, 1)
  await click('Keep playing')
  assert.equal(tree.root.findAllByType('dialog').length, 0)
  await click('New Game')
  await click('Start new game')
  assert.equal(JSON.parse(storage.get(STAGING_SAVE_KEY)).teamId, null)

  // Start a real historical career through the actual year selector controls.
  const year = tree.root.findAllByType('select').find((s) => s.props.className === 'year-select')
  await act(async () => year.props.onChange({ target: { value: '2013-lck' } }))
  rejectWrites = true
  await click('Start Career →')
  assert.match(textOf(tree.root.findByProps({ role: 'alert' })), /could not be saved/)
  rejectWrites = false
  await click('Retry saving')
  assert.equal(tree.root.findAllByProps({ role: 'alert' }).length, 0)
  assert.equal(JSON.parse(storage.get(STAGING_SAVE_KEY)).seasonYear, '2013-lck')
  assert.equal(storage.get(SAVE_KEY), 'live save must remain untouched')
  await act(async () => tree.unmount())

  // Refresh after an IGL call keeps its verdict and can finish an empty late feed.
  let continued = 0
  await act(async () => { tree = create(React.createElement(WatchLive, {
    resolvedCallId: 'dragons', prompt: { optimalCallId: 'dragons' }, earlyEvents: [], lateEvents: [],
    simSpeed: 'instant', userWon: true, onCall() { assert.fail('must not ask for a second call') }, onDone() { continued++ },
  })) })
  await click('Watch the rest →')
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)) })
  await click('Continue →')
  assert.equal(continued, 1)
  console.log('Management UI controls, save retry/reset, historical selector, and restored IGL checks passed')
} finally {
  if (tree) await act(async () => tree.unmount())
  Math.random = random
  delete globalThis.window
  delete globalThis.document
  delete globalThis.localStorage
  await rm(temp, { recursive: true, force: true })
}
