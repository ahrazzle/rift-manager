import assert from 'node:assert/strict'
import { reducer, mulberry32 } from '../src/game/useGameState.js'
import { currentStep, aiDraftMove } from '../src/game/draft.js'
import { CAMPAIGNS } from '../src/data/campaigns.js'
import { mapSnapshot, playbackLimit } from '../src/game/mapSimulation.js'
import { goldAt } from '../src/game/matchSession.js'

const rng = Math.random
Math.random = mulberry32(9923)
function finish(state) {
  let guard = 0
  while (state.matchSession.stage !== 'result' && guard++ < 150) {
    const s = state.matchSession
    let action
    if (s.stage === 'setup') action = { type: 'MATCH_START' }
    else if (s.stage === 'draft') {
      if (s.draft.done) action = { type: 'MATCH_DRAFT_LOCK' }
      else {
        const step = currentStep(s.draft)
        const move = aiDraftMove(s.draft, mulberry32(s.draft.step + 2))
        action = step.side !== s.draft.userSide ? { type: 'MATCH_DRAFT_AI' }
          : { ...move, type: move.type === 'ban' ? 'MATCH_DRAFT_BAN' : 'MATCH_DRAFT_PICK' }
      }
    } else if (s.stage === 'decision') {
      const before = structuredClone(s.current.game), checkpoint = s.current.decisionAt
      state = reducer(state, { type: 'MATCH_CALL', callId: s.current.prompt.optimalCallId })
      const after = state.matchSession.current.game
      assert.deepEqual(after.events.filter(e => e.t <= checkpoint), before.events.filter(e => e.t <= checkpoint))
      assert.equal(goldAt(after, checkpoint), goldAt(before, checkpoint))
      assert.equal(reducer(state, { type: 'MATCH_CALL', callId: 'scale' }).matchSession.current.callId, s.current.prompt.optimalCallId)
      continue
    } else if (s.stage === 'map' && s.options.igl && !s.current.callId) action = { type: 'MATCH_DECISION' }
    else if (['map', 'game'].includes(s.stage)) action = { type: 'MATCH_FINISH_GAME' }
    else if (s.stage === 'between') action = { type: 'MATCH_NEXT_GAME' }
    else throw new Error(`unexpected stage ${s.stage}`)
    state = reducer(state, action)
  }
  assert.equal(state.matchSession.stage, 'result', 'complete within a finite number of steps')
  return state
}
const optionsList = Array.from({ length: 8 }, (_, i) => ({ draft: !!(i & 1), igl: !!(i & 2), showSimulation: !!(i & 4) }))
for (const mode of ['season', 'career', 'campaign', 'gauntlet']) for (const matchOptions of optionsList) {
  let state = reducer(undefined, mode === 'career' ? { type: 'START_CAREER', teamId: 'T1', matchOptions }
    : mode === 'campaign' ? { type: 'START_CAMPAIGN', campaignId: 'faker-first-lck-win', matchOptions }
      : { type: 'NEW_GAME', teamId: 'T1', mode, matchOptions })
  if (mode === 'gauntlet') state = reducer(state, { type: 'GAUNTLET_START' })
  const source = mode === 'gauntlet' ? 'GAUNTLET_PLAY' : mode === 'campaign' ? 'PLAY_CAMPAIGN_NODE' : 'PLAY_ROUND'
  const previous = state
  state = reducer(state, { type: 'PREVIEW_MATCH', action: { type: source } })
  assert.equal(state.matchSession.stage, 'setup')
  assert.equal(state.round, previous.round)
  assert.deepEqual(state.standings, previous.standings)
  assert.deepEqual(state.matchSession.options, matchOptions)
  assert.equal(reducer(state, { type: source }), state, 'cannot bypass an active match')
  const done = finish(state), s = done.matchSession
  assert.equal(Math.max(s.aWins, s.bWins), s.context.needWins)
  const saved = mode === 'gauntlet' ? done.gauntlet.lastResult : mode === 'campaign' ? done.campaign.nodeResults.at(-1) : done.results.findLast(r => r.isUser)
  assert.deepEqual(saved.games, s.games, 'the story stores the games actually played')
  assert.equal(saved.aWins, s.aWins)
  assert.equal(saved.bWins, s.bWins)
  for (const type of ['MATCH_START', 'MATCH_FINISH_GAME', 'MATCH_NEXT_GAME', 'MATCH_DRAFT_LOCK']) {
    const duplicate = reducer(done, { type })
    assert.deepEqual(duplicate.results, done.results)
    assert.deepEqual(duplicate.campaign, done.campaign)
    assert.deepEqual(duplicate.gauntlet, done.gauntlet)
  }
}
let base = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1' })
base = reducer(base, { type: 'PREVIEW_MATCH', action: { type: 'PLAY_ROUND' } })
const quick = finish(base)
const watched = finish(reducer(base, { type: 'SET_MATCH_OPTION', key: 'showSimulation', value: true }))
assert.deepEqual(quick.matchSession.games, watched.matchSession.games, 'watching does not change the result')
assert.deepEqual(quick.matchSession.context, watched.matchSession.context)
const game = quick.matchSession.games[0]
const blank = mapSnapshot(game, 0)
assert.equal(blank.players.length, 10)
assert.ok(blank.players.every(p => p.kills === 0 && p.deaths === 0))
assert.equal(blank.sides.A.kills + blank.sides.B.kills, 0)
for (const minute of [4, 10, 18, 25, game.durationMin]) {
  const snap = mapSnapshot(game, minute)
  assert.equal(snap.sides.A.kills + snap.sides.B.kills, game.events.filter(e => e.t <= minute && e.type === 'kill').length)
  assert.ok(snap.players.every(p => p.point.every(Number.isFinite)))
  assert.equal(snap.towers.length, 18)
}
assert.notDeepEqual(mapSnapshot(game, 1).players.map(p => p.point), mapSnapshot(game, 8).players.map(p => p.point))
assert.equal(playbackLimit(game, 12, false), 12)
assert.equal(playbackLimit(game, 12, true), game.durationMin)
const campaign = CAMPAIGNS.find(c => c.nodes?.some(n => n.hardLossSlots?.length))
const ni = campaign.nodes.findIndex(n => n.hardLossSlots?.length)
const node = campaign.nodes[ni], slot = node.hardLossSlots[0]
for (const matchOptions of optionsList) {
  let s = reducer(undefined, { type: 'START_CAMPAIGN', campaignId: campaign.id, matchOptions })
  s.campaign.nodeIndex = ni
  s.campaign.nodeResults = Array.from({ length: slot - 1 }, (_, i) => ({ nodeId: node.id, slot: i + 1, playerWon: true }))
  s = finish(reducer(s, { type: 'PREVIEW_MATCH', action: { type: 'PLAY_CAMPAIGN_NODE' } }))
  assert.equal(s.matchSession.games.length, 1)
  assert.equal(s.matchSession.games[0].winner, 'B')
  assert.equal(s.campaign.nodeResults.at(-1).historicalLoss, true)
}
for (const kind of ['playoffs', 'msi', 'worlds']) {
  let s = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', matchOptions: { igl: true, draft: true } })
  const m = (homeId, awayId) => ({ homeId, awayId, winner: null, isUser: homeId === 'T1' || awayId === 'T1', userSide: homeId === 'T1' ? 'home' : awayId === 'T1' ? 'away' : null })
  s = { ...s, finished: true, phase: kind, tournament: { kind, status: 'active', revealedRounds: 1, resolver: 'biased', rounds: [{ name: 'Semi', matches: [m('T1', 'GEN'), m('DK', 'KT')] }, { name: 'Final', matches: [m(null, null)] }] } }
  for (let i = 0; i < 3; i++) {
    s = finish(reducer(s, { type: 'PREVIEW_MATCH', action: { type: 'PLAY_TOURNAMENT_ROUND' } }))
    if (i === 0) assert.equal(s.tournament.rounds[1].matches[0].homeId, null, 'no advance while a semifinal is pending')
    s = reducer(s, { type: 'MATCH_CLOSE' })
  }
  assert.equal(s.tournament.status, 'done')
  assert.ok(s.tournament.championId)
}
let replay = reducer(undefined, { type: 'START_CAMPAIGN', campaignId: 'hist-2013-summer', matchOptions: { draft: true, igl: true, showSimulation: true } })
const history = structuredClone(replay.campaign), ids = Object.keys(replay.teams)
replay = finish(reducer(replay, { type: 'PREVIEW_MATCH', action: { type: 'PLAY_REPLAY_EXHIBITION', teamId: ids[0], opponentId: ids[1] } }))
assert.deepEqual(replay.campaign, history)
assert.ok(replay.lastExhibition.games.length >= 2)
Math.random = rng
console.log('All 32 story/add-on combinations, fixed historical games, brackets, exhibitions and map integrity pass')
