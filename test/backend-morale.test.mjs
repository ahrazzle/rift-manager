import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reducer, mulberry32 } from '../src/game/useGameState.js'
import { backfillJoinedSeason, applyOfficeMorale, applyTenureMorale } from '../src/game/backend/morale.js'

function fixture() {
  const random = Math.random
  Math.random = mulberry32(44)
  try { return reducer(undefined, { type: 'START_CAREER', teamId: 'T1', managerName: 'Morale' }) }
  finally { Math.random = random }
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(freeze)
  }
  return value
}
const player = (s, id) => s.teams[s.teamId].find(p => p.id === id)
const office = (s, action) => applyOfficeMorale(s, reducer(s, action), action)
function withBench(s) {
  const starter = player(s, s.lineup.TOP)
  return { ...s, teams: { ...s.teams, T1: [...s.teams.T1, { ...starter, id: 'bench', name: 'Bench', morale: 70 }] } }
}

test('migration is additive, immutable, idempotent and JSON save/load stable', () => {
  const s = freeze(fixture())
  const result = backfillJoinedSeason(s)
  assert.ok(result.ok)
  assert.ok(result.state.teams.T1.every(p => p.joinedSeason === 1))
  assert.ok(s.teams.T1.every(p => p.joinedSeason === undefined))
  assert.equal(result.state.form, s.form)
  assert.equal(result.state.teams.GEN, s.teams.GEN)
  assert.equal(backfillJoinedSeason(result.state).state, result.state)
  const loaded = JSON.parse(JSON.stringify(result.state))
  assert.equal(backfillJoinedSeason(loaded).state, loaded)
  const old = { ...s, career: { ...s.career, seasonIndex: 8 } }
  assert.ok(backfillJoinedSeason(old).state.teams.T1.every(p => p.joinedSeason === 8))
  for (const mode of ['season', 'campaign', 'draft']) {
    const other = { ...s, mode }
    assert.equal(backfillJoinedSeason(other).state, other)
  }
})

test('SIGN sets 74, displaced -6 only and preserves legacy finance/form', () => {
  const s = freeze(fixture())
  const incoming = s.faPool[0]
  const action = { type: 'SIGN', playerId: incoming.id }
  const legacy = reducer(s, action)
  const result = applyOfficeMorale(s, legacy, action)
  assert.equal(player(result.state, incoming.id).morale, 74)
  assert.equal(player(result.state, incoming.id).joinedSeason, 1)
  const old = s.lineup[incoming.role]
  assert.equal(player(result.state, old).morale, player(s, old).morale - 6)
  assert.equal(result.state.finance, legacy.finance)
  assert.equal(result.state.form, legacy.form)
  assert.equal(result.effects.length, 2)
  assert.match(result.state.lastEventLog, /losing the starting spot/)
  for (const p of s.teams.T1) if (p.id !== old) assert.equal(player(result.state, p.id), p)
  const again = office(result.state, action)
  assert.equal(again.state, result.state)
  assert.deepEqual(again.effects, [])
  const noSlot = { ...s, lineup: { ...s.lineup, [incoming.role]: undefined } }
  assert.equal(office(noSlot, action).effects.length, 1)
  const broke = { ...s, finance: { budget: 0 } }
  assert.equal(office(broke, action).state, broke)
})

test('lineup changes -4/+3, reverses, clamps and refuses noop/invalid', () => {
  const s = freeze(withBench(fixture()))
  const oldId = s.lineup.TOP
  const action = { type: 'SET_LINEUP', role: 'TOP', playerId: 'bench' }
  const first = office(s, action)
  assert.equal(player(first.state, oldId).morale, player(s, oldId).morale - 4)
  assert.equal(player(first.state, 'bench').morale, 73)
  assert.equal(first.state.form, s.form)
  const second = office(first.state, { ...action, playerId: oldId })
  assert.equal(player(second.state, oldId).morale, player(s, oldId).morale - 1)
  assert.equal(player(second.state, 'bench').morale, 69)
  assert.equal(second.state.lastEventLog, second.effects.map(e => e.message).join(' '))
  for (const invalid of [{ ...action, playerId: oldId }, { ...action, playerId: 'missing' }, { ...action, role: 'MID' }]) {
    const result = office(s, invalid)
    assert.equal(result.state, s)
    assert.equal(result.ok, false)
    assert.deepEqual(result.effects, [])
  }
  const edge = { ...s, teams: { ...s.teams, T1: s.teams.T1.map(p => ({ ...p, morale: p.id === 'bench' ? 99 : 2 })) } }
  const clamped = office(edge, action)
  assert.equal(player(clamped.state, oldId).morale, 0)
  assert.equal(player(clamped.state, 'bench').morale, 100)
  assert.deepEqual(clamped.effects.map(e => e.delta).sort(), [-2, 1])
})

