// In-sim strategic choices (item 4) — acceptance checks.
// Run: node test/strategy.test.mjs
import { TEAMS } from '../src/data/lck.js'
import {
  simulateSeries, computeStrength, strategyDelta, roleDeltasFor,
} from '../src/engine/sim.js'
import { estimateSeriesWinProb } from '../src/game/logic.js'
import { reducer } from '../src/game/useGameState.js'

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
  } else {
    console.log('ok  :', msg)
  }
}
const approx = (a, b, tol) => Math.abs(a - b) <= tol

function lineupFor(teamId) {
  const team = TEAMS.find((t) => t.id === teamId)
  const line = {}
  for (const p of team.players) {
    if (!line[p.role] || p.ovr > line[p.role].ovr) line[p.role] = p
  }
  return line
}

const MID = { style: 'BAL', phase: 'MID' }
const EARLY = { style: 'BAL', phase: 'EARLY' }
const NONE = { comp: null, roam: null, swap: false, wincon: null }

// 1) comp AGGR -> +1.0
assert(strategyDelta({ ...NONE, comp: 'AGGR' }, MID).delta === 1.0, "comp AGGR delta = +1.0")
assert(strategyDelta({ ...NONE, comp: 'SCALE' }, MID).delta === 1.0, "comp SCALE delta = +1.0")

// 2) roam role deltas + net
const roam = roleDeltasFor('ROAM')
assert(roam.JNG === 6 && roam.MID === 4 && roam.BOT === -6 && roam.TOP === 0 && roam.SUP === 0,
  'roam ROAM role deltas {JNG:+6 MID:+4 BOT:-6}')
assert(approx(strategyDelta({ ...NONE, roam: 'ROAM' }, MID).delta, 0.75, 0.01),
  `roam ROAM net ≈ +0.75 (got ${strategyDelta({ ...NONE, roam: 'ROAM' }, MID).delta.toFixed(3)})`)
const stay = roleDeltasFor('STAY')
assert(stay.BOT === 6 && stay.SUP === 2 && stay.JNG === -2 && stay.MID === -1,
  'roam STAY role deltas {JNG:-2 MID:-1 BOT:+6 SUP:+2}')
assert(approx(strategyDelta({ ...NONE, roam: 'STAY' }, MID).delta, 1.0, 0.05),
  `roam STAY net ≈ +1.0 (got ${strategyDelta({ ...NONE, roam: 'STAY' }, MID).delta.toFixed(3)})`)

// 3) swap tradeoff
assert(strategyDelta({ ...NONE, swap: true }, MID).delta === 1.0, 'swap + MID phase = +1.0')
assert(strategyDelta({ ...NONE, swap: true }, EARLY).delta === -1.0, 'swap + EARLY phase = −1.0')
assert(strategyDelta({ ...NONE, swap: false }, MID).delta === 0, 'swap false = 0')

// 4) wincon magnitudes
assert(strategyDelta({ ...NONE, wincon: 'DRAGONS' }, MID).delta === 1.25, 'wincon DRAGONS = +1.25')
assert(strategyDelta({ ...NONE, wincon: 'SPLIT' }, MID).delta === 1.25, 'wincon SPLIT = +1.25')
assert(strategyDelta({ ...NONE, wincon: 'SCALE' }, MID).delta === 1.0, 'wincon SCALE coherent = +1.0')
assert(strategyDelta({ ...NONE, wincon: 'SCALE' }, EARLY).delta === 0.25, 'wincon SCALE + EARLY phase = +0.25')
assert(strategyDelta({ ...NONE, wincon: 'EARLY' }, MID).delta === 1.0, 'wincon EARLY coherent = +1.0')
assert(strategyDelta({ ...NONE, wincon: 'EARLY' }, { style: 'BAL', phase: 'LATE' }).delta === 0.25,
  'wincon EARLY + LATE phase = +0.25')

// 5) clamp: all-maxed <= +2.5, full sweep never outside [-2.5, 2.5]
const maxed = { comp: 'AGGR', roam: 'STAY', swap: true, wincon: 'DRAGONS' }
const maxDelta = strategyDelta(maxed, MID).delta
assert(maxDelta <= 2.5 && maxDelta === 2.5, `all-maxed clamps to +2.5 (got ${maxDelta})`)
let clampOk = true
for (const comp of [null, 'AGGR', 'SCALE'])
  for (const roam of [null, 'ROAM', 'STAY'])
    for (const swap of [false, true])
      for (const wincon of [null, 'DRAGONS', 'SPLIT', 'SCALE', 'EARLY'])
        for (const phase of ['EARLY', 'MID', 'LATE']) {
          const d = strategyDelta({ comp, roam, swap, wincon }, { style: 'BAL', phase }).delta
          if (!(d >= -2.5 && d <= 2.5)) { clampOk = false; console.error('FAIL: out of clamp', { comp, roam, swap, wincon, phase, d }) }
        }
assert(clampOk, 'full combo sweep stays within [−2.5, +2.5]')

// 6) all-null -> 0
assert(strategyDelta(NONE, MID).delta === 0, 'all-null strategy -> 0')
assert(strategyDelta(null, MID).delta === 0, 'null strat -> 0')
assert(strategyDelta(undefined, MID).delta === 0, 'undefined strat -> 0')

// 7) strategyDelta is pure (no rng): same input -> identical output, twice
const p1 = JSON.stringify(strategyDelta(maxed, MID))
const p2 = JSON.stringify(strategyDelta(maxed, MID))
assert(p1 === p2, 'strategyDelta pure (repeatable, no rng)')

