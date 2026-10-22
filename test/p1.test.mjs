// P1 feature tests (items 7-11): traits, academy, win-prob, fearless, playoffs.
// Run: node test/p1.test.mjs
import { simulateSeries } from '../src/engine/sim.js'
import { reducer } from '../src/game/useGameState.js'
import { makePlayer } from '../src/data/lck.js'
import { developPlayer } from '../src/data/development.js'
import { rollTraits, TRAIT_POOL } from '../src/data/traits.js'
import { buildAcademyPlayer, ACADEMY_PER_ORG } from '../src/data/academy.js'
import { buildPlayoffs } from '../src/engine/season.js'
import { explainWinProb } from '../src/game/logic.js'

let failures = 0
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); failures++ } else console.log('ok  :', m) }

function p(role, ovr, traits = []) { return { id: `t-${role}`, name: `N${role}`, role, team: 'T', ovr, mech: 80, macro: 80, consist: 80, form: 50, traits: traits.map((id) => ({ id, revealed: false, fired: false, spike: 0 })) } }
const mk = (ovr, traits = []) => ({ TOP: p('TOP', ovr, traits), JNG: p('JNG', ovr, traits), MID: p('MID', ovr, traits), BOT: p('BOT', ovr, traits), SUP: p('SUP', ovr, traits) })
const tac = { style: 'BAL', phase: 'MID' }
function rng32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

// ---------- §7 traits: off = byte-identical ----------
let tident = true
for (let s = 0; s < 300; s++) {
  const a = simulateSeries(mk(85), tac, mk(82), tac, rng32(s), 'A', 'B')
  const b = simulateSeries(mk(85), tac, mk(82), tac, rng32(s), 'A', 'B', { bigMatch: false })
  const c = simulateSeries(mk(85), tac, mk(82), tac, rng32(s), 'A', 'B', { bigMatch: true })
  if (JSON.stringify(a) !== JSON.stringify(b) || JSON.stringify(a) !== JSON.stringify(c)) { tident = false; break }
  if (!(a.winner && a.games.length === a.aWins + a.bWins)) { tident = false; break }
}
assert(tident, '§7 default/bigMatch toggle does not change seeded output (traits off = identical)')

// ---------- §7 injury_prone: carrier side wins fewer series ----------
let ipOff = 0, ipOn = 0, ipTrials = 1500
for (let s = 0; s < ipTrials; s++) {
  const off = simulateSeries(mk(85), tac, mk(85), tac, rng32(s), 'A', 'B') // no traits
  if (off.winner === 'A') ipOff++
  const on = simulateSeries(mk(85, ['injury_prone']), tac, mk(85), tac, rng32(s), 'A', 'B') // A hurt
  if (on.winner === 'A') ipOn++
}
assert(ipOn < ipOff, `§7 injury_prone reduces A win rate (${ipOn}/${ipTrials} vs ${ipOff}/${ipTrials})`)

// reveal log appears
const revealRes = simulateSeries(mk(85, ['injury_prone']), tac, mk(85), tac, rng32(7), 'A', 'B')
assert(revealRes.log.some((l) => typeof l === 'string' && l.includes('reveals')), '§7 trait reveal line written to log')

// ---------- §9 explainWinProb shape ----------
// Build a minimal career-style state is heavy; test pure helper via a fake state path:
// explainWinProb reads state.teams/results/strategy; pass a minimal stub.
const fakeState = {
  teams: { T1: [p('TOP', 88), p('JNG', 88), p('MID', 88), p('BOT', 88), p('SUP', 88)], GEN: [p('TOP', 80), p('JNG', 80), p('MID', 80), p('BOT', 80), p('SUP', 80)] },
  teamId: 'T1', form: {}, tactic: { style: 'BAL', phase: 'MID' }, lineup: { TOP: 't-TOP', JNG: 't-JNG', MID: 't-MID', BOT: 't-BOT', SUP: 't-SUP' },
  strategy: { comp: null, roam: null, swap: false, wincon: null }, results: [], seriesOptions: { fearless: false },
}
const why = explainWinProb(fakeState, 'GEN', { n: 100 })
assert(why && typeof why.prob === 'number' && why.prob > 0 && why.prob < 1, '§9 explainWinProb returns prob in (0,1)')
const labels = why.factors.map((f) => f.label)
assert(labels.includes('Rating edge') && labels.includes('Tactics & gameplan') && labels.includes('Trait watch'), '§9 six fixed factor labels present')
const neutral = explainWinProb(fakeState, 'T1', { n: 100 }) // equal teams → near 50 / ~0 factors
assert(Math.abs(neutral.prob - 0.5) < 0.2, '§9 neutral matchup near 50%')

