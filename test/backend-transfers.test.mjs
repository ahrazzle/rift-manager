import assert from 'node:assert/strict'
import { TEAMS, FREE_AGENTS, ROLES } from '../src/data/lck.js'
import { signingFee } from '../src/game/economy.js'
import { previewTransfer, applyTransfer, selectTransferReport } from '../src/game/backend/transfers.js'

const freeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}
const team = TEAMS.find((t) => t.players.length > 5)
const lineup = Object.fromEntries(ROLES.map((r) => [r, team.players.find((p) => p.role === r).id]))
const state = freeze({
  mode: 'career', career: { status: 'active', seasonIndex: 2 }, teamId: team.id,
  teams: Object.fromEntries(TEAMS.map((t) => [t.id, t.players])),
  lineup, faPool: FREE_AGENTS, finance: { budget: 0, audit: 'preserved' },
  form: Object.fromEntries(team.players.map((p) => [p.id, 55])), round: 3,
})
const bench = team.players.find((p) => !Object.values(lineup).includes(p.id))
const starter = team.players.find((p) => p.id === lineup[bench.role])
const sell = (playerId) => ({ type: 'SELL_PLAYER', playerId })
const release = (playerId) => ({ type: 'RELEASE_PLAYER', playerId })
const snapshot = JSON.stringify(state)
function denied(s, action, code) {
  freeze(s)
  const p = previewTransfer(s, action)
  const r = applyTransfer(s, action)
  assert.equal(p.code, code)
  assert.equal(r.code, code)
  assert.equal(r.ok, false)
  assert.equal(r.state, s)
  assert.ok(r.reason.length)
  assert.deepEqual(r.effects, [])
}
const sold = applyTransfer(state, sell(bench.id))
assert.equal(sold.ok, true)
assert.equal(sold.state.finance.budget, Math.round(signingFee(bench) / 2))
assert.equal(sold.state.finance.audit, 'preserved')
assert.equal(sold.state.lineup, state.lineup)
assert.equal(sold.state.faPool.at(-1).team, 'FA')
assert.equal(sold.state.faPool.at(-1).morale, 60)
assert.equal(sold.state.form[bench.id], undefined)
assert.equal(sold.state.teams[team.id].length, team.players.length - 1)
assert.ok(sold.state.lastEventLog.includes('free agency'))
assert.equal(sold.state.transferHistory[0].fee, sold.state.finance.budget)
assert.deepEqual(JSON.parse(JSON.stringify(sold.state)), sold.state)
assert.equal(selectTransferReport(sold.state, 2).saleIncome, sold.state.finance.budget)
assert.deepEqual(selectTransferReport(state, 2).transactions, [])
assert.equal(selectTransferReport(sold.state, 3).saleIncome, 0)
const promoted = applyTransfer(state, sell(starter.id))
assert.equal(promoted.state.lineup[starter.role], bench.id)
assert.equal(promoted.state.teams[team.id].find((p) => p.id === bench.id), bench)
assert.equal(promoted.effects[0].replacementId, bench.id)
const released = applyTransfer(state, release(bench.id))
assert.equal(released.state.finance, state.finance)
assert.equal(released.effects[0].fee, 0)
assert.equal(released.state.faPool.at(-1).morale, 60)
assert.equal(applyTransfer({ ...state, mode: 'season', career: null, finance: null }, release(bench.id)).ok, true)
assert.equal(applyTransfer({ ...state, mode: undefined, career: null }, release(bench.id)).ok, true)
denied(state, release(starter.id), 'STARTER_RELEASE')
denied(state, sell('missing'), 'PLAYER_NOT_FOUND')
denied({ ...state, finance: null }, sell(bench.id), 'FINANCE_UNAVAILABLE')
denied({ ...state, finance: { budget: NaN } }, sell(bench.id), 'FINANCE_UNAVAILABLE')
denied({ ...state, mode: 'season' }, sell(bench.id), 'SALE_CAREER_ONLY')
for (const mode of ['campaign', 'scenario', 'gauntlet', 'draft', 'igl']) {
  for (const action of [sell(bench.id), release(bench.id)]) denied({ ...state, mode }, action, 'MODE_UNSUPPORTED')
}
for (const action of [sell(bench.id), release(bench.id)]) {
  denied({ ...state, career: { status: 'retired' } }, action, 'CAREER_INACTIVE')
  denied({ ...state, sacked: true }, action, 'MANAGER_SACKED')
  denied({ ...state, matchSession: { phase: 'result' } }, action, 'MATCH_SESSION_OPEN')
}
const alone = { ...state, teams: { ...state.teams, [team.id]: team.players.filter((p) => p.id !== bench.id) } }
denied(alone, sell(starter.id), 'LAST_OF_ROLE')
denied(alone, release(starter.id), 'LAST_OF_ROLE')
// Multiple actual same-role fixtures: first available roster slot wins, not OVR.
const extra = TEAMS.flatMap((t) => t.players).find((p) => p.role === starter.role && p.team !== team.id)
const expanded = freeze({ ...state, teams: { ...state.teams, [team.id]: [...team.players, { ...extra, team: team.id }] } })
assert.equal(previewTransfer(expanded, sell(starter.id)).replacementId, bench.id)
denied({ ...state, lineup: { ...lineup, OTHER: bench.id } }, sell(starter.id), 'NO_REPLACEMENT')
denied({ ...state, lineup: { ...lineup, OTHER: starter.id } }, sell(starter.id), 'INVALID_LINEUP')
denied(sold.state, sell(bench.id), 'PLAYER_NOT_FOUND')
denied(state, { type: 'PLAY_ROUND' }, 'UNSUPPORTED_ACTION')
assert.equal(JSON.stringify(state), snapshot)
console.log('backend-transfers: all passed')
