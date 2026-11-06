// ============================================================================
// CareerModals — dilemma + academy-promotion dialogs.
//
// Rendered globally from App (not only inside Squad) so a pending modal is
// never missed: ADVANCE_SEASON no-ops while one is pending, and the Dashboard
// is where that button lives. Both sit on the shared Dialog. They are
// decisions, so neither can be dismissed with Esc or the scrim.
// ============================================================================
import { DILEMMA_EVENTS } from '../data/events.js'
import { Button, Card, Chip, Dialog } from './ui/index.js'

function teamName(state, teamId) {
  return state.teamMeta?.[teamId]?.name ?? teamId
}

export function EventModal({ state, dispatch }) {
  const ev = DILEMMA_EVENTS.find((e) => e.id === state.pendingEvent.eventId)
  const p = (state.teams[state.teamId] || []).find((x) => x.id === state.pendingEvent.playerId)
  if (!ev) return null
  return (
    <Dialog title={ev.title} description={ev.description} size="md" dismissible={false}>
      {p && <p className="dlg-involved">Involved: <strong>{p.name}</strong> (OVR {p.ovr}, {p.role})</p>}
      <ul className="dlg-choices">
        {ev.options.map((o, i) => (
          <li key={i}>
            <Card variant="inset" className="dlg-choice">
              <div className="dlg-choice-top">
                <strong>{o.label}</strong>
                <Chip>Odds: {o.oddsText}</Chip>
              </div>
              <p>{o.detail}</p>
              <Button variant={i === 0 ? 'primary' : 'secondary'} onClick={() => dispatch({ type: 'RESOLVE_EVENT', optionIndex: i })}>
                Choose →
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </Dialog>
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
    <Dialog
      title="Academy standout"
      size="md"
      dismissible={false}
      description={`${pl.name} (${pl.role}, ${pl.ovr} OVR, age ${pl.age}, Pot ${pl.potential ?? Math.min(99, pl.ovr + 8)}) has caught the eye. Promote them to the ${teamName(state, state.teamId)} main roster, or keep them developing in the academy.`}
    >
      <p className="dlg-involved">
        {cutName ? `Promote → ${pl.name} in, ${cutName} out to free agency.` : 'Promote → adds to your roster.'}
      </p>
      <ul className="dlg-choices">
        <li>
          <Card variant="inset" className="dlg-choice">
            <strong>Promote: call them up</strong>
            <p>{cutName ? `${pl.name} joins; weakest bench player (${cutName}) is released to free agency.` : 'Adds the prospect to your roster.'}</p>
            <Button variant="primary" onClick={() => dispatch({ type: 'RESOLVE_PROMOTION', promote: true })}>
              Promote →
            </Button>
          </Card>
        </li>
        <li>
          <Card variant="inset" className="dlg-choice">
            <strong>Keep academy intact</strong>
            <p>Leave the prospect in the academy for another split.</p>
            <Button onClick={() => dispatch({ type: 'RESOLVE_PROMOTION', promote: false })}>
              Keep →
            </Button>
          </Card>
        </li>
      </ul>
    </Dialog>
  )
}
