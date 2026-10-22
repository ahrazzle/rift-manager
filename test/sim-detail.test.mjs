// Enriched sim detail tests — acceptance criteria 1-10.
// Covers docs/engine-redesign.md §4 AS CALIBRATED by docs/live-data-research.md §8
// (duration 20-65 median ~35; Hazen §7 role numbers; final gold 1500-16000).
// Run: node test/sim-detail.test.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { TEAMS } from '../src/data/lck.js'
import { simulateSeries } from '../src/engine/sim.js'
import { bestLineup, estimateSeriesWinProb } from '../src/game/logic.js'

const HERE = dirname(fileURLToPath(import.meta.url))
let failures = 0
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failures++ }
  else console.log('ok  :', msg)
}

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function lineupFor(teamId) {
  const team = TEAMS.find((t) => t.id === teamId)
  return bestLineup(team.players, {}).lineup
}

const TACT = { style: 'BAL', phase: 'MID' }
const T1 = () => lineupFor('T1')
const BRO = () => lineupFor('BRO')
const sim1 = (seed, la = 'T1', lb = 'BRO') =>
  simulateSeries(T1(), TACT, BRO(), TACT, mulberry32(seed), la, lb)

// Hazen §7 role centers for CS plausibility bounds.
const CPM = { TOP: [7.0, 9.5], JNG: [5.0, 8.0], MID: [7.4, 10.0], BOT: [7.6, 10.5], SUP: [0.5, 2.5] }
const ROLES = ['TOP', 'JNG', 'MID', 'BOT', 'SUP']

// ---- 1. Contract shape ----
{
  const res = sim1(7)
  const keys = ['winner', 'aWins', 'bWins', 'games', 'log', 'sA', 'sB']
  assert(keys.every((k) => k in res), '1: series has {winner,aWins,bWins,games,log,sA,sB}')
  assert(res.games.length === 2 || res.games.length === 3, `1: games.length in {2,3} (got ${res.games.length})`)
  assert(res.aWins + res.bWins === res.games.length, '1: aWins+bWins === games.length')
  assert(res.winner === (res.aWins > res.bWins ? 'A' : 'B'), '1: winner matches 2-win side')
  assert(res.log.length >= 3 && typeof res.sA === 'number' && typeof res.sB === 'number', '1: log.length>=3, sA/sB numbers')
  const g0 = res.games[0]
  assert('game' in g0 && 'winner' in g0 && 'durationMin' in g0 && 'goldTimeline' in g0 && 'events' in g0 && 'players' in g0,
    '1: GameResult has {game,winner,durationMin,goldTimeline,events,players}')
  const p0 = g0.players[0]
  assert(['id', 'name', 'role', 'side', 'kills', 'deaths', 'assists', 'cs', 'dmgShare', 'kp', 'rating', 'mvp'].every((k) => k in p0),
    '1: PlayerPerf has all locked fields')
}

// ---- Bulk sims for 2,3,4,5,6,7 ----
const N = 1000
const series = []
for (let i = 0; i < N; i++) series.push(sim1(20000 + i))
const allGames = series.flatMap((s) => s.games.map((g) => ({ s, g })))

// ---- 2. Terminal-gold invariant ----
{
  let bad = 0
  for (const { g } of allGames) {
    const last = g.goldTimeline[g.goldTimeline.length - 1].diff
    const want = g.winner === 'A' ? 1 : -1
    if (Math.sign(last) !== want || Math.abs(last) < 1200) bad++
  }
  assert(bad === 0, `2: terminal gold sign+1200 invariant, 0 failures over ${allGames.length} games (${bad} bad)`)
}

