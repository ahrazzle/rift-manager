// Concrete assembly of the three independent backend leaves. useGameState.js
// composes it with the public reducer for production dispatch.
import { createBackendAdapter } from './adapter.js'
import { migrateAcademy, resolveAcademy, afterAcademyAdvance, offerAcademy, selectAcademy } from './academy.js'

export function createRosterBackend(legacyReducer) {
  const adapter = createBackendAdapter(legacyReducer, {
    migrate: state => ({ state: migrateAcademy(state), ok: true, reason: null, effects: [] }),
    resolve: resolveAcademy,
    afterAdvance: (state, { before }) => afterAcademyAdvance(before, state),
    offer: offerAcademy,
  })
  return { ...adapter, selectAcademy }
}
