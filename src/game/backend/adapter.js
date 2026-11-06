// Optional draft adapter. The production reducer does not import this module.
import { applyTransfer, previewTransfer, selectTransferReport } from './transfers.js'
import { applyOfficeMorale, applyTenureMorale, backfillJoinedSeason } from './morale.js'

const transferTypes = new Set(['SELL_PLAYER', 'RELEASE_PLAYER'])
const officeTypes = new Set(['SIGN', 'SET_LINEUP', 'TRADE_PLAYER'])
const result = (state, effects = []) => ({ state, ok: true, reason: null, effects })
const refused = (state, reason) => ({ state, ok: false, reason, effects: [] })

/**
 * Inject the existing public reducer (never baseReducer), plus academy lifecycle
 * ports. This module has no React dependency. The reducer retains simulation,
 * random rolls, contract/placement order, and match-session authorization.
 */
export function createBackendAdapter(legacyReducer, academy) {
  if (typeof legacyReducer !== 'function') throw new TypeError('A legacy reducer is required')
  if (!academy || typeof academy.migrate !== 'function' || typeof academy.resolve !== 'function'
    || typeof academy.afterAdvance !== 'function') {
    throw new TypeError('Academy migrate, resolve and afterAdvance ports are required')
  }

  function migrate(state) {
    const tenure = backfillJoinedSeason(state)
    return academy.migrate(tenure.state)
  }

  function transition(state, action) {
    if (state?.matchSession && (transferTypes.has(action.type) || action.type === 'RESOLVE_PROMOTION')) {
      return refused(state, 'Close the current match before changing the roster.')
    }
    if (transferTypes.has(action.type)) return applyTransfer(state, action)
    if (action.type === 'RESOLVE_PROMOTION') return academy.resolve(state, action)

    // A refused legacy command must retain the caller's exact state reference.
    // Only ADVANCE needs migration before execution to avoid retroactive tenure.
    const prepared = action.type === 'ADVANCE_SEASON' ? migrate(state).state : state
    const legacy = legacyReducer(prepared, action)
    if (legacy === prepared) return result(state)
    if (officeTypes.has(action.type)) return applyOfficeMorale(state, legacy, action)
    if (action.type === 'START_CAREER') return migrate(legacy)
    if (action.type === 'RESOLVE_EVENT' && !legacy.pendingEvent && academy.offer) return academy.offer(legacy)
    if (action.type !== 'ADVANCE_SEASON') return result(legacy)

    const completedSeasonIndex = prepared.career?.seasonIndex
    const advanced = legacy.career?.seasonIndex === completedSeasonIndex + 1
    if (!advanced || legacy.sacked || legacy.career?.status !== 'active') return result(legacy)
    // Legacy has applied renewal then placement; no later managed morale tick.
    // Classify tenure using the OLD lineup, before defaultLineup's season reset.
    const tenure = applyTenureMorale(legacy, { completedSeasonIndex, lineup: prepared.lineup })
    // This port consumes legacy.pendingPromotion; it MUST NOT roll 30% again.
    const offer = academy.afterAdvance(tenure.state, { before: prepared, rollAlreadyConsumed: true })
    const transfers = selectTransferReport(prepared, completedSeasonIndex)
    const next = offer.state.offseasonReport
      ? { ...offer.state, offseasonReport: { ...offer.state.offseasonReport,
          transfers, morale: tenure.effects } }
      : offer.state
    return result(next, [...tenure.effects, ...offer.effects])
  }

  return {
    transition,
    reducer: (state, action) => transition(state, action).state,
    migrate,
    previewTransfer,
  }
}
