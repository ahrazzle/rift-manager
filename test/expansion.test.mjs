// Expansion systems test: board, economy, press, gauntlet, draft/IGL modes.
import assert from 'node:assert'
import { reducer, SIM_SPEEDS } from '../src/game/useGameState.js'
import { IGL_CALLS, optimalIglCall, getIglGameState, buildIglPrompt } from '../src/game/igl.js'
import { aiDraftMove, currentStep, DRAFT_PERSONALITIES, PERSONALITY_IDS, createDraft } from '../src/game/draft.js'

let n = 0
const ok = (cond, msg) => { n++; assert(cond, msg) }

// --- NEW_GAME with modes + manager state ---
let s = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', mode: 'draft' })
ok(s.mode === 'draft', 'draft mode set')
ok(s.board && s.board.expectation, 'board initialized: ' + s.board?.expectation)
ok(s.finance && s.finance.budget > 0, 'budget initialized: ' + s.finance?.budget)
ok(s.press.pending === true, 'press pending at start')
const p0 = s.teams[s.teamId][0]
ok(p0.contract >= 1 && p0.contract <= 3, 'contract backfilled')
ok(p0.morale >= 65 && p0.morale <= 84, 'morale backfilled')

// --- SIGN charges fee ---
s = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1' })
const bud0 = s.finance.budget
const fa = s.faPool[0]
const s2 = reducer(s, { type: 'SIGN', playerId: fa.id })
ok(s2.finance.budget < bud0, 'signing deducts fee')
ok(s2.teams[s2.teamId].some((p) => p.id === fa.id && p.contract === 2), 'signed player gets contract')
// unaffordable: drain budget then try
let poor = { ...s2, finance: { budget: 1 } }
const s3 = reducer(poor, { type: 'SIGN', playerId: s2.faPool[0].id })
ok(s3 === poor, 'cannot sign when broke')

// --- PRESS_ANSWER ---
const s4 = reducer(s2, { type: 'PRESS_ANSWER', answerId: 'measured' })
ok(s4.press.pending === false, 'press resolved')
ok(s4.board.confidence === s2.board.confidence + 1, 'board confidence moves')

// --- GAUNTLET ---
const g0 = reducer(s2, { type: 'GAUNTLET_START' })
ok(g0.mode === 'gauntlet' && g0.gauntlet.status === 'active', 'gauntlet starts')
ok(g0.gauntlet.opponents.length >= 1 && g0.gauntlet.opponents.length <= 5, 'opponent ladder')
const g1 = reducer(g0, { type: 'GAUNTLET_PLAY' })
ok(g1.gauntlet.round === 1, 'gauntlet round advances')
ok(['active', 'won', 'lost'].includes(g1.gauntlet.status), 'gauntlet status valid')

// --- DRAFT mode week flow ---
let d = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', mode: 'draft' })
d = reducer(d, { type: 'DRAFT_WEEK_START' })
ok(d.draftSeries && d.draftSeries.draft, 'draft series starts with a draft')
ok(d.results.length > 0, 'AI matches simmed')
// play a full draft via AI vs AI (both sides AI-driven for the test)
// (aiDraftMove, currentStep imported at top)
let guard = 0
while (d.draftSeries && guard++ < 100) {
  const ds = d.draftSeries
  const dr = ds.draft
  if (!dr.done) {
    const step = currentStep(dr)
    const move = aiDraftMove(dr, Math.random)
    d = reducer(d, move.type === 'ban'
      ? { type: 'DRAFT_BAN', champId: move.champId }
      : { type: 'DRAFT_PICK', champId: move.champId, role: move.role })
  } else {
    d = reducer(d, { type: 'DRAFT_RESOLVE_GAME' })
  }
}
ok(!d.draftSeries, 'draft series completes after 3 games or 2-0')
ok(d.results.some((r) => r.isUser), 'user series recorded')
ok(d.round === 2, 'round advances after draft week')

