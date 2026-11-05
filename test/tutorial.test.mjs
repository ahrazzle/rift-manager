import assert from 'node:assert/strict'
import { reducer, load, freshTutorial, legacyTutorial, nextTutorialStep } from '../src/game/useGameState.js'
import { writeSave } from '../src/game/persistence.js'

const data = new Map()
globalThis.localStorage = {
  getItem: (key) => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, value),
}

let s = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', mode: 'season' })
assert.ok(s.tutorial)
assert.equal(s.tutorial.step, 'welcome')
assert.equal(s.tutorial.completed, false)

s = reducer(s, { type: 'TUTORIAL_ADVANCE' })
assert.equal(s.tutorial.step, 'hub')

s = reducer(s, { type: 'TUTORIAL_DISMISS' })
assert.equal(s.tutorial.step, 'done')
assert.equal(s.tutorial.dismissed, true)
assert.equal(s.tutorial.completed, true)

const career = reducer(undefined, { type: 'START_CAREER', teamId: 'T1' })
assert.equal(career.tutorial.step, 'welcome')
const gauntlet = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', mode: 'gauntlet' })
assert.equal(gauntlet.tutorial.short, true)
const steps = []
let t = freshTutorial('season')
while (t.step !== 'done') {
  steps.push(t.step)
  t = nextTutorialStep(t)
}
assert.deepEqual(steps, ['welcome', 'hub', 'lineup', 'prep', 'play', 'result'])

const legacy = { ...career, tutorial: undefined }
delete legacy.tutorial
writeSave(legacy)
const loaded = load()
assert.equal(loaded.tutorial.completed, true, 'legacy save without tutorial skips tour')

console.log('tutorial persistence and skip behavior ok')
