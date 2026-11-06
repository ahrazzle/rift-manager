// Portable office hooks. The caller owns reducer validation and lifecycle order.
const success = (state, effects = []) => ({ state, ok: true, reason: null, effects })
const refuse = (state, reason) => ({ state, ok: false, reason, effects: [] })
const seasonOf = (state) => state?.mode === 'career' && Number.isInteger(state.career?.seasonIndex) && state.career.seasonIndex > 0 ? state.career.seasonIndex : null
const rosterOf = (state) => state?.teams?.[state.teamId] ?? []
const clampMorale = (value) => Math.max(0, Math.min(100, Math.round(value)))
const moraleOf = (player) => Number.isFinite(player.morale) ? clampMorale(player.morale) : 70
const validJoined = (value, season) => Number.isInteger(value) && value > 0 && value <= season

/** Backfill only the managed career roster; never grant old saves invented tenure. */
export function backfillJoinedSeason(state) {
  const season = seasonOf(state)
  if (season === null || !state.teamId) return success(state)
  let changed = false
  const roster = rosterOf(state).map((p) => {
    if (validJoined(p.joinedSeason, season)) return p
    changed = true
    return { ...p, joinedSeason: season }
  })
  return success(changed ? { ...state, teams: { ...state.teams, [state.teamId]: roster } } : state)
}

function applyChanges(state, changes, joinedIds = []) {
  const effects = []
  const season = seasonOf(state)
  let changed = false
  const roster = rosterOf(state).map((p) => {
    let next = p
    if (season !== null && joinedIds.includes(p.id) && p.joinedSeason !== season) next = { ...next, joinedSeason: season }
    const change = changes.get(p.id)
    if (change) {
      const before = moraleOf(p)
      const after = clampMorale(change.absolute ?? before + change.delta)
      next = { ...next, morale: after }
      effects.push({ type: 'morale', playerId: p.id, reason: change.reason,
        message: `${p.name ?? p.id}: ${change.message} (${after - before >= 0 ? '+' : ''}${after - before} morale).`,
        before, after, delta: after - before, requestedDelta: change.delta })
    }
    changed ||= next !== p
    return next
  })
  if (!changed) return success(state)
  const lines = effects.map((e) => e.message).join(' ')
  return success({ ...state, teams: { ...state.teams, [state.teamId]: roster },
    ...(lines ? { lastEventLog: lines } : {}) }, effects)
}

/** Run once after an accepted legacy SIGN / SET_LINEUP / TRADE_PLAYER. */
export function applyOfficeMorale(before, after, action = {}) {
  if (!['SIGN', 'SET_LINEUP', 'TRADE_PLAYER'].includes(action.type)) return success(after)
  if (before === after) return refuse(before, 'The office action made no change.')
  if (!before?.teamId || before.teamId !== after?.teamId) return refuse(before, 'A managed club is required.')
  const oldRoster = rosterOf(before)
  const roster = rosterOf(after)
  const changes = new Map()
  let joinedIds = []
  if (action.type === 'SIGN') {
    const incoming = roster.find((p) => p.id === action.playerId)
    if (!incoming || oldRoster.some((p) => p.id === incoming.id)) return refuse(before, 'No new signing joined the club.')
    if (after.lineup?.[incoming.role] !== incoming.id) return refuse(before, 'The signing did not take its starting slot.')
    const displaced = before.lineup?.[incoming.role]
    changes.set(incoming.id, { absolute: 74, delta: 4, reason: 'signed', message: 'pleased to join the club' })
    if (displaced && displaced !== incoming.id && roster.some((p) => p.id === displaced)) changes.set(displaced, { delta: -6, reason: 'displaced-by-signing', message: 'unhappy about losing the starting spot to a signing' })
    joinedIds = [incoming.id]
  } else if (action.type === 'SET_LINEUP') {
    const oldId = before.lineup?.[action.role]
    const newId = after.lineup?.[action.role]
    if (oldId === newId) return refuse(before, 'The selected starter is unchanged.')
    if (newId !== action.playerId || !roster.some((p) => p.id === newId && p.role === action.role)) return refuse(before, 'No valid starter change occurred.')
    if (oldId && roster.some((p) => p.id === oldId)) changes.set(oldId, { delta: -4, reason: 'benched', message: 'unhappy about losing the starting spot' })
    changes.set(newId, { delta: 3, reason: 'promoted-to-starter', message: 'encouraged by a starting place' })
  } else if (action.type === 'TRADE_PLAYER') {
    if (before.mode !== 'career' || before.career?.status !== 'active') return refuse(before, 'Trades require an active Career.')
    const outgoing = oldRoster.find((p) => p.id === action.giveId)
    const incoming = roster.find((p) => p.id === action.getId)
    if (!incoming || !outgoing || incoming.role !== outgoing.role || oldRoster.some((p) => p.id === incoming.id) || roster.some((p) => p.id === action.giveId)) return refuse(before, 'No completed player trade occurred.')
    changes.set(incoming.id, { delta: 3, reason: 'traded-in', message: 'encouraged by joining a new club' })
    joinedIds = [incoming.id]
  } else return success(after)
  return applyChanges(after, changes, joinedIds)
}

/** After placement morale; explicitly pass the completed index and OLD lineup. */
export function applyTenureMorale(state, { completedSeasonIndex, lineup } = {}) {
  if (state?.mode !== 'career') return success(state)
  if (!Number.isInteger(completedSeasonIndex) || completedSeasonIndex < 1 || !lineup || typeof lineup !== 'object' || Array.isArray(lineup)) return refuse(state, 'Completed season index and pre-reset lineup are required.')
  const starters = new Set(Object.values(lineup))
  const changes = new Map()
  // Missing tenure is backfilled to the completed season, before eligibility.
  const current = { ...state, career: { ...state.career, seasonIndex: completedSeasonIndex } }
  const filled = backfillJoinedSeason(current).state
  const prepared = filled === current ? state : { ...filled, career: state.career }
  for (const p of rosterOf(prepared)) {
    if (completedSeasonIndex + 1 - p.joinedSeason < 2) continue
    const starter = starters.has(p.id)
    changes.set(p.id, { delta: starter ? 2 : -3, reason: starter ? 'tenured-starter' : 'tenured-bench',
      message: starter ? 'settled after long service in the starting side' : 'restless after long service on the bench' })
  }
  return applyChanges(prepared, changes)
}
