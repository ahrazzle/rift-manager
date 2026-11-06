// ============================================================================
// Rift Manager — Active Coach draft engine (pure logic, no React).
// Official LoL pick/ban order, 20 steps. No RNG inside: the caller owns the
// rng and passes it to aiDraftMove. All updates are immutable.
//
// Post-draft debrief: on each of the player's pick turns, applyPick also
// records the data-optimal pick (argmax of the same heuristic the AI coach
// uses). getDraftDebrief(draft) exposes your 5 picks vs the optimal ones.
// ============================================================================
import { CHAMPIONS, CHAMP_BY_ID, ROLES_DRAFT } from '../data/champions.js'

export const DRAFT_ROLES = ROLES_DRAFT

// Official LoL draft order: 6 bans / 6 picks / 4 bans / 4 picks.
export const DRAFT_STEPS = [
  { type: 'ban', side: 'BLUE' }, { type: 'ban', side: 'RED' },
  { type: 'ban', side: 'BLUE' }, { type: 'ban', side: 'RED' },
  { type: 'ban', side: 'BLUE' }, { type: 'ban', side: 'RED' },
  { type: 'pick', side: 'BLUE' }, { type: 'pick', side: 'RED' },
  { type: 'pick', side: 'RED' }, { type: 'pick', side: 'BLUE' },
  { type: 'pick', side: 'BLUE' }, { type: 'pick', side: 'RED' },
  { type: 'ban', side: 'RED' }, { type: 'ban', side: 'BLUE' },
  { type: 'ban', side: 'RED' }, { type: 'ban', side: 'BLUE' },
  { type: 'pick', side: 'RED' }, { type: 'pick', side: 'BLUE' },
  { type: 'pick', side: 'BLUE' }, { type: 'pick', side: 'RED' },
]

export const DDRAGON_URL = 'https://ddragon.leagueoflegends.com/cdn/16.22.1/img/champion'
export function champPortrait(champ) {
  const c = typeof champ === 'string' ? CHAMP_BY_ID[champ] : champ
  return c?.ddragon ? `${DDRAGON_URL}/${c.ddragon}` : null
}

export function createDraft(userSide) {
  if (userSide !== 'BLUE' && userSide !== 'RED') {
    throw new Error(`userSide must be 'BLUE' or 'RED', got '${userSide}'`)
  }
  return {
    userSide,
    step: 0,
    bans: { BLUE: [], RED: [] },
    picks: { BLUE: {}, RED: {} },
    debrief: [],
    done: false,
  }
}

export function currentStep(draft) {
  return draft.done ? null : DRAFT_STEPS[draft.step]
}

function takenChamps(draft) {
  const s = new Set()
  for (const side of ['BLUE', 'RED']) {
    for (const b of draft.bans[side]) s.add(b)
    for (const c of Object.values(draft.picks[side])) s.add(c)
  }
  return s
}

// Champion ids not banned or picked by anyone.
export function legalBans(draft) {
  const taken = takenChamps(draft)
  return CHAMPIONS.filter((c) => !taken.has(c.id)).map((c) => c.id)
}

// [{champId, roles}] — champs with at least one unfilled role for side.
export function legalPicks(draft, side) {
  const taken = takenChamps(draft)
  const filled = draft.picks[side]
  const out = []
  for (const c of CHAMPIONS) {
    if (taken.has(c.id)) continue
    const roles = c.roles.filter((r) => !filled[r])
    if (roles.length > 0) out.push({ champId: c.id, roles })
  }
  return out
}

export function applyBan(draft, champId) {
  const step = currentStep(draft)
  if (!step) throw new Error('draft is already done')
  if (step.type !== 'ban') throw new Error(`step ${draft.step} is a pick, not a ban`)
  if (!CHAMP_BY_ID[champId]) throw new Error(`unknown champion '${champId}'`)
  if (!legalBans(draft).includes(champId)) throw new Error(`'${champId}' is not available to ban`)
  const next = draft.step + 1
  return {
    ...draft,
    step: next,
    bans: { ...draft.bans, [step.side]: [...draft.bans[step.side], champId] },
    done: next >= DRAFT_STEPS.length,
  }
}

// --- Pick scoring (shared by the AI coach and the debrief) ------------------
// Meta heuristic from style tags: engage/teamfight are the premier pro-play
// tools, pick/poke/split/protect situationally valuable.
const TAG_META = { engage: 3, teamfight: 3, pick: 2, poke: 2, split: 2, protect: 2 }