// --- IGL mode week flow ---
let l = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', mode: 'igl' })
l = reducer(l, { type: 'LIVE_WEEK_START' })
ok(l.live && !l.live.current, 'live series starts')
guard = 0
while (l.live && guard++ < 10) {
  if (!l.live.current) {
    l = reducer(l, { type: 'LIVE_START_GAME' })
    ok(l.live.current.pass1 && l.live.current.prompt, 'pass1 simmed with prompt')
  } else if (!l.live.current.final) {
    l = reducer(l, { type: 'LIVE_MAKE_CALL', callId: 'dragons' })
    ok(l.live.current.final, 'pass2 simmed with call')
  } else {
    l = reducer(l, { type: 'LIVE_ADVANCE' })
  }
}
ok(!l.live, 'live series completes')
ok(l.results.some((r) => r.isUser), 'user IGL series recorded')

// --- Sim speed ---
ok(Object.keys(SIM_SPEEDS).join(',') === 'slow,normal,fast,instant', 'four sim speeds defined')
let sp = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1' })
ok(sp.simSpeed === 'normal', 'sim speed defaults to normal')
sp = reducer(sp, { type: 'SET_SIM_SPEED', speed: 'fast' })
ok(sp.simSpeed === 'fast', 'SET_SIM_SPEED changes speed')
sp = reducer(sp, { type: 'SET_SIM_SPEED', speed: 'bogus' })
ok(sp.simSpeed === 'fast', 'SET_SIM_SPEED rejects unknown speed')

// --- IGL: 7 calls, game-state panel data, optimal triggers ---
ok(IGL_CALLS.length === 7, 'seven IGL calls: ' + IGL_CALLS.map((c) => c.id).join(','))
const fakeGame = (events, players, gold) => ({
  durationMin: 30,
  events,
  players: players ?? [],
  goldTimeline: (gold ?? []).map((d, i) => ({ t: (i + 1) * 2, diff: d })),
})
const ev = (t, type, side) => ({ t, type, side, note: '' })
const mkP = (side, role, k, d, a) => ({ name: `${side}${role}`, role, side, kills: k, deaths: d, assists: a })
// behind on kills -> scale
let ig1 = fakeGame([ev(5, 'kill', 'B'), ev(6, 'kill', 'B'), ev(7, 'kill', 'B'), ev(8, 'kill', 'B')], [], [0, 0, 0, -1000])
ok(optimalIglCall(ig1, true) === 'scale', 'behind -> scale')
// ahead late with gold -> baron
let ig2 = fakeGame(
  [ev(5, 'kill', 'A'), ev(6, 'kill', 'A'), ev(7, 'kill', 'A'), ev(21, 'dragon', 'A')],
  [mkP('A', 'TOP', 5, 1, 2), mkP('A', 'MID', 2, 2, 3), mkP('A', 'BOT', 2, 1, 2), mkP('A', 'SUP', 0, 1, 4), mkP('A', 'JNG', 1, 2, 3),
   mkP('B', 'TOP', 1, 3, 0), mkP('B', 'MID', 2, 2, 1), mkP('B', 'BOT', 1, 2, 1), mkP('B', 'SUP', 0, 2, 1), mkP('B', 'JNG', 1, 1, 2)],
  [500, 1200, 2200, 2600],
)
ok(optimalIglCall(ig2, true) === 'baron', 'ahead late with gold -> baron')
const igs2 = getIglGameState(ig2, true)
ok(igs2.goldDiff > 1500 && igs2.myKills === 3 && igs2.minute === 21, 'game state reads gold/kills/minute')
ok(igs2.myPlayers.length === 5 && igs2.foePlayers.length === 5, 'game state lists both teams KDA')
// fed top, even game -> split
let ig3 = fakeGame(
  [...Array.from({ length: 3 }, (_, i) => ({ ...ev(3 + i, 'kill', 'A'), killer: 'ATOP', victim: 'BJNG' })),
   ...Array.from({ length: 3 }, (_, i) => ({ ...ev(6 + i, 'kill', 'B'), killer: 'BJNG', victim: 'AJNG' }))],
  [mkP('A', 'TOP', 6, 1, 1), mkP('A', 'MID', 1, 1, 2), mkP('A', 'BOT', 1, 1, 1), mkP('A', 'SUP', 0, 1, 2), mkP('A', 'JNG', 1, 1, 3),
   mkP('B', 'TOP', 1, 4, 0), mkP('B', 'MID', 1, 1, 1), mkP('B', 'BOT', 1, 1, 1), mkP('B', 'SUP', 0, 1, 1), mkP('B', 'JNG', 1, 1, 1)],
  [200, 300, 400],
)
ok(optimalIglCall(ig3, true) === 'split', 'revealed fed top -> split')
const hiddenFedTop = { ...ig3, events: [ev(5, 'kill', 'A'), ev(6, 'kill', 'B')] }
ok(optimalIglCall(hiddenFedTop, true) === 'dragons', 'unrevealed final top KDA does not leak into call grading')
// mid behind, bot stable -> roam
let ig4 = fakeGame(
  [{ ...ev(5, 'kill', 'B'), killer: 'BMID', victim: 'AMID' }, { ...ev(9, 'kill', 'A'), killer: 'ABOT', victim: 'BBOT' }],
  [mkP('A', 'TOP', 1, 1, 0), mkP('A', 'MID', 0, 3, 1), mkP('A', 'BOT', 2, 1, 1), mkP('A', 'SUP', 1, 1, 3), mkP('A', 'JNG', 1, 1, 2),
   mkP('B', 'TOP', 1, 1, 0), mkP('B', 'MID', 3, 0, 1), mkP('B', 'BOT', 1, 2, 0), mkP('B', 'SUP', 0, 1, 1), mkP('B', 'JNG', 1, 1, 1)],
  [0, -200, -100],
)
ok(optimalIglCall(ig4, true) === 'roam', 'mid behind bot stable -> roam')
const pr = buildIglPrompt(ig2, true)
ok(pr.options.length === 7 && pr.optimalCallId === 'baron' && pr.rationale.length > 10, 'prompt carries 7 options + rationale')

