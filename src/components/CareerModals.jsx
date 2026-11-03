// ============================================================================
// CareerModals — dilemma + academy-promotion dialogs.
//
// Rendered globally from App (not only inside Squad) so a pending modal is
// never missed: ADVANCE_SEASON no-ops while one is pending, and the Dashboard
// is where that button lives.
// ============================================================================
import { DILEMMA_EVENTS } from '../data/events.js'

function teamName(state, teamId) {
  return state.teamMeta?.[teamId]?.name ?? teamId
}

export function EventModal({ state, dispatch }) {
  const ev = DILEMMA_EVENTS.find((e) => e.id === state.pendingEvent.eventId)
  const p = (state.teams[state.teamId] || []).find((x) => x.id === state.pendingEvent.playerId)
  if (!ev) return null
  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-label={ev.title}>
        <div className="modal-head"><h2>⚠️ {ev.title}</h2></div>
        <div className="guide-body" style={{ padding: '18px 22px 26px', overflowY: 'auto' }}>
          <p>{ev.description}</p>
          {p && <p className="hint">Involved: {p.name} (OVR {p.ovr}, {p.role})</p>}
          {ev.options.map((o, i) => (
            <div key={i} className="fa-card" style={{ marginBottom: 10 }}>
              <div className="fa-top"><span className="fa-name">{o.label}</span></div>
              <p className="hint">Odds: {o.oddsText}</p>
              <p>{o.detail}</p>
              <button className="primary" onClick={() => dispatch({ type: 'RESOLVE_EVENT', optionIndex: i })}>
                Choose →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function weakestBenchName(state) {
  const roster = state.teams[state.teamId] || []
  const starters = new Set(Object.values(state.lineup || {}))
  const bench = roster.filter((p) => !starters.has(p.id))
  if (!bench.length) return null
  const cut = bench.reduce((a, b) => (b.ovr < a.ovr ? b : a))
  return `${cut.name} (OVR ${cut.ovr})`
}

export function PromotionModal({ state, dispatch }) {
  const pp = state.pendingPromotion
  if (!pp || !pp.player) return null
  const pl = pp.player
  const cutName = weakestBenchName(state)
  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-label="Academy promotion">
        <div className="modal-head"><h2>🎓 Academy standout</h2></div>
        <div className="guide-body" style={{ padding: '18px 22px 26px', overflowY: 'auto' }}>
          <p>
            <strong>{pl.name}</strong> ({pl.role}, {pl.ovr} OVR, age {pl.age}) has caught the eye.
            Promote them to the {teamName(state, state.teamId)} main roster, or keep them
            developing in the academy.
          </p>
          <p className="hint">
            {cutName ? `Promote → ${pl.name} in, ${cutName} out to free agency.` : 'Promote → adds to your roster.'}
          </p>
          <div className="fa-card" style={{ marginBottom: 10 }}>
            <div className="fa-top"><span className="fa-name">Promote: call them up</span></div>
            <p>{cutName ? `${pl.name} joins; weakest bench player (${cutName}) is released to free agency.` : 'Adds the prospect to your roster.'}</p>
            <button className="primary" onClick={() => dispatch({ type: 'RESOLVE_PROMOTION', promote: true })}>
              Promote →
            </button>
          </div>
          <div className="fa-card">
            <div className="fa-top"><span className="fa-name">Keep academy intact</span></div>
            <p>Leave the prospect in the academy for another split.</p>
            <button className="ghost" onClick={() => dispatch({ type: 'RESOLVE_PROMOTION', promote: false })}>
              Keep →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
