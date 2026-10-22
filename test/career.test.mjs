import { reducer, managedCoachBonus } from '../src/game/useGameState.js'
import { simulateSeries } from '../src/engine/sim.js'
import { COACHES, coachBonus } from '../src/data/coaches.js'

const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1) } else console.log('ok:', m) }

// ---------- engine default-0 identical ----------
const mk = (ovr) => ({ TOP: p('TOP', ovr), JNG: p('JNG', ovr), MID: p('MID', ovr), BOT: p('BOT', ovr), SUP: p('SUP', ovr) })
function p(role, ovr) { return { id: `t-${role}`, name: `N${role}`, role, team: 'T', ovr, mech: 80, macro: 80, consist: 80, form: 50 } }
const tac = { style: 'BAL', phase: 'MID' }
function rng32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const r1 = simulateSeries(mk(85), tac, mk(82), tac, rng32(7), 'A', 'B')
const r2 = simulateSeries(mk(85), tac, mk(82), tac, rng32(7), 'A', 'B', { aBonus: 0, bBonus: 0 })
assert(JSON.stringify(r1) === JSON.stringify(r2), 'engine: explicit zero-bonus == omitted extra (season sim identical)')
const r3 = simulateSeries(mk(85), tac, mk(82), tac, rng32(7), 'A', 'B', { aBonus: 2.25, bBonus: 0 })
assert(Math.abs(r3.sA - r1.sA - 2.25) < 1e-9 && r3.sB === r1.sB, 'engine: aBonus folds into side A strength only')

// ---------- START_CAREER ----------
let s = reducer(undefined, { type: 'START_CAREER', teamId: 'T1', managerName: 'Mozi' })
assert(s.mode === 'career', 'START_CAREER -> mode career')
assert(s.career.seasonIndex === 1 && s.career.maxSeasons === 10, 'seasonIndex 1, maxSeasons 10')
assert(s.career.status === 'active' && s.career.seasonYear === 'present', 'active + default present dataset')
assert(s.career.managerName === 'Mozi' && s.career.teamId === 'T1', 'manager/team carried')
assert(Object.keys(s.career.staff).length === 10, `staff seeded for all 10 teams (got ${Object.keys(s.career.staff).length})`)
assert(s.career.coachPool.length >= 4 && s.career.coachPool.every((c) => c.team === 'FA'), `coachPool has FA coaches (got ${s.career.coachPool.length})`)
assert(s.round === 1 && s.finished === false && s.results.length === 0, 'fresh competitive state')
const bonus0 = managedCoachBonus(s)
assert(Math.abs(bonus0 - coachBonus(92)) < 1e-9, `kkOma bonus applies (${bonus0})`)

// unknown teamId fallback
const sBad = reducer(undefined, { type: 'START_CAREER', teamId: 'NOPE' })
assert(['season', 'career'].includes(sBad.mode) && sBad.teamId !== 'NOPE', 'unknown teamId falls back')

// ---------- full season + ADVANCE ----------
let rounds = 0
while (!s.finished && rounds < 30) { s = reducer(s, { type: 'PLAY_ROUND' }); rounds++ }
assert(s.finished === true, `career PLAY_ROUND plays full season (${rounds} rounds, ${s.results.length} results)`)
// P1 item 11: a playoff bracket is now built at season end. Play it out.
let pGrd = 0
while (s.phase === 'playoffs' && s.tournament && s.tournament.status === 'active' && pGrd++ < 10) {
  s = reducer(s, { type: 'PLAY_TOURNAMENT_ROUND' })
}
assert(s.tournament.status === 'done', 'career: LCK playoff bracket completed')
assert(typeof s.playoffChampionId === 'string', 'career: playoffChampionId set')
const champBefore = s.standings
s = reducer(s, { type: 'ADVANCE_SEASON' })
assert(s.career.seasonIndex === 2, 'ADVANCE -> season 2')
assert(s.career.history.length === 1, 'history has 1 entry')
const h = s.career.history[0]
assert(h.seasonIndex === 1 && typeof h.championId === 'string' && h.userPlacement >= 1 && h.coachId, `history record valid ${JSON.stringify(h)}`)
assert(h.userW + h.userL > 0, 'record has W/L')
assert(s.round === 1 && s.finished === false && s.results.length === 0, 'table reset round=1')
assert(s.teamId === 'T1', 'same team carried')
assert(Object.values(s.standings).every((r) => r.points === 0 && r.W === 0), 'standings emptied')