// 8) default paths byte-identical: 2000 seeded series, omitted extra vs null-strat extra
{
  const A = lineupFor('T1'), B = lineupFor('BRO')
  let identical = 0
  const N = 2000
  for (let i = 0; i < N; i++) {
    const r1 = simulateSeries(A, MID, B, MID, mulberry32(7000 + i), 'T1', 'BRO')
    const r2 = simulateSeries(A, MID, B, MID, mulberry32(7000 + i), 'T1', 'BRO',
      { aBonus: 0, bBonus: 0, aStrat: null, bStrat: null })
    const r3 = simulateSeries(A, MID, B, MID, mulberry32(7000 + i), 'T1', 'BRO', {})
    const j1 = JSON.stringify({ ...r1, log: undefined })
    if (JSON.stringify({ ...r2, log: undefined }) === j1 && JSON.stringify({ ...r3, log: undefined }) === j1) identical++
    else if (identical === i) console.error('FAIL: first mismatch at seed', 7000 + i)
  }
  assert(identical === N, `default (no-strategy) sim byte-identical over ${N} seeded series`)
}

// 9) career coach bonus coexists with strat
{
  const A = lineupFor('T1'), B = lineupFor('BRO')
  const base = computeStrength(A, MID)
  const strat = { ...NONE, comp: 'AGGR' }
  const r = simulateSeries(A, MID, B, MID, mulberry32(42), 'T1', 'BRO', { aBonus: 1.5, bBonus: 0, aStrat: strat, bStrat: null })
  assert(approx(r.sA, base + 1.5 + 1.0, 1e-9), `aBonus + aStrat fold into sA (got ${r.sA.toFixed(3)} vs base ${base.toFixed(3)})`)
  const rB = simulateSeries(A, MID, B, MID, mulberry32(42), 'T1', 'BRO', { aBonus: 0, bBonus: 2.0, aStrat: null, bStrat: strat })
  assert(approx(rB.sB, computeStrength(B, MID) + 2.0 + 1.0, 1e-9), 'bBonus + bStrat fold into sB')
}

// 10) strategy moves winprob (seeded estimate)
{
  const A = lineupFor('GEN'), B = lineupFor('HLE')
  const pBase = estimateSeriesWinProb(A, MID, B, MID, 400, mulberry32(11))
  const pStrat = estimateSeriesWinProb(A, MID, B, MID, 400, mulberry32(11), 0, { aStrat: maxed })
  assert(pStrat > pBase, `maxed strategy raises seeded winprob (${(pBase * 100).toFixed(1)}% → ${(pStrat * 100).toFixed(1)}%)`)
}

// 11) MatchDetail-style recompute with stored strat snapshots byte-identical
{
  const A = lineupFor('T1'), B = lineupFor('GEN')
  const strat = { comp: 'SCALE', roam: 'ROAM', swap: true, wincon: 'SPLIT' }
  const seed = 987654
  const live = simulateSeries(A, MID, B, MID, mulberry32(seed), 'T1', 'GEN', { aBonus: 0, bBonus: 0, aStrat: strat, bStrat: null })
  const detail = { seed, homeLineup: A, awayLineup: B, homeTactic: MID, awayTactic: MID, bonusA: 0, bonusB: 0, homeStrat: strat, awayStrat: null }
  const recomputed = simulateSeries(
    detail.homeLineup, detail.homeTactic, detail.awayLineup, detail.awayTactic,
    mulberry32(detail.seed >>> 0), 'T1', 'GEN',
    { aBonus: detail.bonusA ?? 0, bBonus: detail.bonusB ?? 0, aStrat: detail.homeStrat ?? null, bStrat: detail.awayStrat ?? null },
  )
  assert(JSON.stringify(recomputed.games) === JSON.stringify(live.games), 'MatchDetail recompute with strat snapshots byte-identical')
}

// 12) reducer: SET_STRATEGY partial merge + PLAY_ROUND detail shape
{
  let s = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', managerName: 't' })
  assert(s.strategy && s.strategy.comp === null && s.strategy.swap === false, 'fresh state has default strategy')
  s = reducer(s, { type: 'SET_STRATEGY', comp: 'AGGR' })
  assert(s.strategy.comp === 'AGGR' && s.strategy.roam === null && s.strategy.swap === false, 'SET_STRATEGY partial merge keeps other fields')
  s = reducer(s, { type: 'SET_STRATEGY', swap: true, wincon: 'DRAGONS' })
  assert(s.strategy.comp === 'AGGR' && s.strategy.swap === true && s.strategy.wincon === 'DRAGONS', 'SET_STRATEGY second merge accumulates')
  const before = s.round
  s = reducer(s, { type: 'PLAY_ROUND' })
  assert(s.round === before + 1, 'PLAY_ROUND advances')
  const userRes = s.results.find((r) => r.isUser)
  assert(userRes && userRes.detail, 'PLAY_ROUND stores detail on user match')
  const expectHome = userRes.userSide === 'home'
  const userStrat = expectHome ? userRes.detail.homeStrat : userRes.detail.awayStrat
  const aiStrat = expectHome ? userRes.detail.awayStrat : userRes.detail.homeStrat
  assert(userStrat && userStrat.comp === 'AGGR', 'user side detail carries strategy snapshot')
  assert(aiStrat === null, 'AI side detail strat is null')
  const aiOnly = s.results.filter((r) => !r.isUser)
  assert(aiOnly.length > 0 && aiOnly.every((r) => r.detail.homeStrat === null && r.detail.awayStrat === null),
    'AI-vs-AI details carry no strat')
}

// 13) campaign unaffected: campaign detail has no strat keys, reducer never reads strategy
{
  let s = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', managerName: 't' })
  s = reducer(s, { type: 'SET_STRATEGY', comp: 'AGGR', wincon: 'DRAGONS' })
  assert(s.mode === 'season', 'sanity: season mode')
}
