// Opt-in academy lifecycle. Never rolls for a standout or consumes global RNG.
import { buildAcademyPlayer } from '../../data/academy.js'
import { mulberry32 } from '../random.js'

const active = (s) => s?.mode === 'career' && s.career?.status === 'active' && !s.sacked
const result = (state, effects = []) => ({ state, ok: true, reason: null, effects })
const deny = (state, code, reason) => ({ state, ok: false, code, reason, effects: [] })
const pool = (s, id = s.teamId) => s.academyByTeam?.[id] ?? []
const valid = (p) => p && typeof p.id === 'string' && typeof p.name === 'string' && ['TOP', 'JNG', 'MID', 'BOT', 'SUP'].includes(p.role)
const allIds = (s) => new Set([...Object.values(s.teams ?? {}).flat(), ...(s.faPool ?? []), ...Object.values(s.academyByTeam ?? {}).flat()].map((p) => p.id))
function uniquePlayer(s, p) {
  const ids = allIds(s)
  let id = p.id
  for (let n = 2; ids.has(id); n++) id = `${p.id}-academy-${n}`
  return { ...p, id, academy: true }
}

/** Idempotent migration; an existing academy id is authoritative. */
export function migrateAcademy(state) {
  if (state?.mode !== 'career') return state
  let next = state.academyByTeam ? state : { ...state, academyByTeam: {} }
  const pp = next.pendingPromotion
  if (!pp?.player || !valid(pp.player) || pp.teamId !== state.teamId) return next
  const existing = pool(next, pp.teamId).find((p) => p.id === pp.player.id)
  const player = existing ?? uniquePlayer(next, pp.player)
  if (!existing) next = { ...next, academyByTeam: { ...next.academyByTeam, [pp.teamId]: [...pool(next, pp.teamId), player] } }
  return { ...next, pendingPromotion: { teamId: pp.teamId, prospectIds: pool(next, pp.teamId).map((p) => p.id) } }
}

export function selectAcademy(state) {
  const s = migrateAcademy(state)
  const prospects = pool(s)
  const starters = new Set(Object.values(s.lineup ?? {}))
  const bench = (s.teams?.[s.teamId] ?? []).filter((p) => !starters.has(p.id))
  return { prospects, bench, reason: bench.length ? null : 'There is no bench player to release. These prospects stay in the academy and will be available next offseason.' }
}

/** Call after locker-event resolution; season dismissal markers prevent reoffering. */
export function offerAcademy(state) {
  if (!active(state) || state.pendingEvent || state.pendingPromotion || state.matchSession) return result(state)
  if (state.academyOfferSeasonByTeam?.[state.teamId] === state.career.seasonIndex || !pool(state).length) return result(state)
  return result({ ...state, pendingPromotion: { teamId: state.teamId, prospectIds: pool(state).map((p) => p.id) } })
}

/** Consume the legacy ADVANCE_SEASON result, including its already-rolled kid. */
export function afterAcademyAdvance(before, after) {
  if (before === after || !active(after) || after.career.seasonIndex === before.career?.seasonIndex) return result(after)
  let next = after
  const rolled = after.pendingPromotion?.player
  if (valid(rolled) && after.pendingPromotion.teamId === after.teamId) {
    const player = uniquePlayer(next, rolled)
    next = { ...next, academyByTeam: { ...next.academyByTeam, [next.teamId]: [...pool(next), player] }, pendingPromotion: null }
    // A separate stream enriches a hit without moving the legacy simulation RNG.
    let seed = after.career.seasonIndex
    for (const c of `${after.teamId}:${rolled.id}`) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619)
    const rng = mulberry32(seed >>> 0)
    while (pool(next).length < 3) {
      const candidate = uniquePlayer(next, buildAcademyPlayer(next.teamId, next.teamMeta?.[next.teamId]?.tier ?? 80, null, rng))
      next = { ...next, academyByTeam: { ...next.academyByTeam, [next.teamId]: [...pool(next), candidate] } }
    }
  }
  return offerAcademy(next)
}

