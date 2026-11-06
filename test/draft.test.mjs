// Active Coach draft tests. Run: node test/draft.test.mjs
import {
  DRAFT_STEPS, createDraft, currentStep, applyBan, applyPick,
  legalBans, legalPicks, aiDraftMove, scoreComp, getDraftDebrief, champMeta,
} from '../src/game/draft.js'
import { CHAMPIONS } from '../src/data/champions.js'

let failures = 0
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); failures++ } else console.log('ok  :', m) }
function throws(fn, m) {
  try { fn() } catch { console.log('ok  :', m); return }
  console.error('FAIL:', m); failures++
}
function rng32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

// ---------- draft order ----------
assert(DRAFT_STEPS.length === 20, 'DRAFT_STEPS has 20 steps')
const order = DRAFT_STEPS.map((s) => `${s.type[0]}${s.side[0]}`).join(',')
assert(order === 'bB,bR,bB,bR,bB,bR,pB,pR,pR,pB,pB,pR,bR,bB,bR,bB,pR,pB,pB,pR', `official order (${order})`)
assert(DRAFT_STEPS.filter((s) => s.type === 'ban').length === 10, '10 bans total')
assert(DRAFT_STEPS.filter((s) => s.type === 'pick').length === 10, '10 picks total')

// ---------- construction ----------
throws(() => createDraft('GREEN'), 'createDraft rejects bad side')
const d0 = createDraft('BLUE')
assert(d0.step === 0 && !d0.done && d0.userSide === 'BLUE', 'createDraft initial state')
assert(currentStep(d0).type === 'ban' && currentStep(d0).side === 'BLUE', 'currentStep step 0')

// ---------- illegal moves ----------
throws(() => applyPick(d0, 'ahri', 'MID'), 'pick on a ban step throws')
throws(() => applyBan(d0, 'nope'), 'ban unknown champ throws')
let d = applyBan(d0, 'ahri')
throws(() => applyBan(d, 'ahri'), 'double ban throws')
throws(() => applyPick(d, 'zed', 'TOP'), 'zed cannot play TOP throws')
// advance to a pick step: finish ban phase 1 (5 more bans)
for (const id of ['zed', 'azir', 'vi', 'leona', 'thresh']) d = applyBan(d, id)
assert(currentStep(d).type === 'pick' && currentStep(d).side === 'BLUE', 'reached pick phase 1')
throws(() => applyBan(d, 'ashe'), 'ban on a pick step throws')
throws(() => applyPick(d, 'ashe', 'JNG'), 'ashe cannot play JNG throws')
d = applyPick(d, 'ashe', 'BOT')
assert(d.picks.BLUE.BOT === 'ashe', 'pick recorded')
d = applyPick(d, 'caitlyn', 'BOT') // RED's turn — BOT free for RED
throws(() => applyPick(d, 'jhin', 'BOT'), 'second BOT pick for RED throws (role filled)')

// ---------- full draft completes (player BLUE, AI otherwise) ----------
function fullDraft(userSide, seed, playerStrategy) {
  let dr = createDraft(userSide)
  const rng = rng32(seed)
  while (!dr.done) {
    const st = currentStep(dr)
    if (st.side === userSide) {
      if (st.type === 'ban') dr = applyBan(dr, playerStrategy.ban(dr))
      else { const { champId, role } = playerStrategy.pick(dr); dr = applyPick(dr, champId, role) }
    } else {
      const mv = aiDraftMove(dr, rng)
      dr = mv.type === 'ban' ? applyBan(dr, mv.champId) : applyPick(dr, mv.champId, mv.role)
    }
  }
  return dr
}
const firstLegal = {
  ban: (dr) => legalBans(dr)[0],
  pick: (dr) => { const p = legalPicks(dr, dr.userSide)[0]; return { champId: p.champId, role: p.roles[0] } },
}
const done = fullDraft('BLUE', 7, firstLegal)
assert(done.done && currentStep(done) === null, 'draft completes, currentStep null when done')
assert(Object.keys(done.picks.BLUE).length === 5 && Object.keys(done.picks.RED).length === 5, 'AI+player fill 5 roles per side')
assert(done.bans.BLUE.length + done.bans.RED.length === 10, '10 bans recorded')
const allPicked = [...Object.values(done.picks.BLUE), ...Object.values(done.picks.RED)]
assert(new Set(allPicked).size === 10, 'no duplicate picks across sides')
throws(() => applyBan(done, 'garen'), 'move after done throws')

