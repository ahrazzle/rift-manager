import assert from 'node:assert/strict'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { reducer, useGameState } from '../src/game/useGameState.js'
import { SAVE_KEY, STAGING_SAVE_KEY } from '../src/game/persistence.js'

const original = JSON.stringify(reducer(undefined, { type: 'NEW_GAME', teamId: 'T1' }))
let current, root, readFails, writeFails, writes
const data = new Map()
globalThis.window = { location: { pathname: '/', hostname: 'www.rift' } }
globalThis.localStorage = {
  getItem(key) { if (readFails) throw Error('read denied'); return data.get(key) ?? null },
  setItem(key, value) { if (writeFails) throw Error('quota'); writes++; data.set(key, value) },
}
function Probe() { current = useGameState(); return null }
function mount(raw = original, fail = false) {
  data.clear(); data.set(SAVE_KEY, raw); readFails = fail; writeFails = false; writes = 0
  act(() => { root = create(React.createElement(Probe)) })
}
function unmount() { act(() => root.unmount()) }
for (const [raw, failedRead] of [[original, true], ['{broken json', false], ['null', false], [JSON.stringify({ version: 99 }), false], ['', false]]) {
  mount(raw, failedRead)
  assert.ok(current.loadError)
  assert.equal(writes, 0)
  act(() => current.retrySave())
  act(() => current.dispatch({ type: 'NEW_GAME', teamId: 'GEN' }))
  assert.equal(current.state.teamId, null)
  assert.equal(data.get(SAVE_KEY), raw)
  act(() => current.retryLoad())
  assert.ok(current.loadError)
  assert.equal(writes, 0)
  readFails = false; data.set(SAVE_KEY, original)
  act(() => current.retryLoad())
  assert.equal(current.loadError, null)
  assert.equal(current.state.teamId, 'T1')
  assert.equal(JSON.parse(data.get(SAVE_KEY)).teamId, 'T1')
  unmount()
}
// Only an actual fresh onboarding state can have a null managed team.
const fresh = reducer(JSON.parse(original), { type: 'RESET' })
for (const malformed of [
  { ...fresh, teamId: undefined }, { ...fresh, teamId: false },
  { ...fresh, teams: {} }, { ...fresh, finished: true },
]) {
  mount(JSON.stringify(malformed))
  assert.ok(current.loadError)
  assert.equal(writes, 0)
  unmount()
}
// A failed explicit replacement keeps recovery blocked and preserves evidence.
mount('{broken')
writeFails = true
act(() => current.replaceSave())
assert.ok(current.storageError)
assert.ok(current.loadError)
assert.equal(data.get(SAVE_KEY), '{broken')
assert.equal(writes, 0)
writeFails = false
act(() => current.replaceSave())
assert.equal(current.loadError, null)
assert.equal(current.storageError, null)
assert.equal(JSON.parse(data.get(SAVE_KEY)).teamId, null)
unmount()
// The explicitly replaced onboarding save must itself load successfully.
act(() => { root = create(React.createElement(Probe)) })
assert.equal(current.loadError, null)
unmount()
// Ordinary write failures still report and recover through Retry saving.
mount()
writeFails = true
act(() => current.dispatch({ type: 'SET_SIM_SPEED', speed: 'fast' }))
assert.ok(current.storageError)
assert.equal(JSON.parse(data.get(SAVE_KEY)).teamId, 'T1')
writeFails = false
act(() => current.retrySave())
assert.equal(current.storageError, null)
unmount()
// Staging replacement never overwrites production, even on failed import.
window.location.pathname = '/staging'
mount('{broken')
assert.ok(current.loadError)
act(() => current.replaceSave())
assert.equal(data.get(SAVE_KEY), '{broken')
assert.equal(JSON.parse(data.get(STAGING_SAVE_KEY)).teamId, null)
unmount()
// Absent storage is a load failure and cannot claim replacement succeeded.
const storage = globalThis.localStorage
delete globalThis.localStorage
act(() => { root = create(React.createElement(Probe)) })
assert.ok(current.loadError)
act(() => current.replaceSave())
assert.ok(current.loadError)
assert.match(current.storageError, /choose Replace saved game again/)
unmount()
globalThis.localStorage = storage
delete globalThis.localStorage; delete globalThis.window
console.log('Hook save recovery checks passed')
