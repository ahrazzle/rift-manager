// Engine sanity check (run: node test/engine.test.mjs)
import { TEAMS } from '../src/data/lck.js'
import { simulateSeries, computeStrength, winProb } from '../src/engine/sim.js'
import { buildLCKSchedule, roundRobin } from '../src/engine/season.js'

// Seeded RNG (mulberry32) for deterministic tests.
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

// Build a lineup (role->player) for a team id.
function lineupFor(teamId) {
  const team = TEAMS.find((t) => t.id === teamId)
  const line = {}
  for (const p of team.players) {
    if (!line[p.role] || p.ovr > line[p.role].ovr) line[p.role] = p
  }
  return line
}

// 1) winProb sanity: equal strengths -> ~0.5
assert(Math.abs(winProb(50, 50) - 0.5) < 1e-9, 'equal strengths => 0.5 winProb')

// 2) Strength increases with rating
const sLow = computeStrength(lineupFor('BRO'), { style: 'BAL', phase: 'MID' })
const sHigh = computeStrength(lineupFor('T1'), { style: 'BAL', phase: 'MID' })
assert(sHigh > sLow, `T1 strength (${sHigh.toFixed(1)}) > BRO (${sLow.toFixed(1)})`)

// 3) Stronger team wins the series majority of the time over many sims.
const tact = { style: 'BAL', phase: 'MID' }
let t1Wins = 0
let gamesCount = { 2: 0, 3: 0 }
const N = 2000
for (let i = 0; i < N; i++) {
  const rng = mulberry32(1000 + i)
  const res = simulateSeries(
    lineupFor('T1'), tact,
    lineupFor('BRO'), tact,
    rng, 'T1', 'BRO'
  )
  if (res.winner === 'A') t1Wins++
  const total = res.aWins + res.bWins
  if (gamesCount[total] !== undefined) gamesCount[total]++
  else {
    console.error('FAIL: unexpected game count', total)
    process.exitCode = 1
  }
}
const rate = t1Wins / N
console.log(`T1 vs BRO series win rate over ${N}: ${(rate * 100).toFixed(1)}% (games 2:${gamesCount[2]} 3:${gamesCount[3]})`)
assert(rate > 0.7 && rate < 0.99, 'stronger team wins 70-99% of series (not deterministic)')

// 4) Closer matchup is closer to 50%.
let genWins = 0
for (let i = 0; i < N; i++) {
  const rng = mulberry32(5000 + i)
  const res = simulateSeries(
    lineupFor('GEN'), tact,
    lineupFor('HLE'), tact,
    rng, 'GEN', 'HLE'
  )
  if (res.winner === 'A') genWins++
}
const close = genWins / N
console.log(`GEN vs HLE series win rate over ${N}: ${(close * 100).toFixed(1)}%`)
assert(close > 0.35 && close < 0.65, 'close matchup lands ~35-65%')

// 5) Schedule: 9 rounds, 5 matches/round, each team plays once per round.
const sched = buildLCKSchedule()
assert(sched.length === 9, `9 rounds (got ${sched.length})`)
assert(sched.every((r) => r.length === 5), 'every round has 5 matches')
const seen = new Set()
for (const r of sched) for (const [a, b] of r) {
  assert(a !== b, 'no team plays itself')
  seen.add(a); seen.add(b)
}
assert(seen.size === 10, 'all 10 teams appear')
// each team appears exactly once per round
for (const r of sched) {
  const ids = r.flat()
  const counts = {}
  for (const id of ids) counts[id] = (counts[id] || 0) + 1
  for (const id of Object.keys(counts)) assert(counts[id] === 1, `${id} appears once in round`)
}

// 6) Symmetry: flipping home/away with identical teams shouldn't bias winner set
// (we just confirm it runs and returns a valid series each time)
const res = simulateSeries(lineupFor('T1'), tact, lineupFor('DK'), tact, mulberry32(42), 'T1', 'DK')
assert(res.games.length >= 2 && res.games.length <= 3, 'valid series length 2-3')
assert(res.winner === 'A' || res.winner === 'B', 'has a winner')

console.log(process.exitCode ? '\nSOME TESTS FAILED' : '\nALL ENGINE TESTS PASSED')