/** Explicit promotion is a replacement; invalid requests never modify state. */
export function resolveAcademy(state, action) {
  if (action?.type !== 'RESOLVE_PROMOTION') return deny(state, 'UNSUPPORTED_ACTION', 'Choose an academy decision.')
  if (!active(state)) return deny(state, 'CAREER_INACTIVE', 'Academy decisions require an active Career.')
  if (state.pendingEvent) return deny(state, 'LOCKER_EVENT_PENDING', 'Resolve the locker-room event first.')
  if (state.matchSession) return deny(state, 'MATCH_SESSION_OPEN', 'Close the current match before changing the roster.')
  if (!state.pendingPromotion || state.pendingPromotion.teamId !== state.teamId) return deny(state, 'NO_OFFER', 'There is no academy offer for your club.')
  const s = migrateAcademy(state)
  const finish = (next, message, effect) => result({ ...next, pendingPromotion: null, lastEventLog: message, academyOfferSeasonByTeam: { ...next.academyOfferSeasonByTeam, [next.teamId]: next.career.seasonIndex } }, [effect])
  if (action.promote === false || action.declineAll === true) {
    const message = selectAcademy(s).reason ?? 'These prospects stay in the academy and will be available next offseason.'
    return finish(s, message, { type: 'ACADEMY_DECLINED', message, playerIds: pool(s).map((p) => p.id) })
  }
  if (action.promote !== true || typeof action.prospectId !== 'string' || typeof action.cutId !== 'string') return deny(state, 'EXPLICIT_SELECTION_REQUIRED', 'Choose a prospect and the bench player who will be released.')
  const prospect = pool(s).find((p) => p.id === action.prospectId)
  if (!prospect || !s.pendingPromotion.prospectIds?.includes(prospect.id)) return deny(state, 'PROSPECT_NOT_FOUND', 'Choose a prospect from this academy offer.')
  const roster = s.teams?.[s.teamId] ?? []
  const starters = new Set(Object.values(s.lineup ?? {}))
  if (!roster.some((p) => !starters.has(p.id))) return deny(state, 'NO_BENCH', selectAcademy(s).reason)
  const cut = roster.find((p) => p.id === action.cutId)
  if (!cut) return deny(state, 'CUT_NOT_FOUND', 'Choose a player on your bench to release.')
  if (starters.has(cut.id)) return deny(state, 'STARTER_PROTECTED', 'Starters cannot be released for an academy promotion.')
  if (cut.role !== prospect.role && !roster.some((p) => p.id !== cut.id && p.role === cut.role)) return deny(state, 'LAST_OF_ROLE', `Keep at least one ${cut.role} player on the roster.`)
  if (Object.values(s.teams ?? {}).flat().some((p) => p.id === prospect.id) || (s.faPool ?? []).some((p) => p.id === prospect.id || p.id === cut.id)) return deny(state, 'DUPLICATE_PLAYER', 'Resolve the duplicate player identity before promoting.')
  const { academy: _academy, ...data } = prospect
  const promoted = { ...data, team: s.teamId, morale: 74, contract: 2, joinedSeason: s.career.seasonIndex }
  const form = { ...s.form, [promoted.id]: 50 }
  delete form[cut.id]
  const message = `${promoted.name} joins the main roster. ${cut.name} is released and becomes a free agent. No fee is received.`
  const effect = { type: 'ACADEMY_PROMOTED', message, playerId: promoted.id, playerName: promoted.name, cutId: cut.id, cutName: cut.name, seasonIndex: s.career.seasonIndex }
  return finish({
    ...s, teams: { ...s.teams, [s.teamId]: roster.map((p) => p.id === cut.id ? promoted : p) },
    faPool: [...(s.faPool ?? []), { ...cut, team: 'FA', morale: 60 }], form,
    academyByTeam: { ...s.academyByTeam, [s.teamId]: pool(s).filter((p) => p.id !== promoted.id) },
    ...(s.offseasonReport ? { offseasonReport: { ...s.offseasonReport, academyPromotions: [...(s.offseasonReport.academyPromotions ?? []), effect] } } : {}),
  }, message, effect)
}