// ---- 3. Timeline well-formedness (Hazen bounds: duration 20-65) ----
{
  let bad = 0
  for (const { g } of allGames) {
    const d = g.durationMin
    if (!Number.isInteger(d) || d < 20 || d > 65) { bad++; continue }
    const ts = g.goldTimeline.map((p) => p.t)
    for (let i = 1; i < ts.length; i++) if (!(ts[i] > ts[i - 1])) { bad++; break }
    if (ts[0] !== 2 || ts[ts.length - 1] !== d) bad++
    if (g.goldTimeline.some((p) => Math.abs(p.diff) > 18000)) bad++
    for (let i = 1; i < g.events.length; i++) if (g.events[i].t < g.events[i - 1].t) { bad++; break }
    if (g.events.some((e) => e.t < 2 || e.t > d)) bad++
    if (g.events.some((e) => !['kill', 'tower', 'dragon', 'baron', 'teamfight', 'ace'].includes(e.type))) bad++
    if (g.events.some((e) => e.side !== 'A' && e.side !== 'B')) bad++
  }
  assert(bad === 0, `3: duration/timeline/events well-formed over ${allGames.length} games (${bad} bad)`)
}

// ---- 4. Roster integrity ----
{
  const t1 = T1(); const bro = BRO()
  let bad = 0
  for (const { g } of allGames) {
    if (g.players.length !== 10) { bad++; continue }
    for (const side of ['A', 'B']) {
      const sp = g.players.filter((p) => p.side === side)
      if (sp.length !== 5) { bad++; break }
      const roles = new Set(sp.map((p) => p.role))
      if (!ROLES.every((r) => roles.has(r))) { bad++; break }
    }
    for (const p of g.players) {
      const src = p.side === 'A' ? t1[p.role] : bro[p.role]
      if (!src || p.id !== src.id || p.name !== src.name) { bad++; break }
    }
  }
  assert(bad === 0, `4: 10 players/game, 5+5 sides, role coverage, id/name match (${bad} bad)`)
}

// ---- 5. Damage-share normalization ----
{
  let badSum = 0, badRange = 0, supBeatsBot = 0, n = 0
  for (const { g } of allGames) {
    for (const side of ['A', 'B']) {
      n++
      const sp = g.players.filter((p) => p.side === side)
      const sum = sp.reduce((a, p) => a + p.dmgShare, 0)
      if (Math.abs(sum - 1) > 0.005) badSum++
      if (sp.some((p) => p.dmgShare < 0 || p.dmgShare > 1)) badRange++
      const sup = sp.find((p) => p.role === 'SUP').dmgShare
      const bot = sp.find((p) => p.role === 'BOT').dmgShare
      if (sup >= bot) supBeatsBot++
    }
  }
  assert(badSum === 0, `5: per-side dmgShare sums to 1±0.005 (${badSum} bad)`)
  assert(badRange === 0, `5: every dmgShare in [0,1] (${badRange} bad)`)
  assert(supBeatsBot / n <= 0.2, `5: SUP<BOT in >=80% (violations ${(100 * supBeatsBot / n).toFixed(1)}%)`)
}

// ---- 6. KP + MVP ----
{
  let badKp = 0, badMvp = 0, badTop = 0
  for (const { g } of allGames) {
    const tk = { A: 0, B: 0 }
    for (const p of g.players) tk[p.side] += p.kills
    for (const p of g.players) {
      if (p.kp < 0 || p.kp > 1) { badKp++; break }
      const expect = Math.min(1, (p.kills + p.assists) / Math.max(1, tk[p.side]))
      if (Math.abs(p.kp - expect) > 0.015) { badKp++; break }
    }
    const mvps = g.players.filter((p) => p.mvp)
    if (mvps.length !== 1 || mvps[0].side !== g.winner) { badMvp++; continue }
    const top = Math.max(...g.players.filter((p) => p.side === g.winner).map((p) => p.rating))
    if (mvps[0].rating !== top) badTop++
  }
  assert(badKp === 0, `6: kp in [0,1] and matches (K+A)/teamKills (${badKp} bad)`)
  assert(badMvp === 0, `6: exactly one mvp, on winning side (${badMvp} bad)`)
  assert(badTop === 0, `6: mvp holds side-highest rating (${badTop} bad)`)
}

