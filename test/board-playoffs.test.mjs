import assert from 'node:assert/strict'
import { reducer, orderStandings, mulberry32, load } from '../src/game/useGameState.js'
import { writeSave } from '../src/game/persistence.js'
const originalRandom = Math.random
Math.random = mulberry32(7)
function regional() {
  let s = reducer(undefined, { type: 'START_CAREER', teamId: 'T1' })
  while (!s.finished) s = reducer(s, { type: 'PLAY_ROUND' })
  return s
}
function finish(s, finalist) {
  s = reducer(s, { type: 'SET_RESOLVER', resolver: 'manual' })
  // Force semifinals, then make the managed finalist lose the final.
  for (let ri = 0; ri < 2; ri++) {
    for (const [mi, m] of s.tournament.rounds[ri].matches.entries()) {
      const hasUser = [m.homeId, m.awayId].includes(s.teamId)
      const winnerId = hasUser && ri === 0 && finalist ? s.teamId
        : hasUser ? [m.homeId, m.awayId].find(id => id !== s.teamId) : m.homeId
      s = reducer(s, { type: 'SELECT_MATCH_WINNER', roundIndex: ri, matchIndex: mi, winnerId })
    }
    s = reducer(s, { type: 'PLAY_TOURNAMENT_ROUND' })
  }
  assert.equal(s.tournament.status, 'done')
  return s
}
function confidence(s) {
  const advanced = reducer({ ...s, board: { ...s.board, expectation: 'Reach the final', confidence: 60 } }, { type: 'ADVANCE_SEASON' })
  assert.equal(advanced.career.seasonIndex, s.career.seasonIndex + 1)
  assert.equal(advanced.playoffFinalist, null)
  return advanced.board.confidence
}
let top = regional()
const ordered = orderStandings(top.standings).map(r => r.teamId)
assert.equal(ordered.indexOf(top.teamId), 0)
const loser = finish(top, false)
assert.equal(loser.playoffFinalist, false)
assert.equal(confidence(loser), 40)
// Use the actual fourth seed as managed team to exercise standings-vs-bracket disagreement.
let lower = { ...top, teamId: ordered[3] }
lower = finish(lower, true)
assert.equal(lower.playoffFinalist, true)
assert.equal(confidence(lower), 75)
function international(s, kind) {
  s = reducer(s, { type: 'BUILD_TOURNAMENT', kind })
  assert.equal(s.tournament.kind, kind)
  while (s.tournament.status === 'active') s = reducer(s, { type: 'PLAY_TOURNAMENT_ROUND' })
  return s
}
for (const [s, expected] of [[loser, 40], [lower, 75]]) {
  const msi = international(s, 'msi')
  assert.equal(confidence(msi), expected)
  assert.equal(confidence(international(msi, 'worlds')), expected)
}
const storage = new Map()
globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v) }
globalThis.window = { location: { pathname: '/', hostname: 'localhost' } }
function legacy(s) { const old = { ...s }; delete old.playoffFinalist; writeSave(old); return load() }
assert.equal(legacy(loser).playoffFinalist, false)
assert.equal(legacy(lower).playoffFinalist, true)
assert.equal(confidence(legacy(lower)), 75)
// No standings proxy when an old save has already discarded the regional bracket.
const unknown = legacy(international(loser, 'msi'))
assert.equal(unknown.playoffFinalist, null)
assert.equal(confidence(unknown), 60)
const champion = { ...unknown, playoffChampionId: unknown.teamId }
assert.equal(confidence(legacy(champion)), 75)
Math.random = originalRandom
console.log('Board playoff result and legacy-save regressions passed')