test('trade incoming only, starter or bench, new tenure even if veteran elsewhere', () => {
  for (const bench of [false, true]) {
    let s = withBench(fixture())
    const outgoing = player(s, bench ? 'bench' : s.lineup.TOP)
    const incoming = { ...outgoing, id: 'trade-target', team: 'GEN', morale: 80, joinedSeason: 1 }
    s = freeze({ ...s, career: { ...s.career, seasonIndex: 5 }, teams: { ...s.teams, GEN: [incoming] } })
    const result = office(s, { type: 'TRADE_PLAYER', giveId: outgoing.id, getId: incoming.id })
    assert.ok(result.ok)
    assert.equal(player(result.state, incoming.id).morale, 83)
    assert.equal(player(result.state, incoming.id).joinedSeason, 5)
    assert.equal(result.effects.length, 1)
    assert.equal(result.state.lineup.TOP, bench ? s.lineup.TOP : incoming.id)
    for (const p of s.teams.T1) if (p.id !== outgoing.id) assert.equal(player(result.state, p.id), p)
    const season = { ...s, mode: 'season' }
    assert.equal(office(season, { type: 'TRADE_PLAYER', giveId: outgoing.id, getId: incoming.id }).state, season)
  }
})

test('tenure fires on second Advance, after placement, using PRE-reset lineup', () => {
  const s = freeze(backfillJoinedSeason(withBench(fixture())).state)
  const first = applyTenureMorale(s, { completedSeasonIndex: 1, lineup: s.lineup })
  assert.equal(first.state, s)
  assert.deepEqual(first.effects, [])
  // Placement already raised everyone to 99. A later auto-lineup reset must not
  // make the old bench a veteran starter when this lifecycle hook runs.
  const placed = freeze({ ...s, lineup: { ...s.lineup, TOP: 'bench' }, teams: { ...s.teams, T1: s.teams.T1.map(p => ({ ...p, morale: 99 })) } })
  const second = applyTenureMorale(placed, { completedSeasonIndex: 2, lineup: s.lineup })
  assert.equal(player(second.state, s.lineup.TOP).morale, 100)
  assert.equal(player(second.state, 'bench').morale, 96)
  assert.equal(second.state.form, s.form)
  assert.match(second.state.lastEventLog, /long service on the bench/)
  assert.ok(second.effects.every(e => typeof e.message === 'string' && Number.isFinite(e.delta)))
  assert.deepEqual(JSON.parse(JSON.stringify(second.effects)), second.effects)
})

test('old saves and invalid tenure do not invent veterans; mode boundaries', () => {
  const s = freeze(withBench(fixture()))
  const result = applyTenureMorale(s, { completedSeasonIndex: 8, lineup: s.lineup })
  assert.ok(result.state.teams.T1.every(p => p.joinedSeason === 8))
  assert.deepEqual(result.effects, [])
  for (const args of [undefined, {}, { completedSeasonIndex: 2 }, { completedSeasonIndex: 0, lineup: {} }]) {
    const refused = applyTenureMorale(s, args)
    assert.equal(refused.state, s)
    assert.equal(refused.ok, false)
  }
  const season = { ...s, mode: 'season' }
  assert.equal(applyTenureMorale(season).state, season)
  const unknown = { ...s }
  assert.equal(applyOfficeMorale(s, unknown, { type: 'PLAY_ROUND' }).state, unknown)
  const retired = { ...s, career: { ...s.career, status: 'retired' } }
  assert.equal(applyTenureMorale(retired, { completedSeasonIndex: 8, lineup: s.lineup }).state, retired)
  assert.equal(office(retired, { type: 'SIGN', playerId: s.faPool[0].id }).state, retired)
})