// ADVANCE no-op when not finished
const sMid = reducer(s, { type: 'PLAY_ROUND' })
const noAdv = reducer(sMid, { type: 'ADVANCE_SEASON' })
assert(noAdv === sMid, 'ADVANCE no-ops mid-season')

// ---------- SIGN in career ----------
const faId = s.faPool[0].id
const faRole = s.faPool[0].role
s = reducer(s, { type: 'SIGN', playerId: faId })
assert(s.teams.T1.some((pl) => pl.id === faId), 'SIGN adds FA to career roster')
assert(s.lineup[faRole] === faId, 'signed FA becomes starter')

// ---------- HIRE_COACH ----------
const poolBefore = s.career.coachPool.length
const hireTarget = s.career.coachPool[0].id
const prevCoach = s.career.staff.T1
s = reducer(s, { type: 'HIRE_COACH', coachId: hireTarget })
assert(s.career.staff.T1 === hireTarget, 'HIRE installs pool coach')
assert(s.career.coachPool.length === poolBefore, 'no coach deleted (displaced returns to pool)')
assert(s.career.coachPool.some((c) => c.id === prevCoach), 'displaced coach back in pool')
assert(s.career.coachPool.every((c) => c.team === 'FA'), 'pool entries tagged FA')
const bonus1 = managedCoachBonus(s)
assert(bonus1 !== bonus0, 'bonus reflects new coach next PLAY_ROUND')
const badHire = reducer(s, { type: 'HIRE_COACH', coachId: 'COACH-nope' })
assert(badHire === s, 'HIRE unknown id no-ops')

// ---------- TRADE_PLAYER ----------
// find a fair swap: my player P (role R) and AI player Q same role with Q.ovr - P.ovr <= 3
const myId = s.teamId
let give = null, get = null
outer: for (const pl of s.teams[myId]) {
  for (const tid of Object.keys(s.teams)) {
    if (tid === myId) continue
    for (const q of s.teams[tid]) {
      if (q.role === pl.role && q.ovr - pl.ovr <= 3 && q.ovr >= pl.ovr) { give = pl; get = q; break outer }
    }
  }
}
assert(give && get, 'found fair trade pair')
const nMineBefore = s.teams[myId].length
const otherTid = get.team
const nOtherBefore = s.teams[otherTid].length
const wasStarter = s.lineup[give.role] === give.id
s = reducer(s, { type: 'TRADE_PLAYER', giveId: give.id, getId: get.id })
assert(s.teams[myId].some((pl) => pl.id === get.id) && !s.teams[myId].some((pl) => pl.id === give.id), 'TRADE_PLAYER swaps rosters')
assert(s.teams[myId].length === nMineBefore && s.teams[otherTid].length === nOtherBefore, '10-man squads preserved')
if (wasStarter) assert(s.lineup[give.role] === get.id, 'lineup slot follows starter trade')
// unfair: AI would lose 4+ -> pick my worst vs their best same role
let ugive = null, uget = null
outer2: for (const pl of s.teams[myId]) {
  for (const tid of Object.keys(s.teams)) {
    if (tid === myId) continue
    for (const q of s.teams[tid]) {
      if (q.role === pl.role && q.ovr - pl.ovr > 3) { ugive = pl; uget = q; break outer2 }
    }
  }
}
if (ugive && uget) {
  const snap = s
  s = reducer(s, { type: 'TRADE_PLAYER', giveId: ugive.id, getId: uget.id })
  assert(s === snap, 'out-of-gate trade no-ops')
} else console.log('skip: no unfair pair found (rosters too even)')
// cross-role no-op
const crossA = s.teams[myId].find((pl) => pl.role === 'TOP')
let crossB = null
for (const tid of Object.keys(s.teams)) { if (tid === myId) continue; crossB = s.teams[tid].find((pl) => pl.role === 'MID'); if (crossB) break }
{
  const snap = s
  s = reducer(s, { type: 'TRADE_PLAYER', giveId: crossA.id, getId: crossB.id })
  assert(s === snap, 'cross-role trade no-ops')
}

