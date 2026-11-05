// P0 engine tests (items 2/3/5): resolver modes, per-game array, development.
// Run: node test/p0-engine.test.mjs
import { simulateSeries } from '../src/engine/sim.js'
import { growthByAge, POTENTIAL_CEILING, ageCeiling, growthRoll, developPlayer, growthOutlook } from '../src/data/development.js'
import { makePlayer } from '../src/data/lck.js'
import { reducer } from '../src/game/useGameState.js'

let failures = 0
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); failures++ } else console.log('ok  :', m) }
const mk = (ovr) => ({ TOP: p('TOP', ovr), JNG: p('JNG', ovr), MID: p('MID', ovr), BOT: p('BOT', ovr), SUP: p('SUP', ovr) })
function p(role, ovr) { return { id: `t-${role}`, name: `N${role}`, role, team: 'T', ovr, mech: 80, macro: 80, consist: 80, form: 50 } }
const tac = { style: 'BAL', phase: 'MID' }
function rng32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

// ---------- (i) default (no extra) byte-identical across 500 seeds ----------
let identical = true
for (let s = 0; s < 500; s++) {
  const a = simulateSeries(mk(85), tac, mk(82), tac, rng32(s), 'A', 'B')
  const b = simulateSeries(mk(85), tac, mk(82), tac, rng32(s), 'A', 'B', {})
  const c = simulateSeries(mk(85), tac, mk(82), tac, rng32(s), 'A', 'B', { simMode: 'biased', forcedWinner: null })
  if (JSON.stringify(a) !== JSON.stringify(b) || JSON.stringify(a) !== JSON.stringify(c)) { identical = false; break }
  if (!(a.winner && (a.aWins === 2 || a.bWins === 2) && a.games.length === a.aWins + a.bWins)) { identical = false; break }
}
assert(identical, '(i) default/no-extra/biased identical for 500 seeds, games.length === aWins+bWins')

// ---------- (ii) random: ratings ignored, ~50/50 ----------
let aGameWins = 0, totalGames = 0
const STACKED_A = mk(99), WEAK_B = mk(45)
for (let s = 0; s < 1000; s++) {
  const r = simulateSeries(STACKED_A, tac, WEAK_B, tac, rng32(9000 + s), 'A', 'B', { simMode: 'random' })
  for (const g of r.games) { totalGames++; if (g.winner === 'A') aGameWins++ }
  // determinism: same seed recomputes byte-identical
  const r2 = simulateSeries(STACKED_A, tac, WEAK_B, tac, rng32(9000 + s), 'A', 'B', { simMode: 'random' })
  if (JSON.stringify(r) !== JSON.stringify(r2)) { assert(false, 'random recompute deterministic'); break }
}
const share = aGameWins / totalGames
assert(share > 0.45 && share < 0.55, `(ii) random ignores ratings: stacked A wins ${((share) * 100).toFixed(1)}% of ${totalGames} games (~50/50)`)
// biased with the same stacked matchup almost always favors A (sanity that random differs)
let biasedA = 0
for (let s = 0; s < 200; s++) { if (simulateSeries(STACKED_A, tac, WEAK_B, tac, rng32(s), 'A', 'B').winner === 'A') biasedA++ }
assert(biasedA > 190, `(ii) sanity: biased stacked matchup A wins ${biasedA}/200 series`)

