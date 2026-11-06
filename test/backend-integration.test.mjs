import assert from 'node:assert/strict'
import { reducer as legacyReducer, mulberry32 } from '../src/game/useGameState.js'
import { createRosterBackend } from '../src/game/backend/composed.js'

// Use the real public reducer and all three concrete leaves.
const backend = createRosterBackend(legacyReducer)
const seed = n => { Math.random = mulberry32(n) }
function career() {
  seed(42)
  const s = backend.reducer(undefined, { type: 'START_CAREER', teamId: 'T1', managerName: 'Backend' })
  return { ...s, board: null, finance: { budget: 100000000 }, pendingEvent: null, pendingPromotion: null }
}
function ready(s) {
  return { ...s, finished: true, tournament: null, pendingEvent: null, pendingPromotion: null }
}
const originalRandom = Math.random
try {
  const start = career()
  const roster = start.teams[start.teamId]
  assert.ok(roster.every(p => p.joinedSeason === start.career.seasonIndex))
  const bench = roster.find(p => !Object.values(start.lineup).includes(p.id))
  assert.ok(bench)
  const sale = backend.transition(start, { type: 'SELL_PLAYER', playerId: bench.id })
  assert.equal(sale.ok, true)
  assert.equal(sale.state.faPool.find(p => p.id === bench.id).morale, 60)
  assert.ok(sale.state.finance.budget > start.finance.budget)
  assert.equal(start.teams[start.teamId].length, roster.length)
  const locked = { ...start, matchSession: { stage: 'result' } }
  const blocked = backend.transition(locked, { type: 'SELL_PLAYER', playerId: bench.id })
  assert.equal(blocked.ok, false)
  assert.equal(blocked.state, locked)
  assert.equal(backend.reducer(locked, { type: 'RESOLVE_PROMOTION', promote: false }), locked)

  const starterId = start.lineup[bench.role]
  const swapped = backend.transition(start, { type: 'SET_LINEUP', role: bench.role, playerId: bench.id })
  assert.equal(swapped.state.teams[start.teamId].find(p => p.id === bench.id).morale, bench.morale + 3)
  assert.equal(swapped.state.teams[start.teamId].find(p => p.id === starterId).morale,
    roster.find(p => p.id === starterId).morale - 4)
  const repeated = backend.transition(swapped.state, { type: 'SET_LINEUP', role: bench.role, playerId: bench.id })
  assert.equal(repeated.effects.length, 0)
  assert.deepEqual(repeated.state.teams, swapped.state.teams)

  const free = start.faPool[0]
  const signed = backend.transition(start, { type: 'SIGN', playerId: free.id })
  assert.equal(signed.state.teams[start.teamId].find(p => p.id === free.id).morale, 74)
  assert.equal(signed.state.teams[start.teamId].find(p => p.id === start.lineup[free.role]).morale,
    roster.find(p => p.id === start.lineup[free.role]).morale - 6)

  // Unrelated seeded play consumes the same RNG and produces exact legacy state.
  seed(812)
  const baselinePlay = legacyReducer(start, { type: 'PLAY_ROUND' })
  const baselineNextRandom = Math.random()
  seed(812)
  const backendPlay = backend.reducer(start, { type: 'PLAY_ROUND' })
  assert.deepEqual(backendPlay, baselinePlay)
  assert.equal(Math.random(), baselineNextRandom)

  // Compare post-placement state with explicit old-lineup classification. Force
  // a weaker starter so legacy's offseason reset chooses the stronger bench.
  const prepared = ready({ ...start, career: { ...start.career, seasonIndex: 2 },
    lineup: { ...start.lineup, [bench.role]: bench.id },
    teams: { ...start.teams, [start.teamId]: roster.map(p => ({ ...p, morale: 70, contract: 5, joinedSeason: 1 })) } })
  seed(888)
  const baselineAdvance = legacyReducer(prepared, { type: 'ADVANCE_SEASON' })
  const nextRandom = Math.random()
  seed(888)
  const advanced = backend.transition(prepared, { type: 'ADVANCE_SEASON' })
  assert.equal(Math.random(), nextRandom, 'adapter must not add global RNG draws')
  for (const p of advanced.state.teams[start.teamId]) {
    const base = baselineAdvance.teams[start.teamId].find(q => q.id === p.id)
    const expected = Object.values(prepared.lineup).includes(p.id) ? 2 : -3
    assert.equal(p.morale, Math.max(0, Math.min(100, base.morale + expected)), p.id)
  }
  assert.deepEqual(advanced.state.lineup, baselineAdvance.lineup)
  assert.ok(advanced.state.offseasonReport.morale.length)
  assert.equal(backend.reducer(start, { type: 'ADVANCE_SEASON' }), start, 'refusal preserves caller reference')
  // A midseason sale is reported next advance without paying the fee twice.
  seed(192)
  const report = backend.reducer(ready(sale.state), { type: 'ADVANCE_SEASON' }).offseasonReport.transfers
  assert.equal(report.transactions.length, 1)
  assert.equal(report.transactions[0].playerId, bench.id)
  assert.equal(report.saleIncome, sale.state.finance.budget - start.finance.budget)

  // Legacy saves start counting tenure now; the first advance cannot punish them.
  const oldSave = ready({ ...start, career: { ...start.career, seasonIndex: 9 },
    teams: { ...start.teams, [start.teamId]: roster.map(({ joinedSeason, ...p }) => p) } })
  seed(72)
  const migratedAdvance = backend.transition(oldSave, { type: 'ADVANCE_SEASON' })
  assert.equal(migratedAdvance.state.offseasonReport.morale.length, 0)
  assert.ok(migratedAdvance.state.teams[start.teamId].every(p => p.joinedSeason === 9))

  // A singular offer from an old save becomes persistent and explicit choices
  // replace the legacy weakest-bench cut. Decline retains exactly those IDs.
  const prospect = { ...bench, id: 'integration-academy', name: 'Academy test', academy: true }
  const offered = backend.migrate({ ...start, pendingPromotion: { teamId: start.teamId, player: prospect } }).state
  const decline = backend.transition(offered, { type: 'RESOLVE_PROMOTION', promote: false })
  assert.equal(decline.ok, true)
  assert.equal(decline.state.pendingPromotion, null)
  assert.ok(decline.state.academyByTeam[start.teamId].some(p => p.id === prospect.id))
  const promoted = backend.transition(offered, { type: 'RESOLVE_PROMOTION', promote: true,
    prospectId: prospect.id, cutId: bench.id })
  assert.equal(promoted.ok, true)
  assert.ok(promoted.state.teams[start.teamId].some(p => p.id === prospect.id))
  assert.equal(promoted.state.faPool.find(p => p.id === bench.id).morale, 60)
  assert.equal(promoted.state.teams[start.teamId].length, roster.length)
  // One continuous office lifecycle uses every leaf and a persisted save.
  let chain = backend.reducer(sale.state, { type: 'SIGN', playerId: free.id })
  function advanceWith(s, accepts) {
    const input = ready(s)
    for (let n = 1; n <= 100; n++) {
      seed(n)
      const baseline = legacyReducer(input, { type: 'ADVANCE_SEASON' })
      if (!accepts(baseline)) continue
      const rngAfterLegacy = Math.random()
      seed(n)
      const settled = backend.transition(input, { type: 'ADVANCE_SEASON' })
      assert.equal(Math.random(), rngAfterLegacy)
      assert.equal(settled.state.finance.budget, baseline.finance.budget, 'report cannot pay sale fee twice')
      return settled
    }
    throw new Error('No deterministic fixture found')
  }
  const firstYear = advanceWith(chain, s => !!s.pendingPromotion && !s.pendingEvent)
  assert.equal(firstYear.state.offseasonReport.morale.length, 0, 'first actual advance has no tenure')
  assert.equal(firstYear.state.offseasonReport.transfers.transactions.length, 1)
  chain = backend.reducer(firstYear.state, { type: 'RESOLVE_PROMOTION', promote: false })
  const held = chain.academyByTeam[chain.teamId].map(p => p.id)
  assert.ok(held.length >= 3)
  chain = backend.migrate(JSON.parse(JSON.stringify(chain))).state
  const secondYear = advanceWith(chain, s => !s.pendingPromotion && !s.pendingEvent)
  chain = secondYear.state
  assert.deepEqual(chain.pendingPromotion.prospectIds, held, 'a missed new roll reoffers persisted kids')
  assert.ok(chain.offseasonReport.morale.length, 'second actual advance applies tenure')
  assert.equal(chain.offseasonReport.transfers.transactions.length, 0, 'prior sale is not relisted as current season income')
  const choices = backend.selectAcademy(chain)
  const selectedProspect = choices.prospects[0]
  const selectedCut = choices.bench[0]
  const beforePromotion = chain
  chain = backend.reducer(chain, { type: 'RESOLVE_PROMOTION', promote: true,
    prospectId: selectedProspect.id, cutId: selectedCut.id })
  assert.equal(chain.finance.budget, beforePromotion.finance.budget)
  assert.equal(chain.faPool.find(p => p.id === selectedCut.id).morale, 60)
  const newcomer = chain.teams[chain.teamId].find(p => p.id === selectedProspect.id)
  assert.equal(newcomer.morale, 74)
  assert.equal(newcomer.joinedSeason, chain.career.seasonIndex)
  for (const p of chain.teams[chain.teamId].filter(p => p.id !== newcomer.id)) {
    assert.equal(p.morale, beforePromotion.teams[chain.teamId].find(q => q.id === p.id).morale)
  }
  for (const role of Object.keys(chain.lineup)) assert.ok(chain.teams[chain.teamId].some(p => p.role === role))
  const ownedIds = [...chain.teams[chain.teamId], ...chain.faPool, ...chain.academyByTeam[chain.teamId]].map(p => p.id)
  assert.equal(new Set(ownedIds).size, ownedIds.length)

  // A genuine legacy locker event delays, then reveals the persisted offer.
  const eventYear = advanceWith(chain, s => !!s.pendingEvent).state
  assert.equal(eventYear.pendingPromotion, null)
  const eventResolved = backend.transition(eventYear, { type: 'RESOLVE_EVENT', optionIndex: 0 })
  assert.equal(eventResolved.state.pendingEvent, null)
  assert.ok(eventResolved.state.pendingPromotion)
  assert.deepEqual(eventResolved.state.pendingPromotion.prospectIds,
    eventResolved.state.academyByTeam[eventResolved.state.teamId].map(p => p.id))

  // Placement clamps before a bench tenure penalty, even at the ceiling.
  const ceiling = ready({ ...prepared, playoffChampionId: prepared.teamId,
    teams: { ...prepared.teams, [prepared.teamId]: prepared.teams[prepared.teamId].map(p => ({ ...p, morale: 99 })) } })
  seed(91)
  const clamped = backend.reducer(ceiling, { type: 'ADVANCE_SEASON' })
  for (const p of clamped.teams[clamped.teamId]) {
    assert.equal(p.morale, Object.values(ceiling.lineup).includes(p.id) ? 100 : 97)
  }
  console.log('Backend real-reducer integration passed')
} finally {
  Math.random = originalRandom
}
