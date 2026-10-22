import assert from 'node:assert/strict'
import { reducer, load } from '../src/game/useGameState.js'
import { SAVE_KEY, STAGING_SAVE_KEY, saveKey, writeSave } from '../src/game/persistence.js'

const data = new Map()
globalThis.localStorage = {
  getItem: (key) => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, value),
}
globalThis.window = { location: { pathname: '/', hostname: 'lolsim.askaconsult.com' } }
function roundTrip(state) {
  writeSave(state)
  const loaded = load()
  if (['draft', 'igl'].includes(state.mode)) {
    assert.equal(loaded.mode, 'season')
    assert.equal(loaded.matchOptions[state.mode], true)
    assert.deepEqual(loaded.results, state.results)
    writeSave(loaded) // Migration chooses a seed once; persist that choice.
  } else assert.deepEqual(loaded, state)
  const persisted = JSON.parse(JSON.stringify(loaded))
  assert.deepEqual(load(), persisted)
  return persisted
}
// Current modes round-trip; legacy draft/IGL saves migrate to match options.
for (const mode of ['season', 'draft', 'igl', 'gauntlet']) {
  roundTrip(reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', mode }))
}
roundTrip(reducer(undefined, { type: 'START_CAREER', teamId: 'T1' }))
let replay = reducer(undefined, { type: 'START_CAMPAIGN', campaignId: 'hist-2013-summer' })
roundTrip(replay)
replay = reducer(replay, { type: 'COMPLETE_SEASON_REPLAY' })
assert.equal(replay.campaign.status, 'cleared')
roundTrip(replay)
roundTrip(reducer(undefined, { type: 'START_CAMPAIGN', campaignId: 'faker-first-lck-win' }))

let draft = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', mode: 'draft' })
draft = reducer(draft, { type: 'DRAFT_WEEK_START' })
assert.ok(draft.draftSeries)
roundTrip(draft)
let igl = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', mode: 'igl' })
igl = reducer(igl, { type: 'LIVE_WEEK_START' })
igl = reducer(igl, { type: 'LIVE_START_GAME' })
assert.ok(igl.live)
igl = roundTrip(igl)

const liveRaw = data.get(SAVE_KEY)
window.location.pathname = '/staging'
assert.equal(saveKey(), STAGING_SAVE_KEY)
assert.deepEqual(load(), igl) // optional one-time legacy import
writeSave(replay)
assert.equal(data.get(SAVE_KEY), liveRaw)
assert.deepEqual(load(), replay)
window.location.pathname = '/'
assert.deepEqual(load(), igl)
window.location.hostname = 'lck-manager-staging-abc.vercel.app'
assert.deepEqual(load(), replay)
window.location.hostname = 'lolsim.askaconsult.com'
window.location.pathname = '/staging-other'
assert.equal(saveKey(), SAVE_KEY)

for (const bad of [
  '{bad json', 'null', '[]',
  JSON.stringify({ ...replay, campaign: null }),
  JSON.stringify({ ...replay, campaign: { ...replay.campaign, campaignId: 'missing' } }),
  JSON.stringify({ ...replay, campaign: { ...replay.campaign, nodeResults: {} } }),
  JSON.stringify({ ...replay, campaign: { ...replay.campaign, nodeIndex: -1 } }),
  JSON.stringify({ ...igl, teams: {} }),
  JSON.stringify({ ...igl, mode: 'unknown' }),
]) {
  data.set(SAVE_KEY, bad)
  assert.equal(load().teamId, null)
  assert.equal(load().mode, 'season')
}
const legacy = { ...igl }
delete legacy.mode
data.set(SAVE_KEY, JSON.stringify(legacy))
assert.equal(load().mode, 'season')
delete globalThis.localStorage
delete globalThis.window
assert.equal(load().teamId, null)
console.log('Persistence regression checks passed')