// ---------- (iii) manual ----------
const mA = simulateSeries(mk(60), tac, mk(95), tac, rng32(1), 'A', 'B', { simMode: 'manual', forcedWinner: 'A' })
assert(mA.aWins === 2 && mA.bWins === 0 && mA.winner === 'A', "(iii) manual forcedWinner 'A' -> 2-0 A")
const mB = simulateSeries(mk(95), tac, mk(60), tac, rng32(1), 'A', 'B', { simMode: 'manual', forcedWinner: 'B' })
assert(mB.aWins === 0 && mB.bWins === 2 && mB.winner === 'B', "(iii) manual forcedWinner 'B' -> 0-2 B")
const mFall = simulateSeries(mk(85), tac, mk(82), tac, rng32(3), 'A', 'B', { simMode: 'manual' })
assert((mFall.winner === 'A' || mFall.winner === 'B') && mFall.games.length === mFall.aWins + mFall.bWins, '(iii) manual w/o forcedWinner falls back to biased (winner set)')
const mFall2 = simulateSeries(mk(85), tac, mk(82), tac, rng32(3), 'A', 'B', { simMode: 'manual', forcedWinner: 'X' })
assert(JSON.stringify(mFall) === JSON.stringify(mFall2), '(iii) manual invalid forcedWinner == missing (biased fallback)')

// ---------- (iv) games.length invariant in all modes ----------
let inv = true
for (let s = 0; s < 300; s++) {
  for (const extra of [{}, { simMode: 'random' }, { simMode: 'manual', forcedWinner: 'A' }, { simMode: 'manual', forcedWinner: 'B' }]) {
    const r = simulateSeries(mk(80 + (s % 10)), tac, mk(80), tac, rng32(s), 'A', 'B', extra)
    if (r.games.length !== r.aWins + r.bWins) { inv = false; break }
  }
}
assert(inv, '(iv) games.length === aWins+bWins in all modes (1200 series)')

// ---------- (v) developPlayer ----------
assert(POTENTIAL_CEILING === 99, 'POTENTIAL_CEILING is 99')
assert(ageCeiling(21, 88) === 88 && ageCeiling(34, 99) === 99, 'ageCeiling = min(99, potential)')
assert(JSON.stringify(growthByAge[16]) === '[3,8]' && JSON.stringify(growthByAge[34]) === '[-8,-2]', 'growth table endpoints exact')
let rollOk = true
for (let i = 0; i < 500; i++) {
  const r16 = growthRoll(16, rng32(i)); if (r16 < 3 || r16 > 8) rollOk = false
  const r34 = growthRoll(34, rng32(i)); if (r34 < -8 || r34 > -2) rollOk = false
  const r99 = growthRoll(99, rng32(i)); if (r99 < -8 || r99 > -2) rollOk = false // 35+ reuses 34
}
assert(rollOk, 'growthRoll ranges (16 / 34 / 99)')
const teen = { id: 'x', name: 'X', role: 'MID', team: 'T', ovr: 70, mech: 70, macro: 70, consist: 70, form: 50, age: 16, potential: 95 }
const grown = developPlayer(teen, rng32(42))
assert(grown.age === 17, 'developPlayer increments age')
assert(grown.ovr >= 73 && grown.ovr <= 78, `16yo grows + (70 -> ${grown.ovr})`)
assert(grown.potential === 95, 'potential unchanged')
assert(teen.age === 16 && teen.ovr === 70, 'developPlayer does not mutate')
const vet = { ...teen, age: 34, ovr: 90, potential: 90 }
const old = developPlayer(vet, rng32(7))
assert(old.ovr <= 90 && old.ovr >= 82, `34yo declines (90 -> ${old.ovr})`)
const capped = developPlayer({ ...teen, age: 20, ovr: 94, potential: 95 }, () => 0.999)
assert(capped.ovr <= 95, `ovr capped at potential ceiling (${capped.ovr} <= 95)`)
assert(growthOutlook({ age: 17, ovr: 70, potential: 90 }) === 'rising', 'growthOutlook rising for teen headroom')
assert(growthOutlook({ age: 24, ovr: 90, potential: 90 }) === 'at ceiling', 'growthOutlook at ceiling when ovr >= potential')