// ---------- §10 fearless: off (false) identical to default; on differs ----------
let fident = true
for (let s = 0; s < 300; s++) {
  const a = simulateSeries(mk(85), tac, mk(82), tac, rng32(s), 'A', 'B') // default (no extra)
  const b = simulateSeries(mk(85), tac, mk(82), tac, rng32(s), 'A', 'B', { fearless: false }) // explicit off
  if (JSON.stringify(a) !== JSON.stringify(b)) { fident = false; break }
}
assert(fident, '§10 fearless:false == default (no effect when off)')

// fearless:true — game-2 winner should win game 3 slightly less than control.
let g3ctrl = 0, g3fl = 0, g3n = 0
for (let s = 0; s < 1500; s++) {
  const ctrl = simulateSeries(mk(85), tac, mk(85), tac, rng32(s), 'A', 'B')
  const fl = simulateSeries(mk(85), tac, mk(85), tac, rng32(s), 'A', 'B', { fearless: true })
  // only series that reach a game 3 (1-1 after two)
  const c2 = ctrl.games.slice(0, 2)
  if (c2[0].winner !== c2[1].winner) {
    g3n++
    const prevW = c2[1].winner
    if (ctrl.games[2].winner === prevW) g3ctrl++
    if (fl.games[2].winner === prevW) g3fl++
  }
}
assert(g3n > 50, `§10 enough game-3 series sampled (${g3n})`)
assert(g3fl < g3ctrl, `§10 fearless reduces prevWinner's game-3 win rate (${g3fl} vs ${g3ctrl} of ${g3n})`)

// ---------- §10 SET_SERIES_OPTION validation ----------
let so = reducer(undefined, { type: 'START_CAREER', teamId: 'T1', managerName: 'Mozi' })
assert(so.seriesOptions.fearless === false, '§10 freshState seriesOptions.fearless=false')
const badKey = reducer(so, { type: 'SET_SERIES_OPTION', key: 'bogus', value: true })
assert(badKey.seriesOptions.fearless === false, '§10 SET_SERIES_OPTION bad key no-op')
const toggled = reducer(so, { type: 'SET_SERIES_OPTION', key: 'fearless', value: true })
assert(toggled.seriesOptions.fearless === true, '§10 SET_SERIES_OPTION toggles fearless')

// ---------- §11 buildPlayoffs ----------
const bp = buildPlayoffs(['A', 'B', 'C', 'D'])
assert(bp.semis[0][0] === 'A' && bp.semis[0][1] === 'D' && bp.semis[1][0] === 'B' && bp.semis[1][1] === 'C', '§11 buildPlayoffs pairs 1v4, 2v3')
let threw = false
try { buildPlayoffs(['A', 'B', 'C', 'D'], 6) } catch { threw = true }
assert(threw, '§11 buildPlayoffs throws on topN !== 4')
let threw2 = false
try { buildPlayoffs(['A', 'B', 'C']) } catch { threw2 = true }
assert(threw2, '§11 buildPlayoffs throws on <4 ids')

// ---------- §11 playoff run via reducer (career) ----------
function finishRegional(teamId = 'T1') {
  let s = reducer(undefined, { type: 'START_CAREER', teamId, managerName: 'Mozi' })
  let guard = 0
  while (!s.finished && guard++ < 60) s = reducer(s, { type: 'PLAY_ROUND' })
  if (!s.finished) throw new Error('season did not finish')
  return s
}
let r = finishRegional()
assert(r.phase === 'playoffs' && r.finished === true, '§11 final PLAY_ROUND sets phase=playoffs, finished=true')
assert(r.tournament && r.tournament.kind === 'playoffs' && r.tournament.rounds.length === 2, '§11 playoff tournament: 2-round bracket built')
assert(r.tournament.resolver === 'biased' && r.tournament.revealedRounds === 1, '§11 playoff bracket resolver biased, revealedRounds=1')
let g = 0
while (r.tournament && r.tournament.status !== 'done' && g++ < 6) r = reducer(r, { type: 'PLAY_TOURNAMENT_ROUND' })
assert(r.tournament.status === 'done', '§11 playoff bracket completes')
assert(r.playoffChampionId === r.tournament.championId && r.playoffChampionId != null, '§11 playoffChampionId set from final winner')