// ---------- AI fills 5 roles on its own ----------
const aiOnly = fullDraft('RED', 42, {
  ban: (dr) => legalBans(dr)[0],
  pick: (dr) => { const p = legalPicks(dr, dr.userSide)[0]; return { champId: p.champId, role: p.roles[0] } },
})
assert(Object.keys(aiOnly.picks.BLUE).length === 5, 'AI fills all 5 BLUE roles')
assert(Object.keys(aiOnly.picks.RED).length === 5, 'AI fills all 5 RED roles')

// ---------- scoreComp ----------
const coherent = { TOP: 'darius', JNG: 'jarvan', MID: 'leblanc', BOT: 'draven', SUP: 'leona' }
const sc = scoreComp(coherent)
assert(sc.identity !== 'Standard', `coherent comp has identity (${sc.identity})`)
assert(sc.bonus >= 0 && sc.bonus <= 1.5, `bonus in range 0..1.5 (${sc.bonus})`)
assert(Array.isArray(sc.notes) && sc.notes.length > 0, 'scoreComp returns notes')
const stacked = { TOP: 'darius', JNG: 'jarvan', MID: 'leblanc', BOT: 'caitlyn', SUP: 'karma' }
const sc2 = scoreComp(stacked)
assert(sc2.bonus <= sc.bonus, `phase-stacked comp scores <= coherent (${sc2.bonus} <= ${sc.bonus})`)
const sc3 = scoreComp({})
assert(sc3.bonus === 0 && sc3.identity === 'Standard', 'empty picks score 0/Standard')

// ---------- debrief ----------
// Player always takes the first legal pick (usually suboptimal) → 5 entries, delta >= 0
const db = getDraftDebrief(done)
assert(db.length === 5, `debrief has 5 entries (${db.length})`)
assert(db.every((e) => e.side === 'BLUE' && e.optimalPick && e.delta >= 0), 'debrief entries well-formed, delta >= 0')
assert(db.every((e) => typeof e.step === 'number' && e.yourPick.name && e.optimalPick.name), 'debrief carries names')
// AI-optimal play (rng()=0 → first tie = argmax) → delta 0 everywhere
const zeroRng = () => 0
let dr2 = createDraft('BLUE')
while (!dr2.done) {
  const st = currentStep(dr2)
  const mv = aiDraftMove(dr2, zeroRng)
  dr2 = mv.type === 'ban' ? applyBan(dr2, mv.champId) : applyPick(dr2, mv.champId, mv.role)
}
const db2 = getDraftDebrief(dr2)
assert(db2.length === 5 && db2.every((e) => e.delta === 0), 'optimal play yields delta 0 on all 5 picks')
assert(getDraftDebrief(createDraft('RED')).length === 0, 'fresh draft has empty debrief')

// ---------- meta heuristic ----------
assert(champMeta('jarvan') === 6, `jarvan meta = engage(3)+teamfight(3) (${champMeta('jarvan')})`)
assert(champMeta('jarvan') > champMeta('karma'), 'engage/teamfight outranks poke/protect')
assert(CHAMPIONS.length === 173, '173 champions in pool')
assert(CHAMPIONS.every((c) => c.ddragon && c.ddragon.endsWith('.png')), 'every champ has a ddragon filename')

console.log(failures === 0 ? '\nDRAFT: ALL PASSED' : `\nDRAFT: ${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