// ---------- makePlayer age/potential ----------
const np = makePlayer('T1', 'Rookie', 'MID', 85, true)
assert(np.age === 21 && np.potential === Math.max(45, Math.min(99, np.ovr + 5)), 'makePlayer defaults age 21, potential ovr+5')
const np2 = makePlayer('T1', 'Rookie', 'MID', 85, true)
assert(np2.ovr === np.ovr && np2.mech === np.mech, 'makePlayer ratings byte-identical for existing callers')

// ---------- (vi) tournament resolver + ADVANCE_SEASON via reducer ----------
let s = reducer(undefined, { type: 'START_CAREER', teamId: 'T1', managerName: 'Mozi' })
let guard = 0
while (!s.finished && guard++ < 60) s = reducer(s, { type: 'PLAY_ROUND' })
assert(s.finished, 'career regional season completes')
s = reducer(s, { type: 'BUILD_TOURNAMENT', kind: 'msi' })
assert(s.tournament && s.tournament.resolver === 'biased', "(vi) buildTournamentObject default resolver 'biased'")
s = reducer(s, { type: 'SET_RESOLVER', resolver: 'random' })
assert(s.tournament.resolver === 'random', 'SET_RESOLVER flips while active')
const bad = reducer(s, { type: 'SET_RESOLVER', resolver: 'bogus' })
assert(bad.tournament.resolver === 'random', 'SET_RESOLVER ignores invalid value')
s = reducer(s, { type: 'PLAY_TOURNAMENT_ROUND' })
assert(s.tournament.rounds[0].matches.every((m) => m.detail && m.detail.simMode === 'random'), 'PLAY_TOURNAMENT_ROUND threads random via detail.simMode')
assert(s.tournament.resolver === 'random', 'resolver preserved across rounds')
// finish tournament, then SET_RESOLVER must no-op when done
s = reducer(s, { type: 'PLAY_TOURNAMENT_ROUND' })
s = reducer(s, { type: 'PLAY_TOURNAMENT_ROUND' })
assert(s.tournament.status === 'done', 'tournament completes')
const after = reducer(s, { type: 'SET_RESOLVER', resolver: 'biased' })
assert(after.tournament.resolver === s.tournament.resolver, 'SET_RESOLVER no-op when not active')
// BUILD_TOURNAMENT validates resolver
const preAges = {}
for (const tid of Object.keys(s.teams)) for (const pl of s.teams[tid]) preAges[pl.id] = pl.age
const preFa = new Map(s.faPool.map((pl) => [pl.id, pl.age]))
const prePot = {}
for (const tid of Object.keys(s.teams)) for (const pl of s.teams[tid]) prePot[pl.id] = pl.potential
const preAll = new Map()
const prePotAll = new Map()
for (const tid of Object.keys(s.teams)) for (const pl of s.teams[tid]) { preAll.set(pl.id, pl.age); prePotAll.set(pl.id, pl.potential) }
for (const pl of s.faPool) { preAll.set(pl.id, pl.age); prePotAll.set(pl.id, pl.potential) }
s = reducer(s, { type: 'ADVANCE_SEASON' })
let devOk = s.career.seasonIndex === 2
for (const tid of Object.keys(s.teams)) for (const pl of s.teams[tid]) {
  if (pl.age !== preAll.get(pl.id) + 1) devOk = false
  if (pl.potential !== prePotAll.get(pl.id)) devOk = false
}
for (const pl of s.faPool) {
  if (!preAll.has(pl.id)) continue // offseason refresh adds new prospects
  if (pl.age !== preAll.get(pl.id) + 1) devOk = false
}
assert(devOk, 'ADVANCE_SEASON applies developPlayer to teams+faPool (age+1, potential fixed)')
assert(s.offseasonReport && s.offseasonReport.roster.length > 0, 'ADVANCE_SEASON captures offseasonReport roster')
assert(s.lineup && Object.keys(s.lineup).length === 5, 'lineup rebuilt after development')

if (failures > 0) { console.error(`${failures} FAILURE(S)`); process.exit(1) }
console.log('p0-engine: all passed')
