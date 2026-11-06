// ============================================================================
// Rift Manager — Active Coach draft engine (pure logic, no React).
// Official LoL pick/ban order, 20 steps. No RNG inside: the caller owns the
// rng and passes it to aiDraftMove. All updates are immutable.
//
// Flex picks: champions can sit in an unassigned list until a role is chosen
// or forced. Fearless: ids picked in earlier series games stay unavailable when
// draft.fearless lists them (from the match session).
//
// Post-draft debrief: on each of the player's pick turns, the move also
// records the data-optimal committed pick. getDraftDebrief(draft) compares.
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

/** @param {{ fearlessIds?: string[] }} [opts] */
export function createDraft(userSide, opts = {}) {
  if (userSide !== 'BLUE' && userSide !== 'RED') {
    throw new Error(`userSide must be 'BLUE' or 'RED', got '${userSide}'`)
  }
  const fearless = Array.isArray(opts.fearlessIds) ? [...new Set(opts.fearlessIds)] : []
  return {
    userSide,
    step: 0,
    bans: { BLUE: [], RED: [] },
    picks: { BLUE: {}, RED: {} },
    flex: { BLUE: [], RED: [] },
    debrief: [],
    done: false,
    fearless,
  }
}

export function currentStep(draft) {
  return draft.done ? null : DRAFT_STEPS[draft.step]
}

function flexIdsForSide(draft, side) {
  return new Set((draft.flex?.[side] ?? []).map((e) => e.champId))
}

export function takenChamps(draft) {
  const s = new Set()
  for (const side of ['BLUE', 'RED']) {
    for (const b of draft.bans[side]) s.add(b)
    for (const c of Object.values(draft.picks[side])) s.add(c)
    for (const e of draft.flex?.[side] ?? []) s.add(e.champId)
  }
  return s
}

/** Ids unavailable this game: bans, picks, flex, and Fearless lockout */
function unavailableChampIds(draft) {
  const s = takenChamps(draft)
  for (const id of draft.fearless ?? []) s.add(id)
  return s
}

function openRolesForSide(draft, side) {
  return DRAFT_ROLES.filter((r) => !draft.picks[side][r])
}

function champEligibleRoles(draft, side, champId) {
  const champ = CHAMP_BY_ID[champId]
  if (!champ) return []
  return champ.roles.filter((r) => !draft.picks[side][r])
}

/** Roles a champion can still fill on side (open lanes only). */
export function openEligibleRoles(draft, side, champId) {
  return champEligibleRoles(draft, side, champId)
}

/**
 * Assign flex entries to distinct open roles (backtracking). Each entry:
 * { champId, reservedRole? }. A reservation consumes that role for that flex
 * when it is still open and legal.
 */
export function flexMatchingPossible(draft, side, extraFlex = null) {
  const entries = [...(draft.flex?.[side] ?? [])]
  if (extraFlex) entries.push(extraFlex)
  let open = new Set(openRolesForSide(draft, side))
  const pending = []
  for (const e of entries) {
    const champ = CHAMP_BY_ID[e.champId]
    if (!champ) return false
    if (e.reservedRole && open.has(e.reservedRole) && champ.roles.includes(e.reservedRole)) {
      open.delete(e.reservedRole)
      continue
    }
    const opts = champ.roles.filter((r) => open.has(r))
    if (opts.length === 0) return false
    pending.push({ champId: e.champId, opts })
  }
  const openArr = [...open]
  pending.sort((a, b) => a.opts.length - b.opts.length)
  function dfs(i, used) {
    if (i >= pending.length) return true
    const { opts } = pending[i]
    for (const r of opts) {
      if (used.has(r) || !openArr.includes(r)) continue
      used.add(r)
      if (dfs(i + 1, used)) return true
      used.delete(r)
    }
    return false
  }
  return dfs(0, new Set())
}

/** Roles an AI coach cannot commit (reserved for an earlier flex on that side). */
function rolesReservedForAi(draft, side) {
  const s = new Set()
  for (const e of draft.flex?.[side] ?? []) {
    if (e.reservedRole) s.add(e.reservedRole)
  }
  return s
}