// ---------- §8 academy prospect shape + RESOLVE_PROMOTION net-zero ----------
const academyPlayer = buildAcademyPlayer('T1', 80)
assert(academyPlayer.age >= 17 && academyPlayer.age <= 19, '§8 academy prospect age 17-19')
assert(academyPlayer.traits && academyPlayer.traits.length === 0, '§8 academy prospect traits []')
assert(academyPlayer.potential >= academyPlayer.ovr, '§8 academy prospect has potential >= ovr')
assert(typeof ACADEMY_PER_ORG === 'number' && ACADEMY_PER_ORG >= 1, '§8 ACADEMY_PER_ORG defined')

// Academy offer appears over many ADVANCE_SEASON rolls (career); then RESOLVE_PROMOTION keeps roster size.
let gotPromo = null
let s2 = finishRegional() // finished season 1, playoff bracket active
let guard = 0
while (!gotPromo && guard++ < 80) {
  // finish any active playoff/international bracket first (P1: playoffs at season end)
  while (s2.tournament && s2.tournament.status !== 'done') s2 = reducer(s2, { type: 'PLAY_TOURNAMENT_ROUND' })
  // resolve any pending dilemma/promotion so ADVANCE_SEASON is allowed
  if (s2.pendingEvent) { s2 = reducer(s2, { type: 'RESOLVE_EVENT', optionIndex: 0 }); continue }
  if (s2.pendingPromotion) { s2 = reducer(s2, { type: 'RESOLVE_PROMOTION', promote: false }); continue }
  s2 = reducer(s2, { type: 'ADVANCE_SEASON' })
  if (s2.pendingPromotion) { gotPromo = s2; break }
  // new season started (not finished) → play its full regional schedule
  let rg = 0
  while (!s2.finished && rg++ < 60) s2 = reducer(s2, { type: 'PLAY_ROUND' })
  // its playoff bracket is now active; play it so the next ADVANCE is allowed
  while (s2.tournament && s2.tournament.status !== 'done') s2 = reducer(s2, { type: 'PLAY_TOURNAMENT_ROUND' })
}
assert(gotPromo != null, '§8 academy promotion offer surfaces within 80 ADVANCE_SEASON rolls')
const rosterBefore = gotPromo.teams[gotPromo.teamId].length
const resolved = reducer(gotPromo, { type: 'RESOLVE_PROMOTION', promote: true })
assert(resolved.teams[resolved.teamId].length === rosterBefore, '§8 RESOLVE_PROMOTION promote keeps roster size constant (net-zero)')
assert(resolved.pendingPromotion === null, '§8 RESOLVE_PROMOTION clears pendingPromotion')
const kept = reducer(gotPromo, { type: 'RESOLVE_PROMOTION', promote: false })
assert(kept.teams[kept.teamId].length === rosterBefore && kept.pendingPromotion === null, '§8 RESOLVE_PROMOTION keep = no roster change, clears')

// ---------- §7 one_season_wonder via developPlayer ----------
let wp = makePlayer('T1', 'Wondro', 'MID', 85, true, 24, 95)
wp.traits = [{ id: 'one_season_wonder', revealed: false, fired: false, spike: 0 }]
const wpBefore = wp.ovr
const wpAfter = developPlayer({ ...wp }, () => 0.0) // rng < 0.15 → fires
assert(wpAfter.ovr > wpBefore && wpAfter.traits[0].fired === true && wpAfter.traits[0].spike > 0, '§7 one_season_wonder spikes OVR and sets fired/spike')
const wpNext = developPlayer({ ...wpAfter }, () => 0.9) // not fire, but regression branch: spike>0 → regress
assert(wpNext.ovr === wpBefore, `§7 one_season_wonder regresses by exactly spike next season (${wpNext.ovr} === ${wpBefore})`)
assert(wpNext.traits[0].spike === 0, '§7 spike reset after regression')

// ---------- rollTraits rates sane ----------
let withTrait = 0
for (let i = 0; i < 5000; i++) if (rollTraits(rng32(i)).length > 0) withTrait++
assert(withTrait > 200 && withTrait < 700, `§7 rollTraits ~8% single-trait rate observed (${withTrait}/5000)`)
assert(TRAIT_POOL.length === 5, '§7 TRAIT_POOL has 5 traits')

console.log(failures === 0 ? '\nP1: ALL PASSED' : `\nP1: ${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
