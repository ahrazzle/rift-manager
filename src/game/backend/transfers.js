// Transfer backend (sell/release). Pure: no reducer dependency or random draws.
import { signingFee, fmtMoneyExact } from '../economy.js'

const refuse = (code, reason) => ({ ok: false, code, reason })

/** Preview uses exactly the checks applyTransfer uses; no save backfill on read. */
export function previewTransfer(state, action) {
  const sell = action?.type === 'SELL_PLAYER'
  if (!sell && action?.type !== 'RELEASE_PLAYER') return refuse('UNSUPPORTED_ACTION', 'Choose Sell or Release.')
  const mode = state?.mode ?? 'season' // pre-mode saves are Season saves
  if (!['career', 'season'].includes(mode)) return refuse('MODE_UNSUPPORTED', 'Transfers are unavailable in this mode.')
  if (sell && mode !== 'career') return refuse('SALE_CAREER_ONLY', 'Selling players is available only in Career.')
  if (state.matchSession) return refuse('MATCH_SESSION_OPEN', 'Close the current match before changing the roster.')
  if (state.sacked) return refuse('MANAGER_SACKED', 'You cannot change the roster after being sacked.')
  if (mode === 'career' && state.career?.status !== 'active') return refuse('CAREER_INACTIVE', 'An active Career is required to change the roster.')
  const roster = state.teams?.[state.teamId]
  if (!state.teamId || !Array.isArray(roster)) return refuse('NO_MANAGED_TEAM', 'Select a managed team before changing its roster.')
  const player = roster.find((p) => p.id === action.playerId)
  if (!player) return refuse('PLAYER_NOT_FOUND', 'This player is not on your roster.')
  if (!Array.isArray(state.faPool) || !state.lineup || typeof state.lineup !== 'object') return refuse('INVALID_ROSTER_STATE', 'The free-agent pool or lineup is unavailable.')
  if (!['TOP', 'JNG', 'MID', 'BOT', 'SUP'].includes(player.role)) return refuse('INVALID_ROLE', 'This player has no valid roster role.')
  if (state.faPool.some((p) => p.id === player.id)) return refuse('DUPLICATE_PLAYER', 'This player is already in the free-agent pool.')
  if (Object.entries(state.lineup).some(([role, id]) => id === player.id && role !== player.role)) return refuse('INVALID_LINEUP', 'Repair this player’s lineup role before changing the roster.')
  const remaining = roster.filter((p) => p.id !== player.id && p.role === player.role)
  if (!remaining.length) return refuse('LAST_OF_ROLE', `Keep at least one ${player.role} player on your roster.`)
  const starterIds = Object.values(state.lineup)
  const isStarter = starterIds.includes(player.id)
  if (!sell && isStarter) return refuse('STARTER_RELEASE', 'Starters cannot be released. Choose a replacement starter first.')
  const replacement = isStarter ? remaining.find((p) => !starterIds.includes(p.id)) : null
  if (sell && isStarter && !replacement) return refuse('NO_REPLACEMENT', `A same-role ${player.role} bench replacement is required to sell this starter.`)
  if (isStarter && state.lineup[player.role] !== player.id) return refuse('INVALID_LINEUP', 'Repair this player’s lineup role before selling them.')
  if (sell && !Number.isFinite(state.finance?.budget)) return refuse('FINANCE_UNAVAILABLE', 'A valid budget is required to receive a sale fee.')
  const fee = sell ? Math.round(signingFee(player) / 2) : 0
  if (!Number.isSafeInteger(fee) || fee < 0 || (sell && !Number.isSafeInteger(state.finance.budget + fee))) return refuse('INVALID_FINANCE', 'The sale fee or resulting budget cannot be recorded accurately.')
  return {
    ok: true, code: null, reason: null, playerId: player.id, playerName: player.name,
    role: player.role, ovr: player.ovr, fee, isStarter,
    replacementId: replacement?.id ?? null, replacementName: replacement?.name ?? null,
  }
}

/** Atomic, immutable command transition. Refusals preserve exact state identity. */
export function applyTransfer(state, action) {
  const preview = previewTransfer(state, action)
  if (!preview.ok) return { state, ok: false, code: preview.code, reason: preview.reason, effects: [] }
  const sell = action.type === 'SELL_PLAYER'
  const roster = state.teams[state.teamId]
  const player = roster.find((p) => p.id === preview.playerId)
  const message = sell
    ? `${player.name} is listed and leaves for free agency. The club receives ${fmtMoneyExact(preview.fee)}.${preview.replacementId ? ` ${preview.replacementName} becomes the ${player.role} starter.` : ''}`
    : `${player.name} is released and becomes a free agent. No fee is received.`
  const transaction = {
    type: sell ? 'PLAYER_SOLD' : 'PLAYER_RELEASED', message,
    playerId: player.id, playerName: player.name, role: player.role, teamId: state.teamId,
    seasonIndex: state.career?.seasonIndex ?? null, round: state.round ?? null,
    fee: preview.fee, replacementId: preview.replacementId,
  }
  const form = state.form ? { ...state.form } : state.form
  if (form) delete form[player.id]
  const lineup = preview.replacementId ? { ...state.lineup, [player.role]: preview.replacementId } : state.lineup
  const next = {
    ...state,
    teams: { ...state.teams, [state.teamId]: roster.filter((p) => p.id !== player.id) },
    faPool: [...state.faPool, { ...player, team: 'FA', morale: 60 }],
    lineup, ...(form ? { form } : {}),
    ...(sell ? { finance: { ...state.finance, budget: state.finance.budget + preview.fee } } : {}),
    lastEventLog: message,
    transferHistory: [...(state.transferHistory ?? []), transaction],
  }
  return { state: next, ok: true, code: null, reason: null, effects: [transaction] }
}

/** Read completed-season history without consuming it or adding the fee again. */
export function selectTransferReport(state, seasonIndex) {
  const transactions = (state.transferHistory ?? []).filter((entry) => entry.seasonIndex === seasonIndex)
  return { seasonIndex, transactions, saleIncome: transactions.reduce((sum, entry) => sum + entry.fee, 0) }
}