// --- Rich event feed + live game state ---
let rs = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', mode: 'igl' })
rs = reducer(rs, { type: 'LIVE_WEEK_START' })
rs = reducer(rs, { type: 'LIVE_START_GAME' })
const pev = rs.live.current.pass1.events
const killEv = pev.find((e) => e.type === 'kill')
ok(killEv && killEv.killer && killEv.victim, 'kill events stamp killer/victim')
ok(/kills/.test(killEv.note) && /\+300g|\+400g/.test(killEv.note), 'kill note names players + gold: ' + killEv.note.slice(0, 40))
ok(!/— A |— B /.test(pev.map((e) => e.note).join(' ')), 'no bare A/B side tags left in feed')
const towerEv = pev.find((e) => e.type === 'tower')
ok(towerEv && /takes \d/.test(towerEv.note), 'tower note numbered: ' + towerEv.note.slice(0, 30))
const { liveGameState } = await import('../src/game/igl.js')
const half = pev.filter((e) => e.t <= 15)
const liveHalf = liveGameState({ events: half, goldTimeline: rs.live.current.pass1.goldTimeline, players: rs.live.current.pass1.players, userIsA: rs.live.userIsHome })
const liveFull = liveGameState({ events: pev, goldTimeline: rs.live.current.pass1.goldTimeline, players: rs.live.current.pass1.players, userIsA: rs.live.userIsHome })
ok(liveHalf.myKills + liveHalf.foeKills <= liveFull.myKills + liveFull.foeKills, 'live state accumulates with revealed events')
ok(liveFull.myPlayers.every((p) => p.kills + p.deaths + p.assists >= 0), 'live KDA attributed per player')
ok(PERSONALITY_IDS.length === 3, 'three draft personalities')
for (const pers of PERSONALITY_IDS) {
  const dr = createDraft('BLUE', 'RED')
  const mv = aiDraftMove(dr, Math.random, pers, new Set())
  ok(mv && (mv.type === 'ban' || mv.type === 'pick'), `aiDraftMove works with personality ${pers}`)
  ok(DRAFT_PERSONALITIES[pers].label, `personality ${pers} has a label`)
}
let ds0 = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', mode: 'draft' })
ds0 = reducer(ds0, { type: 'DRAFT_WEEK_START' })
ok(PERSONALITY_IDS.includes(ds0.draftSeries.aiPersonality), 'draft series gets an enemy personality')
ok(Array.isArray(ds0.draftSeries.aiComfort), 'draft series carries AI comfort pool')
const pb = reducer(d, { type: 'PLAY_ROUND' })
ok(pb === d, 'PLAY_ROUND no-ops in draft mode')

console.log(`EXPANSION: ALL PASSED (${n} assertions)`)