function openRolesForCommittedPick(draft, side, isAiTurn) {
  const open = openRolesForSide(draft, side)
  if (!isAiTurn) return open
  const blocked = rolesReservedForAi(draft, side)
  return open.filter((r) => !blocked.has(r))
}

export function openEligibleRolesForPick(draft, side, champId, isAiTurn) {
  const open = openRolesForCommittedPick(draft, side, isAiTurn)
  const champ = CHAMP_BY_ID[champId]
  if (!champ) return []
  return champ.roles.filter((r) => open.includes(r))
}

/** Champion ids legal to ban: not taken (incl. flex) and not Fearless-locked */
export function legalBans(draft) {
  const taken = unavailableChampIds(draft)
  return CHAMPIONS.filter((c) => !taken.has(c.id)).map((c) => c.id)
}

/** Legal committed pick (champ, role) on a side this step */
export function legalCommittedPicksForStep(draft, side) {
  const step = currentStep(draft)
  if (!step || step.type !== 'pick' || step.side !== side) return []
  const taken = unavailableChampIds(draft)
  const isAi = side !== draft.userSide
  const reserved = isAi ? rolesReservedForAi(draft, side) : new Set()
  const out = []
  for (const c of CHAMPIONS) {
    if (taken.has(c.id)) continue
    if (flexIdsForSide(draft, side).has(c.id)) continue
    for (const role of c.roles) {
      if (draft.picks[side][role]) continue
      if (reserved.has(role)) continue
      const test = { ...draft, picks: { ...draft.picks, [side]: { ...draft.picks[side], [role]: c.id } } }
      if (!flexMatchingPossible(test, side)) continue
      out.push({ champId: c.id, role })
    }
  }
  return out
}

/**
 * [{champId, roles}] — browse pool: champs with ≥1 unfilled eligible role.
 * Used for filtering; legality of flex vs commit is enforced in handlers.
 */
export function legalPicks(draft, side) {
  const taken = unavailableChampIds(draft)
  const filled = draft.picks[side]
  const out = []
  for (const c of CHAMPIONS) {
    if (taken.has(c.id)) continue
    const roles = c.roles.filter((r) => !filled[r])
    if (roles.length > 0) out.push({ champId: c.id, roles })
  }
  return out
}

/** True if this champ can be taken as flex (2+ open eligible roles, matching ok) */
export function canApplyFlex(draft, side, champId) {
  const step = currentStep(draft)
  if (!step || step.type !== 'pick' || step.side !== side) return false
  const taken = unavailableChampIds(draft)
  if (taken.has(champId) || flexIdsForSide(draft, side).has(champId)) return false
  const roles = openEligibleRoles(draft, side, champId)
  if (roles.length < 2) return false
  return flexMatchingPossible(draft, side, { champId, reservedRole: null })
}

