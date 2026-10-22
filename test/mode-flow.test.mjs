import assert from 'node:assert/strict'
import { reducer, mulberry32 } from '../src/game/useGameState.js'
import { aiDraftMove, scoreComp } from '../src/game/draft.js'
import { evaluateIglCall } from '../src/game/igl.js'
Math.random = mulberry32(71)
for (const mode of ['draft', 'igl']) {
  let s = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', mode })
  let gamesSeen = 0
  for (let guard = 0; !s.finished && guard < 1500; guard++) {
    if (mode === 'draft') {
      if (!s.draftSeries) s = reducer(s, { type: 'DRAFT_WEEK_START' })
      else if (!s.draftSeries.draft.done) {
        const m = aiDraftMove(s.draftSeries.draft, Math.random)
        s = reducer(s, { ...m, type: m.type === 'ban' ? 'DRAFT_BAN' : 'DRAFT_PICK' })
      } else {
        const before = s.draftSeries
        s = reducer(s, { type: 'DRAFT_RESOLVE_GAME' })
        const entry = s.draftSeries?.games.at(-1) ?? s.lastInteractiveSeries.games.at(-1)
        const homeSide = before.userIsHome ? before.draft.userSide : before.draft.userSide === 'BLUE' ? 'RED' : 'BLUE'
        const awaySide = homeSide === 'BLUE' ? 'RED' : 'BLUE'
        assert.equal(before.userIsHome ? entry.awayBonus : entry.homeBonus, scoreComp(before.draft.picks[before.userIsHome ? awaySide : homeSide]).bonus)
        gamesSeen++
      }
    } else {
      if (!s.live) s = reducer(s, { type: 'LIVE_WEEK_START' })
      else if (!s.live.current) s = reducer(s, { type: 'LIVE_START_GAME' })
      else if (!s.live.current.final) s = reducer(s, { type: 'LIVE_MAKE_CALL', callId: s.live.current.prompt.optimalCallId })
      else { s = reducer(s, { type: 'LIVE_ADVANCE' }); gamesSeen++ }
    }
  }
  assert(s.finished, `${mode} split finishes`)
  assert.equal(s.phase, 'playoffs')
  assert.equal(s.tournament.qualifies.length, 4)
  assert.equal(s.results.filter(r => r.isUser).flatMap(r => r.games).length, gamesSeen)
  for (const kind of ['playoffs', 'msi', 'worlds']) {
    if (kind !== 'playoffs') s = reducer(s, { type: 'BUILD_TOURNAMENT', kind })
    for (let n = 0; s.tournament.status === 'active' && n < 10; n++) s = reducer(s, { type: 'PLAY_TOURNAMENT_ROUND' })
    assert.equal(s.tournament.status, 'done', `${mode} ${kind} finishes`)
  }
}
const ahead = { events: [{ t: 23, type: 'tower', side: 'A' }], goldTimeline: [{ t: 23, diff: 3000 }] }
const behind = { ...ahead, goldTimeline: [{ t: 23, diff: -3000 }] }
assert(evaluateIglCall(ahead, true, 'baron').modifier > evaluateIglCall(behind, true, 'baron').modifier)
assert(evaluateIglCall(behind, true, 'scale').modifier > evaluateIglCall(ahead, true, 'scale').modifier)
const career = reducer(undefined, { type: 'START_CAREER', teamId: 'T1' })
const fired = reducer({ ...career, finished: true, board: { confidence: 1, expectation: 'Win the title' } }, { type: 'ADVANCE_SEASON' })
assert(fired.sacked && fired.finished)
assert.equal(fired.career.history.length, 1)
assert.equal(fired.pendingEvent, null)
assert.equal(fired.pendingPromotion, null)
assert.equal(fired.press.pending, false)
console.log('mode flows, persisted games, contextual calls and firing pass')
