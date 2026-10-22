// Headless full-season smoke test (run: node test/season.test.mjs)
// Exercises the exact pure modules the UI uses: logic.js, ai.js, sim.js, season.js, data.
import { TEAMS, ROLES } from '../src/data/lck.js'
import { buildLCKSchedule, makeStandings } from '../src/engine/season.js'
import { simulateSeries } from '../src/engine/sim.js'
import { bestLineup, clampForm, userLineup } from '../src/game/logic.js'
import { aiTactic } from '../src/game/ai.js'

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1 } else console.log('ok  :', m) }

const SCHEDULE = buildLCKSchedule()
const MY = 'T1'

// State mimics the reducer's shape we care about for the loop.
const teams = {}
for (const t of TEAMS) teams[t.id] = t.players.map((p) => ({ ...p }))
const form = {}
for (const id in teams) for (const p of teams[id]) form[p.id] = 50

// default lineup = best ovr per role for T1
const { ids } = bestLineup(teams[MY], form)
const lineup = {}
const byId = Object.fromEntries(teams[MY].map((p) => [p.id, p]))
for (const id of ids) { const p = byId[id]; if (p) lineup[p.role] = id }

const tactic = { style: 'BAL', phase: 'MID' }
let standings = makeStandings()
let resultsCount = 0
let userWins = 0
let userLosses = 0

for (const round of SCHEDULE) {
  for (const [homeId, awayId] of round) {
    const homeLineup = homeId === MY
      ? userLineup(teams[homeId], lineup, form).lineup
      : bestLineup(teams[homeId], form).lineup
    const awayLineup = awayId === MY
      ? userLineup(teams[awayId], lineup, form).lineup
      : bestLineup(teams[awayId], form).lineup
    const homeTac = homeId === MY ? tactic : aiTactic(homeId, awayId, round.indexOf ? 0 : 0)
    const awayTac = awayId === MY ? tactic : aiTactic(awayId, homeId, 0)
    const res = simulateSeries(homeLineup, homeTac, awayLineup, awayTac, Math.random, homeId, awayId)
    const homeWon = res.winner === 'A'
    resultsCount++
    const hw = homeWon ? standings[homeId] : standings[awayId]
    const lw = homeWon ? standings[awayId] : standings[homeId]
    hw.W += 1; hw.points += 1; hw.gameWins += res.aWins; hw.gameLosses += res.bWins
    lw.L += 1; lw.gameWins += res.bWins; lw.gameLosses += res.aWins
    if (homeId === MY) homeWon ? userWins++ : userLosses++
    if (awayId === MY) (homeWon ? userLosses++ : userWins++)
    // form update
    const winners = homeWon ? Object.values(homeLineup) : Object.values(awayLineup)
    const losers = homeWon ? Object.values(awayLineup) : Object.values(homeLineup)
    for (const p of winners) if (form[p.id] !== undefined) form[p.id] = clampForm(form[p.id] + 3)
    for (const p of losers) if (form[p.id] !== undefined) form[p.id] = clampForm(form[p.id] - 3)
    assert(res.games.length >= 2 && res.games.length <= 3, `week match ${homeId} v ${awayId} valid length`)
  }
}

const totalSeries = Object.values(standings).reduce((s, r) => s + r.W + r.L, 0) / 2
assert(resultsCount === 45, `played 45 series (got ${resultsCount})`) // 10 choose 2
assert(userWins + userLosses === 9, `T1 played 9 series (got ${userWins + userLosses})`)
assert(userWins + userLosses === 9, 'T1 has a complete season')

const sorted = Object.values(standings).sort((a, b) => b.points - a.points)
const myRow = standings[MY]
console.log(`\nFinal standings (top 3):`)
sorted.slice(0, 3).forEach((r, i) => console.log(`  ${i + 1}. ${r.teamId} ${r.W}-${r.L} (${r.points} pts)`))
console.log(`Your ${MY}: ${myRow.W}-${myRow.L} (${userWins}W ${userLosses}L)`)

// points sum should equal number of series (each series gives exactly 1 point)
const ptsSum = Object.values(standings).reduce((s, r) => s + r.points, 0)
assert(ptsSum === 45, `points total = 45 (got ${ptsSum})`)

console.log(process.exitCode ? '\nSEASON SMOKE TEST FAILED' : '\nSEASON SMOKE TEST PASSED')