export function canAssignFlex(draft, side, champId, role) {
  if (!ROLES_DRAFT.includes(role)) return false
  if (draft.picks[side][role]) return false
  const entry = (draft.flex?.[side] ?? []).find((e) => e.champId === champId)
  if (!entry) return false
  const champ = CHAMP_BY_ID[champId]
  if (!champ?.roles.includes(role)) return false
  const nextFlex = (draft.flex[side] ?? []).filter((e) => e.champId !== champId)
  const testDraft = {
    ...draft,
    flex: { ...draft.flex, [side]: nextFlex },
    picks: { ...draft.picks, [side]: { ...draft.picks[side], [role]: champId } },
  }
  return flexMatchingPossible(testDraft, side)
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
const TAG_META = { engage: 3, teamfight: 3, pick: 2, poke: 2, split: 2, protect: 2 }

export function champMeta(champ) {
  const c = typeof champ === 'string' ? CHAMP_BY_ID[champ] : champ
  return (c?.styles ?? []).reduce((a, t) => a + (TAG_META[t] ?? 1), 0)
}

function scorePick(draft, side, champId, role) {
  const champ = CHAMP_BY_ID[champId]
  const allied = Object.values(draft.picks[side]).map((cid) => CHAMP_BY_ID[cid])
  const meta = champMeta(champ)
  const tagCounts = {}
  for (const a of allied) for (const t of a.styles) tagCounts[t] = (tagCounts[t] ?? 0) + 1
  let identTag = null
  for (const t of champ.styles) {
    const n = tagCounts[t] ?? 0
    if (n >= 2 && (identTag === null || n > tagCounts[identTag])) identTag = t
  }
  const identBonus = identTag ? 2 : 0
  const phaseCount = allied.filter((a) => a.phase === champ.phase).length
  const phasePenalty = phaseCount >= 3 ? 1.5 : 0
  const score = meta + identBonus - phasePenalty
  let reason
  if (identTag) reason = `locks in your ${identTag} identity`
  else if (phasePenalty > 0) reason = `avoids a fourth ${champ.phase}-game spike`
  else reason = `highest-rated ${champ.phase}-game pick left`
  return { score, reason }
}

function bestPickFor(draft, side) {
  const isAi = side !== draft.userSide
  const filled = draft.picks[side]
  const taken = unavailableChampIds(draft)
  const reserved = isAi ? rolesReservedForAi(draft, side) : new Set()
  let best = null
  for (const c of CHAMPIONS) {
    if (taken.has(c.id) || flexIdsForSide(draft, side).has(c.id)) continue
    for (const role of c.roles) {
      if (filled[role] || reserved.has(role)) continue
      const test = { ...draft, picks: { ...draft.picks, [side]: { ...draft.picks[side], [role]: c.id } } }
      if (!flexMatchingPossible(test, side)) continue
      const { score, reason } = scorePick(draft, side, c.id, role)
      if (!best || score > best.score) best = { champId: c.id, role, score, reason }
    }
  }
  return best
}

function appendDebrief(draft, side, yourPick) {
  const optimal = bestPickFor(draft, side)
  const yourScore = yourPick.role
    ? scorePick(draft, side, yourPick.champId, yourPick.role).score
    : (optimal?.score ?? 0)
  const nm = CHAMP_BY_ID[yourPick.champId]?.name ?? yourPick.champId
  return [...draft.debrief, {
    step: draft.step,
    side,
    yourPick: { ...yourPick, name: nm },
    optimalPick: optimal
      ? { champId: optimal.champId, role: optimal.role, name: CHAMP_BY_ID[optimal.champId].name }
      : null,
    delta: optimal && yourPick.role ? Math.round((optimal.score - yourScore) * 100) / 100 : 0,
    note: optimal ? optimal.reason : '',
  }]
}

export function applyPick(draft, champId, role) {
  const step = currentStep(draft)
  if (!step) throw new Error('draft is already done')
  if (step.type !== 'pick') throw new Error(`step ${draft.step} is a ban, not a pick`)
  if (!ROLES_DRAFT.includes(role)) throw new Error(`unknown role '${role}'`)
  const champ = CHAMP_BY_ID[champId]
  if (!champ) throw new Error(`unknown champion '${champId}'`)
  const side = step.side
  if (draft.picks[side][role]) throw new Error(`${side} ${role} is already filled`)
  if (!champ.roles.includes(role)) throw new Error(`${champ.name} cannot play ${role}`)
  if (unavailableChampIds(draft).has(champId)) throw new Error(`${champ.name} is not available to pick`)
  if (flexIdsForSide(draft, side).has(champId)) throw new Error(`${champ.name} is already a flex pick`)

  const nextPicks = { ...draft.picks, [side]: { ...draft.picks[side], [role]: champId } }
  const testDraft = { ...draft, picks: nextPicks }
  if (!flexMatchingPossible(testDraft, side)) {
    throw new Error('That pick leaves no valid flex assignment')
  }

  let debrief = draft.debrief
  if (side === draft.userSide) debrief = appendDebrief(draft, side, { champId, role })

  const next = draft.step + 1
  let out = {
    ...draft,
    step: next,
    picks: nextPicks,
    debrief,
    done: next >= DRAFT_STEPS.length,
  }
  out = autoResolveFlexAllSides(out)
  if (out.done) out = finalizeEnemyFlex(out)
  return out
}

/**
 * Pick without a committed role: single open role commits; 2+ adds flex.
 */
export function applyFlex(draft, champId) {
  const step = currentStep(draft)
  if (!step) throw new Error('draft is already done')
  if (step.type !== 'pick') throw new Error(`step ${draft.step} is a ban, not a pick`)
  const side = step.side
  const champ = CHAMP_BY_ID[champId]
  if (!champ) throw new Error(`unknown champion '${champId}'`)
  if (unavailableChampIds(draft).has(champId)) throw new Error(`${champ.name} is not available to pick`)
  if (flexIdsForSide(draft, side).has(champId)) throw new Error(`${champ.name} is already a flex`)

  const elig = openEligibleRoles(draft, side, champId)
  if (elig.length === 0) throw new Error('No open role for that champion')
  if (elig.length === 1) {
    return applyPick(draft, champId, elig[0])
  }
  if (!flexMatchingPossible(draft, side, { champId, reservedRole: null })) {
    throw new Error('Flex would leave no valid role assignment')
  }

  const flexEntry = { champId, reservedRole: null }
  const nextFlex = { ...draft.flex, [side]: [...(draft.flex?.[side] ?? []), flexEntry] }
  let debrief = draft.debrief
  if (side === draft.userSide) debrief = appendDebrief(draft, side, { champId, role: null, flex: true })

  const next = draft.step + 1
  let out = {
    ...draft,
    step: next,
    flex: nextFlex,
    debrief,
    done: next >= DRAFT_STEPS.length,
  }
  out = autoResolveFlexAllSides(out)
  if (out.done) out = finalizeEnemyFlex(out)
  return out
}

/** AI-only flex: reserves intended role for later commits (hidden from UI). */
export function applyFlexReserved(draft, champId, reservedRole) {
  const step = currentStep(draft)
  if (!step) throw new Error('draft is already done')
  if (step.type !== 'pick') throw new Error(`step ${draft.step} is a ban, not a pick`)
  const side = step.side
  if (side === draft.userSide) throw new Error('applyFlexReserved is AI-only')
  if (!CHAMP_BY_ID[champId] || !reservedRole) throw new Error('bad flex reservation')
  if (unavailableChampIds(draft).has(champId)) throw new Error('champion unavailable')
  const champ = CHAMP_BY_ID[champId]
  if (!champ.roles.includes(reservedRole)) throw new Error('invalid reservation')
  if (!openRolesForSide(draft, side).includes(reservedRole)) throw new Error('reserved role not open')
  const nextFlex = { ...draft.flex, [side]: [...(draft.flex?.[side] ?? []), { champId, reservedRole }] }
  const test = { ...draft, flex: nextFlex }
  if (!flexMatchingPossible(test, side)) throw new Error('flex reservation breaks matching')
  const next = draft.step + 1
  let out = {
    ...draft,
    step: next,
    flex: nextFlex,
    done: next >= DRAFT_STEPS.length,
  }
  out = autoResolveFlexAllSides(out)
  if (out.done) out = finalizeEnemyFlex(out)
  return out
}

/** Assign a flex pick to an empty role (free action, no draft step). */
export function assignFlex(draft, side, champId, role) {
  if (!canAssignFlex(draft, side, champId, role)) {
    throw new Error('Illegal flex assignment')
  }
  const entry = (draft.flex[side] ?? []).find((e) => e.champId === champId)
  const nextFlex = (draft.flex[side] ?? []).filter((e) => e.champId !== champId)
  let out = {
    ...draft,
    flex: { ...draft.flex, [side]: nextFlex },
    picks: { ...draft.picks, [side]: { ...draft.picks[side], [role]: champId } },
  }
  out = autoResolveFlexAllSides(out)
  if (out.done) out = finalizeEnemyFlex(out)
  return out
}

function autoResolveFlexSide(draft, side) {
  let d = draft
  let guard = 0
  while (guard++ < 20) {
    const list = [...(d.flex?.[side] ?? [])]
    if (list.length === 0) break
    let changed = false

    for (const e of list) {
      const elig = champEligibleRoles(d, side, e.champId).filter((r) =>
        openRolesForSide(d, side).includes(r))
      if (elig.length === 1) {
        const role = elig[0]
        d = {
          ...d,
          flex: { ...d.flex, [side]: (d.flex[side] ?? []).filter((x) => x.champId !== e.champId) },
          picks: { ...d.picks, [side]: { ...d.picks[side], [role]: e.champId } },
        }
        changed = true
      }
    }
    if (changed) continue

    for (const e of [...(d.flex?.[side] ?? [])]) {
      const champ = CHAMP_BY_ID[e.champId]
      const cand = champ.roles.filter((r) => openRolesForSide(d, side).includes(r))
      if (cand.length !== 1) continue
      const only = cand[0]
      if (canAssignFlex(d, side, e.champId, only)) {
        d = assignFlexInner(d, side, e.champId, only)
        changed = true
      }
    }
    if (!changed) break
  }
  return d
}

function assignFlexInner(draft, side, champId, role) {
  const nextFlex = (draft.flex[side] ?? []).filter((e) => e.champId !== champId)
  return {
    ...draft,
    flex: { ...draft.flex, [side]: nextFlex },
    picks: { ...draft.picks, [side]: { ...draft.picks[side], [role]: champId } },
  }
}

function autoResolveFlexAllSides(draft) {
  let d = draft
  d = autoResolveFlexSide(d, 'BLUE')
  d = autoResolveFlexSide(d, 'RED')
  return d
}

/** When the 20 draft steps finish, assign only the enemy coach's flex picks */
function finalizeEnemyFlex(draft) {
  if (!draft.done) return draft
  const enemy = draft.userSide === 'BLUE' ? 'RED' : 'BLUE'
  return finalizeSideFlex(draft, enemy)
}

function finalizeSideFlex(draft, side) {
  let d = { ...draft }
  const list = [...(d.flex?.[side] ?? [])]
  for (const e of list) {
    const champ = CHAMP_BY_ID[e.champId]
    const open = openRolesForSide(d, side)
    let role = e.reservedRole && open.includes(e.reservedRole) && champ.roles.includes(e.reservedRole)
      ? e.reservedRole
      : null
    if (role == null) {
      const opts = champ.roles.filter((r) => open.includes(r))
      if (opts.length === 1) role = opts[0]
    }
    if (role != null) {
      d = assignFlexInner(d, side, e.champId, role)
    }
  }
  d = autoResolveFlexSide(d, side)
  const remaining = (d.flex?.[side] ?? [])
  if (remaining.length === 0) return d
  const openRoles = openRolesForSide(d, side)
  const assign = findFlexAssignments(remaining, openRoles)
  for (const [champId, r] of assign) {
    d = assignFlexInner(d, side, champId, r)
  }
  return d
}

function findFlexAssignments(flexEntries, openRoles) {
  const entries = [...flexEntries]
  entries.sort((a, b) => {
    const na = CHAMP_BY_ID[a.champId].roles.filter((r) => openRoles.includes(r)).length
    const nb = CHAMP_BY_ID[b.champId].roles.filter((r) => openRoles.includes(r)).length
    return na - nb
  })
  function dfs(idx, used, out) {
    if (idx >= entries.length) return out
    const e = entries[idx]
    const champ = CHAMP_BY_ID[e.champId]
    const opts = champ.roles.filter((r) => openRoles.includes(r) && !used.has(r))
    for (const r of opts) {
      used.add(r)
      const sub = dfs(idx + 1, used, [...out, [e.champId, r]])
      if (sub) return sub
      used.delete(r)
    }
    return null
  }
  return dfs(0, new Set(), []) ?? []
}

export function allRolesFilled(draft, side = null) {
  const sides = side ? [side] : ['BLUE', 'RED']
  return sides.every((sd) => DRAFT_ROLES.every((r) => draft.picks[sd][r]) && (draft.flex?.[sd]?.length ?? 0) === 0)
}

export function draftReadyToPlay(draft) {
  return draft.done && allRolesFilled(draft)
}

export function getResolvedPicks(draft, side) {
  return draft.picks[side] ?? {}
}

// --- Role swaps / moves (no draft step; matching on edited side must hold) ---
function assertSideFlexMatching(draft, side) {
  if (!flexMatchingPossible(draft, side)) throw new Error(`flex matching failed (${side})`)
}

/**
 * Swap two filled roles on one side. Both champs must play the other's role.
 */
export function swapPicks(draft, side, roleA, roleB) {
  if (!ROLES_DRAFT.includes(roleA) || !ROLES_DRAFT.includes(roleB)) throw new Error('bad role')
  if (roleA === roleB) throw new Error('need two distinct roles')
  const pa = draft.picks[side]?.[roleA]
  const pb = draft.picks[side]?.[roleB]
  if (!pa || !pb) throw new Error('swap needs two filled roles')
  const ca = CHAMP_BY_ID[pa]
  const cb = CHAMP_BY_ID[pb]
  if (!ca?.roles.includes(roleB) || !cb?.roles.includes(roleA)) {
    throw new Error('champions cannot play those destination roles')
  }
  const nextSide = { ...draft.picks[side], [roleA]: pb, [roleB]: pa }
  const out = { ...draft, picks: { ...draft.picks, [side]: nextSide } }
  assertSideFlexMatching(out, side)
  return autoResolveFlexAllSides(out)
}

/**
 * Move a committed champ from a filled role to an empty one they can play.
 */
export function movePick(draft, side, fromRole, toRole) {
  if (!ROLES_DRAFT.includes(fromRole) || !ROLES_DRAFT.includes(toRole)) throw new Error('bad role')
  if (fromRole === toRole) throw new Error('distinct roles')
  const cid = draft.picks[side]?.[fromRole]
  if (!cid) throw new Error('no pick in source role')
  if (draft.picks[side]?.[toRole]) throw new Error('destination must be empty')
  const c = CHAMP_BY_ID[cid]
  if (!c?.roles.includes(toRole)) throw new Error(`${c?.name ?? cid} can't play ${toRole}`)
  const nextSide = { ...draft.picks[side], [toRole]: cid }
  delete nextSide[fromRole]
  const out = { ...draft, picks: { ...draft.picks, [side]: nextSide } }
  assertSideFlexMatching(out, side)
  return autoResolveFlexAllSides(out)
}

/**
 * Flex takes a filled role; displaced champ goes to their only legal open role,
 * or becomes flex if 2+ legal opens; illegal if none.
 */
export function flexIntoFilledRole(draft, side, flexChampId, targetRole) {
  if (!ROLES_DRAFT.includes(targetRole)) throw new Error('bad role')
  const entry = (draft.flex?.[side] ?? []).find((e) => e.champId === flexChampId)
  if (!entry) throw new Error('not an unassigned flex')
  const flexC = CHAMP_BY_ID[flexChampId]
  if (!flexC?.roles.includes(targetRole)) throw new Error(`${flexC?.name ?? flexChampId} can't play ${targetRole}`)
  const displaced = draft.picks[side]?.[targetRole]
  if (!displaced) {
    return assignFlex(draft, side, flexChampId, targetRole)
  }
  const dispC = CHAMP_BY_ID[displaced]
  if (!dispC) throw new Error('displaced unknown')

  const picksCopy = { ...draft.picks[side], [targetRole]: flexChampId }
  const flexList = (draft.flex?.[side] ?? []).filter((e) => e.champId !== flexChampId)

  const openRoles = DRAFT_ROLES.filter((r) => !picksCopy[r])
  const homes = openRoles.filter((r) => dispC.roles.includes(r))

  if (homes.length === 0) throw new Error('displaced has no legal open role')
  let nextFlex = [...flexList]
  if (homes.length === 1) {
    picksCopy[homes[0]] = displaced
  } else {
    nextFlex.push({ champId: displaced, reservedRole: null })
  }

  let out = { ...draft, picks: { ...draft.picks, [side]: picksCopy }, flex: { ...draft.flex, [side]: nextFlex } }
  assertSideFlexMatching(out, side)
  out = autoResolveFlexAllSides(out)
  return out
}

function rearrangeOk(fn, ...args) {
  try {
    fn(...args)
    return true
  } catch {
    return false
  }
}

export function canSwapPicks(draft, side, roleA, roleB) {
  return rearrangeOk(swapPicks, draft, side, roleA, roleB)
}

export function canMovePick(draft, side, fromRole, toRole) {
  return rearrangeOk(movePick, draft, side, fromRole, toRole)
}

export function canFlexIntoFilledRole(draft, side, flexChampId, targetRole) {
  return rearrangeOk(flexIntoFilledRole, draft, side, flexChampId, targetRole)
}

/** Attempt minimal enemy-side swaps/moves so flex matching holds (AI legality). */
export function repairEnemyFlexMatching(draft, rng = Math.random) {
  const enemy = draft.userSide === 'BLUE' ? 'RED' : 'BLUE'
  if (flexMatchingPossible(draft, enemy)) return draft

  const roles = [...DRAFT_ROLES]
  for (let attempt = 0; attempt < 80; attempt++) {
    if (flexMatchingPossible(draft, enemy)) return draft

    const pairs = []
    for (let i = 0; i < roles.length; i++) {
      for (let j = i + 1; j < roles.length; j++) pairs.push([roles[i], roles[j]])
    }
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[pairs[i], pairs[j]] = [pairs[j], pairs[i]]
    }

    for (const [a, b] of pairs) {
      const pa = draft.picks[enemy]?.[a]
      const pb = draft.picks[enemy]?.[b]
      if (pa && pb && canSwapPicks(draft, enemy, a, b)) {
        draft = swapPicks(draft, enemy, a, b)
        break
      }
    }

    if (flexMatchingPossible(draft, enemy)) continue

    let moved = false
    outer: for (const from of roles) {
      for (const to of roles) {
        if (from === to) continue
        if (draft.picks[enemy]?.[from] && !draft.picks[enemy]?.[to] && canMovePick(draft, enemy, from, to)) {
          draft = movePick(draft, enemy, from, to)
          moved = true
          break outer
        }
      }
    }
    if (!moved) break
  }
  return draft
}