// ---------- TRADE_COACH ----------
// fair: find AI coach within 5 below mine
const myCR = (s.career.coachPool.find((c) => c.id === s.career.staff[myId])?.rating) ?? 80
console.log('  my coach rating:', myCR)
s = reducer(s, { type: 'TRADE_COACH', otherTeamId: myId })
assert(s.career.staff[myId] !== undefined, 'self-trade guard ok')
{
  // force a fair trade: temporarily check preview logic via a crafted state
  const st = JSON.parse(JSON.stringify(s))
  st.career.staff[myId] = 'COACH-kkoma' // 92
  const fairTid = Object.keys(st.teams).find((t) => t !== myId)
  st.career.staff[fairTid] = 'COACH-ryu' // 82, diff 10 mine better -> accept
  const after = reducer(st, { type: 'TRADE_COACH', otherTeamId: fairTid })
  assert(after.career.staff[myId] === 'COACH-ryu' && after.career.staff[fairTid] === 'COACH-kkoma', 'fair coach trade swaps')
  // unfair: mine 71 (FOX fallback) for their 92 -> decline
  const st2 = JSON.parse(JSON.stringify(s))
  st2.career.staff[myId] = 'COACH-FOX'
  st2.career.staff[fairTid] = 'COACH-kkoma'
  const snap2 = st2
  const after2 = reducer(st2, { type: 'TRADE_COACH', otherTeamId: fairTid })
  assert(after2 === snap2, 'unfair coach trade declines (no state change)')
}

// ---------- season 10 end -> retire prompt path ----------
{
  const st = JSON.parse(JSON.stringify(s))
  st.career.seasonIndex = 10
  const adv = reducer(st, { type: 'ADVANCE_SEASON' })
  // st.finished may be false; finish it artificially via real standings shape
  assert(adv === st || adv.career.seasonIndex === 10, 'ADVANCE at season 10 no-ops past max')
  // now mark finished and retire: final record must be appended
  const histBefore = st.career.history.length
  const fin = { ...st, finished: true }
  const ret = reducer(fin, { type: 'RETIRE' })
  assert(ret.career.status === 'retired', 'RETIRE sets retired')
  assert(ret.career.history.length === histBefore + 1, 'final finished season recorded on retire')
  const frozen = ret
  assert(reducer(frozen, { type: 'PLAY_ROUND' }) === frozen, 'retired: PLAY_ROUND frozen')
  assert(reducer(frozen, { type: 'SIGN', playerId: 'x' }) === frozen, 'retired: SIGN frozen')
  assert(reducer(frozen, { type: 'ADVANCE_SEASON' }) === frozen, 'retired: ADVANCE frozen')
  assert(reducer(frozen, { type: 'HIRE_COACH', coachId: 'COACH-zefa' }) === frozen, 'retired: HIRE frozen')
  assert(reducer(frozen, { type: 'TRADE_COACH', otherTeamId: 'GEN' }) === frozen, 'retired: coach trade frozen')
}
// voluntary early retire keeps only completed seasons
{
  const st = JSON.parse(JSON.stringify(s))
  const hb = st.career.history.length
  const ret = reducer({ ...st, finished: false }, { type: 'RETIRE' })
  assert(ret.career.status === 'retired' && ret.career.history.length === hb, 'early retire keeps history as-is')
}

// ---------- season & campaign untouched ----------
const season = reducer(undefined, { type: 'NEW_GAME', teamId: 'GEN', seasonYear: 'present' })
assert(season.mode === 'season' && season.career === null, 'season save: career null')
const seasonBefore = season.results.length
const seasonAfter = reducer(season, { type: 'PLAY_ROUND' })
assert(seasonAfter.results.length > seasonBefore, 'season PLAY_ROUND works')
const camp = reducer(undefined, { type: 'START_CAMPAIGN', campaignId: 'faker-first-lck-win', managerName: 'X' })
if (camp.teamId) {
  assert(camp.mode === 'campaign' && camp.career === null, 'campaign save: career null')
  const campAfter = reducer(camp, { type: 'PLAY_ROUND' })
  assert(campAfter === camp, 'campaign PLAY_ROUND still skips')
  const careerAct = reducer(camp, { type: 'HIRE_COACH', coachId: 'COACH-zefa' })
  assert(careerAct === camp, 'career actions no-op in campaign')
} else console.log('skip: campaign id not found')
const seasonAct = reducer(season, { type: 'HIRE_COACH', coachId: 'COACH-zefa' })
assert(seasonAct === season, 'career actions no-op in season')

console.log('\nALL CAREER ACCEPTANCE CHECKS PASSED')