// ---- 7. Stat plausibility ----
{
  let badCs = 0, badKills = 0, loserOutrates = 0
  for (const { g } of allGames) {
    for (const p of g.players) {
      const [lo, hi] = CPM[p.role]
      if (p.cs < g.durationMin * lo - 15 || p.cs > g.durationMin * hi + 15) { badCs++; break }
    }
    for (const side of ['A', 'B']) {
      const kills = g.players.filter((p) => p.side === side).reduce((a, p) => a + p.kills, 0)
      if (kills < 4) { badKills++; break }
    }
    const avg = (side) => {
      const sp = g.players.filter((p) => p.side === side)
      return sp.reduce((a, p) => a + p.rating, 0) / sp.length
    }
    if (avg(g.winner) <= avg(g.winner === 'A' ? 'B' : 'A')) loserOutrates++
  }
  assert(badCs === 0, `7: cs within role bounds (${badCs} bad)`)
  assert(badKills === 0, `7: kills/side >= 4 (${badKills} bad)`)
  assert(loserOutrates / allGames.length <= 0.1,
    `7: winner avg rating > loser avg in >=90% (${(100 * (1 - loserOutrates / allGames.length)).toFixed(1)}%)`)
}

// ---- 8. Determinism ----
{
  const a = JSON.stringify(sim1(1234))
  const b = JSON.stringify(sim1(1234))
  assert(a === b, '8: mulberry32(1234) twice -> byte-identical series')
  const ra = sim1(1234); const rb = sim1(1234)
  const sameGames = ra.games.length === rb.games.length &&
    ra.games.every((g, i) => g.winner === rb.games[i].winner &&
      g.goldTimeline[g.goldTimeline.length - 1].diff === rb.games[i].goldTimeline[rb.games[i].goldTimeline.length - 1].diff)
  assert(sameGames, '8: same game count/winners/final diffs')
}

// ---- 9. Series balance regression (T1 best vs BRO best, 2000 sims) ----
{
  const M = 2000
  let wins = 0
  for (let i = 0; i < M; i++) {
    if (sim1(1000 + i).winner === 'A') wins++
  }
  const rate = wins / M
  console.log(`    T1 series winrate over ${M}: ${(100 * rate).toFixed(1)}%`)
  assert(rate > 0.70, `9: T1 (best) series winrate > 0.70 (got ${rate.toFixed(3)})`)
}

// ---- 10. Perf + RNG hygiene + input immutability ----
{
  const t0 = Date.now()
  const p = estimateSeriesWinProb(T1(), TACT, BRO(), TACT, 600, mulberry32(999))
  const dt = Date.now() - t0
  assert(dt < 3000, `10: 600-series Monte Carlo <3s (took ${dt}ms, p=${p.toFixed(2)})`)
  const src = readFileSync(join(HERE, '../src/engine/sim.js'), 'utf8')
  const noRandom = !/Math\.random\s*\(/.test(src)
  const noDate = !/Date\.now/.test(src)
  assert(noRandom && noDate, '10: no bare Math.random(/Date.now calls in sim.js')
  const deepFreeze = (o) => {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) {
      Object.freeze(o)
      for (const v of Object.values(o)) deepFreeze(v)
    }
  }
  const fa = T1(); const fb = BRO()
  const before = JSON.stringify([fa, fb])
  deepFreeze(fa); deepFreeze(fb)
  let threw = false
  try {
    simulateSeries(fa, TACT, fb, TACT, mulberry32(5), 'T1', 'BRO')
  } catch { threw = true }
  assert(!threw && JSON.stringify([fa, fb]) === before, '10: frozen input lineups not mutated, no throw')
}

console.log(failures ? `\n${failures} ACCEPTANCE CHECK(S) FAILED` : '\nALL SIM-DETAIL ACCEPTANCE CHECKS PASSED')
process.exitCode = failures ? 1 : 0