export function champMeta(champ) {
  const c = typeof champ === 'string' ? CHAMP_BY_ID[champ] : champ
  return (c?.styles ?? []).reduce((a, t) => a + (TAG_META[t] ?? 1), 0)
}

// Score a (champ, role) pick for a side given the draft so far.
// Returns {score, reason} — reason names the dominant factor, honestly.
function scorePick(draft, side, champId, role) {
  const champ = CHAMP_BY_ID[champId]
  const allied = Object.values(draft.picks[side]).map((cid) => CHAMP_BY_ID[cid])
  const meta = champMeta(champ)
  // Identity: champs sharing a style tag with 2+ allied picks cohere.
  const tagCounts = {}
  for (const a of allied) for (const t of a.styles) tagCounts[t] = (tagCounts[t] ?? 0) + 1
  let identTag = null
  for (const t of champ.styles) {
    const n = tagCounts[t] ?? 0
    if (n >= 2 && (identTag === null || n > tagCounts[identTag])) identTag = t
  }
  const identBonus = identTag ? 2 : 0
  // Phase curve: stacking 4+ of one spike phase is punished.
  const phaseCount = allied.filter((a) => a.phase === champ.phase).length
  const phasePenalty = phaseCount >= 3 ? 1.5 : 0
  const score = meta + identBonus - phasePenalty
  let reason
  if (identTag) reason = `locks in your ${identTag} identity`
  else if (phasePenalty > 0) reason = `avoids a fourth ${champ.phase}-game spike`
  else reason = `highest-rated ${champ.phase}-game pick left`
  return { score, reason }
}

// Argmax over legal (champ, role) pairs. Returns {champId, role, score, reason} or null.
function bestPickFor(draft, side) {
  const filled = draft.picks[side]
  const taken = takenChamps(draft)
  let best = null
  for (const c of CHAMPIONS) {
    if (taken.has(c.id)) continue
    for (const role of c.roles) {
      if (filled[role]) continue
      const { score, reason } = scorePick(draft, side, c.id, role)
      if (!best || score > best.score) best = { champId: c.id, role, score, reason }
    }
  }
  return best
}

export function applyPick(draft, champId, role) {
  const step = currentStep(draft)
  if (!step) throw new Error('draft is already done')
  if (step.type !== 'pick') throw new Error(`step ${draft.step} is a ban, not a pick`)
  if (!ROLES_DRAFT.includes(role)) throw new Error(`unknown role '${role}'`)
  const champ = CHAMP_BY_ID[champId]
  if (!champ) throw new Error(`unknown champion '${champId}'`)
  if (draft.picks[step.side][role]) throw new Error(`${step.side} ${role} is already filled`)
  if (!champ.roles.includes(role)) throw new Error(`${champ.name} cannot play ${role}`)
  if (takenChamps(draft).has(champId)) throw new Error(`${champ.name} is not available to pick`)
  // Debrief: on the player's pick turns, snapshot the data-optimal pick
  // BEFORE applying theirs, so we can compare afterwards.
  let debrief = draft.debrief
  if (step.side === draft.userSide) {
    const optimal = bestPickFor(draft, step.side)
    const yourScore = scorePick(draft, step.side, champId, role).score
    debrief = [...draft.debrief, {
      step: draft.step,
      side: step.side,
      yourPick: { champId, role, name: champ.name },
      optimalPick: optimal
        ? { champId: optimal.champId, role: optimal.role, name: CHAMP_BY_ID[optimal.champId].name }
        : null,
      delta: optimal ? Math.round((optimal.score - yourScore) * 100) / 100 : 0,
      note: optimal ? optimal.reason : '',
    }]
  }
  const next = draft.step + 1
  return {
    ...draft,
    step: next,
    picks: { ...draft.picks, [step.side]: { ...draft.picks[step.side], [role]: champId } },
    debrief,
    done: next >= DRAFT_STEPS.length,
  }
}

// The player's 5 picks vs the data-optimal pick at each turn.
// [{step, side, yourPick:{champId,role,name}, optimalPick:{...}|null, delta, note}]
export function getDraftDebrief(draft) {
  return draft.debrief.map((d) => ({
    step: d.step,
    side: d.side,
    yourPick: d.yourPick,
    optimalPick: d.optimalPick,
    delta: d.delta,
    note: d.note,
  }))
}

