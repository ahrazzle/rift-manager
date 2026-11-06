import assert from 'node:assert/strict'
import { TEAMS, ROLES } from '../src/data/lck.js'
import { buildAcademyPlayer } from '../src/data/academy.js'
import { mulberry32 } from '../src/game/random.js'
import { migrateAcademy, selectAcademy, offerAcademy, afterAcademyAdvance, resolveAcademy } from '../src/game/backend/academy.js'
const freeze = (x) => { if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.values(x).forEach(freeze); Object.freeze(x) }; return x }
const team = TEAMS.find((t) => t.players.length > 5)
const lineup = Object.fromEntries(ROLES.map((r) => [r, team.players.find((p) => p.role === r).id]))
const kid = buildAcademyPlayer(team.id, team.tier, 'MID', mulberry32(12))
const base = freeze({ mode: 'career', teamId: team.id, career: { status: 'active', seasonIndex: 1 }, teams: { [team.id]: team.players }, teamMeta: { [team.id]: team }, lineup, faPool: [], form: Object.fromEntries(team.players.map((p) => [p.id, 55])), pendingPromotion: null, pendingEvent: null })
const old = freeze({ ...base, pendingPromotion: { player: kid, teamId: team.id } })
const migrated = migrateAcademy(old)
assert.equal(migrated.academyByTeam[team.id][0].id, kid.id)
assert.equal(migrateAcademy(migrated), migrated)
assert.equal(migrated.pendingPromotion.prospectIds[0], kid.id)
const decline = resolveAcademy(old, { type: 'RESOLVE_PROMOTION', promote: false }).state
assert.equal(decline.academyByTeam[team.id][0].id, kid.id)
assert.equal(decline.pendingPromotion, null)
assert.equal(offerAcademy(decline).state, decline)
const missedNext = freeze({ ...decline, career: { ...base.career, seasonIndex: 2 } })
const reoffer = afterAcademyAdvance(decline, missedNext).state
assert.deepEqual(reoffer.pendingPromotion.prospectIds, [kid.id])
assert.equal(reoffer.academyByTeam, decline.academyByTeam)
const locker = freeze({ ...missedNext, pendingEvent: { id: 'locker' } })
assert.equal(afterAcademyAdvance(decline, locker).state, locker)
assert.ok(offerAcademy({ ...locker, pendingEvent: null }).state.pendingPromotion)
assert.equal(afterAcademyAdvance(base, base).state, base)
const noOffer = freeze({ ...base, career: { ...base.career, seasonIndex: 2 } })
const savedRandom = Math.random
Math.random = () => { throw Error('Unexpected global RNG use') }
let hit
try {
  assert.equal(afterAcademyAdvance(base, noOffer).state, noOffer)
  hit = afterAcademyAdvance(decline, { ...missedNext, pendingPromotion: { player: kid, teamId: team.id } }).state
} finally { Math.random = savedRandom }
assert.equal(hit.academyByTeam[team.id].length, 3)
assert.equal(hit.academyByTeam[team.id][0].id, kid.id)
assert.equal(new Set(hit.academyByTeam[team.id].map((p) => p.id)).size, 3)
assert.deepEqual(afterAcademyAdvance(decline, { ...missedNext, pendingPromotion: { player: kid, teamId: team.id } }).state, hit)
assert.equal(afterAcademyAdvance(decline, hit).state, hit)
const bench = selectAcademy(hit).bench[0]
const action = { type: 'RESOLVE_PROMOTION', promote: true, prospectId: kid.id, cutId: bench.id }
freeze(hit)
const promoted = resolveAcademy(hit, action)
assert.equal(promoted.ok, true)
assert.equal(promoted.state.teams[team.id].length, team.players.length)
assert.equal(promoted.state.faPool.at(-1).id, bench.id)
assert.equal(promoted.state.faPool.at(-1).morale, 60)
assert.equal(promoted.state.form[bench.id], undefined)
assert.equal(promoted.state.form[kid.id], 50)
assert.equal(promoted.state.lineup, hit.lineup)
const joined = promoted.state.teams[team.id].find((p) => p.id === kid.id)
assert.equal(joined.morale, 74)
assert.equal(joined.joinedSeason, 2)
assert.equal(joined.potential, kid.potential)
assert.equal(joined.mech, kid.mech)
assert.equal('academy' in joined, false)
assert.equal(promoted.state.academyByTeam[team.id].length, 2)
assert.deepEqual(JSON.parse(JSON.stringify(promoted.state)), promoted.state)
function refused(s, a, code) {
  freeze(s)
  const r = resolveAcademy(s, a)
  assert.equal(r.state, s)
  assert.equal(r.code, code)
  assert.ok(r.reason)
  assert.deepEqual(r.effects, [])
}
refused(promoted.state, action, 'NO_OFFER')
refused(hit, { ...action, cutId: lineup.TOP }, 'STARTER_PROTECTED')
refused(hit, { type: 'RESOLVE_PROMOTION', promote: true }, 'EXPLICIT_SELECTION_REQUIRED')
refused(hit, { ...action, prospectId: 'missing' }, 'PROSPECT_NOT_FOUND')
refused(hit, { ...action, cutId: 'missing' }, 'CUT_NOT_FOUND')
refused({ ...hit, pendingEvent: {} }, action, 'LOCKER_EVENT_PENDING')
refused({ ...hit, matchSession: {} }, action, 'MATCH_SESSION_OPEN')
for (const mode of ['season', 'campaign', 'gauntlet']) {
  const s = { ...hit, mode }
  refused(s, action, 'CAREER_INACTIVE')
  assert.equal(migrateAcademy(s), s)
  assert.equal(offerAcademy(s).state, s)
}
const noBench = freeze({ ...hit, teams: { [team.id]: team.players.filter((p) => Object.values(lineup).includes(p.id)) } })
refused(noBench, action, 'NO_BENCH')
const kept = resolveAcademy(noBench, { type: 'RESOLVE_PROMOTION', declineAll: true }).state
assert.equal(kept.pendingPromotion, null)
assert.equal(kept.academyByTeam, noBench.academyByTeam)
assert.ok(kept.lastEventLog.includes('no bench'))
const report = resolveAcademy({ ...hit, offseasonReport: { seasonIndexCompleted: 1 } }, action).state.offseasonReport
assert.equal(report.academyPromotions[0].cutName, bench.name)
assert.equal(report.academyPromotions[0].playerName, kid.name)
console.log('backend-academy: all passed')

const contractual = { ...hit, academyByTeam: { [team.id]: hit.academyByTeam[team.id].map((p) => p.id === kid.id ? { ...p, contract: 4 } : p) } }
assert.equal(resolveAcademy(contractual, action).state.teams[team.id].find((p) => p.id === kid.id).contract, 4)
refused({ ...hit, sacked: true }, action, 'CAREER_INACTIVE')
refused({ ...hit, career: { ...hit.career, status: 'retired' } }, action, 'CAREER_INACTIVE')
const uniqueBenchRole = { ...hit, teams: { [team.id]: team.players.filter((p) => p.role !== bench.role || p.id === bench.id) } }
if (kid.role !== bench.role) refused(uniqueBenchRole, action, 'LAST_OF_ROLE')
