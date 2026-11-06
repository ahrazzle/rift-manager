// Concrete assembly of the three independent backend leaves. Importing this
// module does not activate it in the game; the caller supplies the public reducer.
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