// --- AI coach ---------------------------------------------------------------
// Bans the highest-meta unbanned champion. Picks fill empty roles with the
// highest-scoring available champion (meta + identity coherence + phase
// curve, via scorePick). Ties broken by the caller's rng.
// --- AI drafting personalities ------------------------------------------------
// Different enemy coaches draft differently. Personality shifts pick scoring:
// meta = best available (default), early = forces early-game spikes,
// comfort = pocket picks its players actually play (needs a comfort pool).
export const DRAFT_PERSONALITIES = {
  meta: { label: 'Meta drafter', desc: 'Picks the highest-rated meta champions available.' },
  early: { label: 'Early-game bully', desc: 'Forces early spikes and lane bullies.' },
  comfort: { label: 'Comfort picker', desc: 'Drafts pocket picks its players play best.' },
}
export const PERSONALITY_IDS = Object.keys(DRAFT_PERSONALITIES)

export function aiDraftMove(draft, rng, personality = 'meta', comfortPool = null) {
  const step = currentStep(draft)
  if (!step) throw new Error('draft is already done')
  if (step.type === 'ban') {
    const pool = legalBans(draft)
    let top = -Infinity
    for (const id of pool) top = Math.max(top, champMeta(id))
    const tied = pool.filter((id) => champMeta(id) === top)
    return { type: 'ban', champId: tied[Math.floor(rng() * tied.length)] }
  }
  const filled = draft.picks[step.side]
  const taken = takenChamps(draft)
  const comfort = comfortPool instanceof Set ? comfortPool : new Set(comfortPool ?? [])
  const opts = []
  for (const c of CHAMPIONS) {
    if (taken.has(c.id)) continue
    for (const role of c.roles) {
      if (filled[role]) continue
      const { score, reason } = scorePick(draft, step.side, c.id, role)
      let adj = score
      let why = reason
      if (personality === 'early' && c.phase === 'early') {
        adj += 2
        why = 'early-game spike fits the bully plan'
      } else if (personality === 'comfort' && comfort.has(c.id)) {
        adj += 2.5
        why = 'pocket pick — their player plays this best'
      }
      opts.push({ champId: c.id, role, score: adj, reason: why })
    }
  }
  if (opts.length === 0) throw new Error(`no legal picks for ${step.side}`)
  let top = -Infinity
  for (const o of opts) top = Math.max(top, o.score)
  const tied = opts.filter((o) => o.score === top)
  const pick = tied[Math.floor(rng() * tied.length)]
  return { type: 'pick', champId: pick.champId, role: pick.role }
}

// --- Comp scoring ------------------------------------------------------------
// picks: {role: champId} → {bonus, identity, notes[]}
// identity = style tag shared by ≥3 picks, else 'Standard'.
// bonus 0..1.5: coherence reward + phase-curve balance, kept modest because
// the game balances around ±2.5 total modifiers.
export function scoreComp(picks) {
  const champs = Object.values(picks ?? {}).map((cid) => CHAMP_BY_ID[cid]).filter(Boolean)
  const notes = []
  const tagCounts = {}
  for (const c of champs) for (const t of c.styles) tagCounts[t] = (tagCounts[t] ?? 0) + 1
  let identity = 'Standard'
  let bestN = 0
  for (const [t, n] of Object.entries(tagCounts)) {
    if (n >= 3 && n > bestN) { identity = t; bestN = n }
  }
  let bonus = 0
  if (identity !== 'Standard') {
    bonus += 0.5 + 0.25 * (bestN - 3)
    notes.push(`${bestN} of 5 share ${identity}`)
  }
  const phaseCounts = {}
  for (const c of champs) phaseCounts[c.phase] = (phaseCounts[c.phase] ?? 0) + 1
  let maxPhase = null
  let maxN = 0
  for (const [p, n] of Object.entries(phaseCounts)) {
    if (n > maxN) { maxPhase = p; maxN = n }
  }
  if (maxN >= 4) {
    bonus -= 0.5
    notes.push(`too stacked on ${maxPhase}-game spikes`)
  } else if (Object.keys(phaseCounts).length >= 2) {
    bonus += 0.25
    notes.push('balanced power curve')
  }
  if (notes.length === 0) notes.push('no clear identity')
  bonus = Math.max(0, Math.min(1.5, Math.round(bonus * 100) / 100))
  return { bonus, identity, notes }
}