// --- Debrief ----------------------------------------------------------------
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
  const side = step.side
  const isAi = side !== draft.userSide
  const filled = draft.picks[side]
  const taken = unavailableChampIds(draft)
  const reserved = isAi ? rolesReservedForAi(draft, side) : new Set()
  const comfort = comfortPool instanceof Set ? comfortPool : new Set(comfortPool ?? [])
  const opts = []
  for (const c of CHAMPIONS) {
    if (taken.has(c.id) || flexIdsForSide(draft, side).has(c.id)) continue
    for (const role of c.roles) {
      if (filled[role] || reserved.has(role)) continue
      const test = { ...draft, picks: { ...draft.picks, [side]: { ...draft.picks[side], [role]: c.id } } }
      if (!flexMatchingPossible(test, side)) continue
      const { score, reason } = scorePick(draft, side, c.id, role)
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
  if (opts.length === 0) throw new Error(`no legal picks for ${side}`)
  let top = -Infinity
  for (const o of opts) top = Math.max(top, o.score)
  const tied = opts.filter((o) => o.score === top)
  const pick = tied[Math.floor(rng() * tied.length)]
  const openForChamp = openEligibleRolesForPick(draft, side, pick.champId, isAi)
  const wantsFlex = isAi && openForChamp.length >= 2
    && flexMatchingPossible(draft, side, { champId: pick.champId, reservedRole: pick.role })
  if (wantsFlex) {
    return { type: 'pick', flex: true, champId: pick.champId, role: pick.role }
  }
  return { type: 'pick', flex: false, champId: pick.champId, role: pick.role }
}

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
