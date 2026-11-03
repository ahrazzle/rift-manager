import assert from 'node:assert/strict'
import { reducer, load, mulberry32 } from '../src/game/useGameState.js'
import { aiDraftMove, currentStep } from '../src/game/draft.js'
import { writeSave } from '../src/game/persistence.js'

const originalRandom = Math.random
const data = new Map()
globalThis.localStorage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
const plain = (value) => JSON.parse(JSON.stringify(value))
function reload(state) {
  writeSave(state)
  const next = load()
  if (!['draft', 'igl'].includes(state.mode)) assert.deepEqual(plain(next), plain(state))
  return next
}
function draftMoves(state, legacy = false) {
  for (let guard = 0; guard < 22; guard++) {
    const draft = legacy ? state.draftSeries.draft : state.matchSession.draft
    if (draft.done) return state
    const move = aiDraftMove(draft, mulberry32(100 + draft.step))
    const isUser = currentStep(draft).side === draft.userSide
    const type = legacy ? (move.type === 'ban' ? 'DRAFT_BAN' : 'DRAFT_PICK')
      : !isUser ? 'MATCH_DRAFT_AI' : move.type === 'ban' ? 'MATCH_DRAFT_BAN' : 'MATCH_DRAFT_PICK'
    state = reducer(state, { ...move, type })
  }
  assert.fail('draft failed to complete')
}
const stages = new Set()
function finish(state) {
  for (let guard = 0; guard < 30 && state.matchSession.stage !== 'result'; guard++) {
    stages.add(state.matchSession.stage)
    state = reload(state)
    switch (state.matchSession.stage) {
      case 'setup': state = reducer(state, { type: 'MATCH_START' }); break
      case 'draft': state = reducer(draftMoves(state), { type: 'MATCH_DRAFT_LOCK' }); break
      case 'between': state = reducer(state, { type: 'MATCH_NEXT_GAME' }); break
      case 'decision': state = reducer(state, { type: 'MATCH_CALL', callId: 'dragons' }); break
      case 'map':
        state = reducer(state, { type: state.matchSession.options.igl && !state.matchSession.current.callId ? 'MATCH_DECISION' : 'MATCH_FINISH_GAME' }); break
      case 'game': state = reducer(state, { type: 'MATCH_FINISH_GAME' }); break
      default: assert.fail(`unexpected ${state.matchSession.stage}`)
    }
  }
  assert.equal(state.matchSession.stage, 'result')
  stages.add('result')
  return reload(state)
}
function checkLegacy(old) {
  const oldSeries = old.draftSeries || old.live
  const oldGames = plain(oldSeries.games.map((g) => g.game))
  const aiResults = plain(old.results)
  let state = reload(old)
  assert.equal(state.mode, 'season')
  assert.equal(state.matchOptions[old.mode], true)
  assert.equal(state.draftSeries, null)
  assert.equal(state.live, null)
  assert.deepEqual(plain(state.matchSession.games), oldGames)
  assert.deepEqual(plain(state.results), aiResults)
  assert.deepEqual(plain(state.standings), plain(old.standings))
  if (old.live?.current?.final) assert.deepEqual(plain(state.matchSession.current.game), plain(old.live.current.final))
  state = finish(state)
  assert.equal(state.round, old.round + 1)
  assert.deepEqual(plain(state.results.slice(0, aiResults.length)), aiResults)
  assert.equal(state.results.length, aiResults.length + 1, 'only the user result is appended; AI round already played')
  assert.deepEqual(plain(state.matchSession.games.slice(0, oldGames.length)), oldGames)
  const snapshot = plain(state)
  for (const type of ['MATCH_FINISH_GAME', 'MATCH_NEXT_GAME', 'MATCH_START', 'MATCH_DRAFT_LOCK']) {
    state = reducer(state, { type })
    assert.deepEqual(plain(state), snapshot, `${type} cannot commit a finished match twice`)
  }
  state = reducer(state, { type: 'MATCH_CLOSE' })
  assert.equal(state.matchSession, null)
  assert.equal(state.results.length, aiResults.length + 1)
  assert.equal(reducer(state, { type: 'MATCH_FINISH_GAME' }), state)
}
try {
  Math.random = mulberry32(20261013)
  for (const mode of ['draft', 'igl']) {
    const fresh = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', mode })
    const converted = reload(fresh)
    assert.equal(converted.mode, 'season')
    assert.equal(converted.matchOptions[mode], true)
    assert.equal(converted.matchSession, null)
    assert.deepEqual(converted.teams, fresh.teams)
    reload(converted)
  }
  let draft = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', mode: 'draft' })
  draft = reducer(draft, { type: 'DRAFT_WEEK_START' })
  checkLegacy(draft)
  draft = reducer(draftMoves(draft, true), { type: 'DRAFT_RESOLVE_GAME' })
  assert.equal(draft.draftSeries.games.length, 1)
  checkLegacy(draft)
  let live = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', mode: 'igl' })
  live = reducer(live, { type: 'LIVE_WEEK_START' })
  checkLegacy(live)
  live = reducer(live, { type: 'LIVE_START_GAME' })
  checkLegacy(live)
  live = reducer(live, { type: 'LIVE_MAKE_CALL', callId: 'dragons' })
  checkLegacy(live)
  live = reducer(live, { type: 'LIVE_ADVANCE' })
  assert.equal(live.live.games.length, 1)
  checkLegacy(live)
  let modern = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', matchOptions: { draft: true, igl: true, showSimulation: true } })
  modern = reducer(modern, { type: 'PREVIEW_MATCH', action: { type: 'PLAY_ROUND' } })
  finish(modern)
  for (const stage of ['setup', 'draft', 'map', 'decision', 'between', 'game', 'result']) assert.ok(stages.has(stage), `${stage} save round-tripped`)
  console.log('Legacy match migration checks passed')
} finally {
  Math.random = originalRandom
  delete globalThis.localStorage
}
