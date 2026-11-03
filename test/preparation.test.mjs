import assert from 'node:assert/strict'
import { reducer, mulberry32 } from '../src/game/useGameState.js'
import { simulateSeries } from '../src/engine/sim.js'
import { prepareWeek, preparationBonus, upcomingOpponent, scoutOpponent } from '../src/game/preparation.js'
import { explainWinProb, seededRng, matchupOppTactic, matchupSeed } from '../src/game/logic.js'
import { reviewSeries } from '../src/game/matchReview.js'

const start = () => reducer(undefined, { type: 'NEW_GAME', teamId: 'T1' })
const before = start()
const frozen = JSON.stringify(before)
const prepared = reducer(before, { type: 'PREPARE_WEEK', focus: 'scrims' })
assert.equal(JSON.stringify(before), frozen, 'preparation must not mutate state')
assert.equal(prepared.preparation.opponentId, upcomingOpponent(before))
assert.equal(prepared.trainedRound, 1)
for (const id of Object.values(before.lineup)) assert.equal(prepared.form[id], before.form[id] + 2)
assert.equal(preparationBonus(prepared), 0.9)
assert.equal(reducer(prepared, { type: 'PREPARE_WEEK', focus: 'recovery' }), prepared, 'one session per week')
assert.equal(reducer(prepared, { type: 'TRAIN' }), prepared, 'legacy training cannot stack')
const legacyTrained = reducer(before, { type: 'TRAIN' })
assert.equal(prepareWeek(legacyTrained, 'scrims'), legacyTrained, 'new training cannot stack onto legacy training')
assert.equal(prepareWeek(before, 'invalid'), before)
assert.equal(preparationBonus(before), 0, 'old saves have no hidden bonus')
assert.equal(preparationBonus({ ...prepared, round: 2 }), 0)
assert.equal(preparationBonus({ ...prepared, finished: true }), 0)
assert.equal(preparationBonus(prepared, 'WRONG'), 0)
const sub = before.teams.T1.find((p) => p.role === 'TOP' && p.id !== before.lineup.TOP)
assert.ok(sub)
assert.equal(preparationBonus({ ...prepared, lineup: { ...prepared.lineup, TOP: sub.id } }), 0.72, 'substitutes do not inherit rehearsals')
for (const mode of ['draft', 'igl', 'gauntlet']) {
  const other = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', mode })
  assert.equal(prepareWeek(other, 'scrims'), other, `${mode} keeps its own coaching loop`)
}
const career = reducer(undefined, { type: 'START_CAREER', teamId: 'T1' })
const careerPrep = prepareWeek(career, 'scrims')
assert.equal(preparationBonus(careerPrep), 0.9)
assert.equal(preparationBonus({ ...careerPrep, career: { ...careerPrep.career, seasonIndex: 2 } }), 0)
assert.equal(prepareWeek({ ...career, sacked: true }, 'scrims').preparation, undefined)
const maxForm = { ...before, form: Object.fromEntries(Object.keys(before.form).map((id) => [id, 98])) }
assert.ok(Object.values(prepareWeek(maxForm, 'recovery').form).every((f) => f === 98))
assert.equal(scoutOpponent(before).opponentId, upcomingOpponent(before))

// The recorded engine inputs contain the preparation edge on the user's side
// only. Replaying those exact inputs reproduces the authoritative result.
const played = reducer(prepared, { type: 'PLAY_ROUND' })
const result = played.results.find((r) => r.isUser)
const detail = result.detail
assert.equal(detail.preparation.bonus, 0.9)
assert.equal(detail[result.userSide === 'home' ? 'bonusA' : 'bonusB'], 0.9)
assert.equal(detail[result.userSide === 'home' ? 'bonusB' : 'bonusA'], 0)
assert.ok(played.results.filter((r) => !r.isUser).every((r) => r.detail.bonusA === 0 && r.detail.bonusB === 0))
const replay = simulateSeries(detail.homeLineup, detail.homeTactic, detail.awayLineup, detail.awayTactic, mulberry32(detail.seed), result.homeId, result.awayId, {
  aBonus: detail.bonusA, bBonus: detail.bonusB, aStrat: detail.homeStrat, bStrat: detail.awayStrat, bigMatch: detail.bigMatch, fearless: detail.fearless,
})
assert.equal(replay.aWins, result.aWins)
assert.equal(replay.bWins, result.bWins)
assert.equal(preparationBonus(played), 0, 'match bonus expires after the series')
const next = prepareWeek(played, 'vision')
assert.equal(next.trainedRound, 2)
assert.equal(preparationBonus(next), 0.6)
const opp = upcomingOpponent(prepared)
const why = () => explainWinProb(prepared, opp, { n: 50, rng: seededRng(matchupSeed(prepared, opp)), oppTactic: matchupOppTactic(prepared, opp) })
assert.equal(why().preparation, 0.9)
assert.deepEqual(why(), why(), 'same state gives the same estimate')

const game = {
  winner: 'B',
  events: [{ type: 'dragon', side: 'A' }, { type: 'dragon', side: 'B' }, { type: 'dragon', side: 'B' }, { type: 'tower', side: 'A' }, { type: 'baron', side: 'B' }],
  goldTimeline: [{ t: 0, diff: 0 }, { t: 14, diff: -2000 }, { t: 22, diff: 3000 }, { t: 30, diff: -5000 }],
}
const homeReview = reviewSeries([game], 'home')
assert.equal(homeReview.stats.dragons, 1)
assert.equal(homeReview.stats.enemyDragons, 2)
assert.equal(homeReview.stats.slowStarts, 1)
assert.equal(homeReview.stats.lostLeads, 1)
assert.equal(homeReview.focus, 'vision')
const awayReview = reviewSeries([game], 'away')
assert.equal(awayReview.stats.wins, 1)
assert.equal(awayReview.stats.dragons, 2)
assert.equal(awayReview.stats.lostLeads, 0)
assert.equal(awayReview.stats.slowStarts, 0)
assert.equal(reviewSeries([]), null)
assert.equal(reviewSeries([{ winner: 'A' }]).stats.dragons, 0)
console.log('Preparation and match-review regressions passed')
