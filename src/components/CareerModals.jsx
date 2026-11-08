// ============================================================================
// CareerModals — dilemma + academy-promotion dialogs.
//
// Rendered globally from App (not only inside Squad) so a pending modal is
// never missed: ADVANCE_SEASON no-ops while one is pending, and the Dashboard
// is where that button lives. Both sit on the shared Dialog. They are
// decisions, so neither can be dismissed with Esc or the scrim.
// ============================================================================
import { useState } from 'react'
import { DILEMMA_EVENTS } from '../data/events.js'
import { selectAcademy } from '../game/backend/academy.js'
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

const prospectLine = (p) =>
  `${p.name} — ${p.role}, ${p.ovr} OVR, age ${p.age ?? 21}, Pot ${p.potential ?? Math.min(99, p.ovr + 8)}`

export function PromotionModal({ state, dispatch }) {
  const pp = state.pendingPromotion
  const { prospects: allProspects, bench, reason } = selectAcademy(state)
  const offered = pp?.prospectIds?.length
    ? allProspects.filter((p) => pp.prospectIds.includes(p.id))
    : allProspects
  const prospects = offered.length ? offered : allProspects
  const [prospectId, setProspectId] = useState(null)
  const [cutId, setCutId] = useState(null)
  if (!pp) return null

  const decline = () => dispatch({ type: 'RESOLVE_PROMOTION', promote: false })
  const keepAction = (
    <Button onClick={decline}>Keep in academy</Button>
  )

  if (!prospects.length) {
    return (
      <Dialog title="Academy standout" size="md" dismissible={false} actions={keepAction}>
        <p className="dlg-involved">No academy prospects are available for this offer.</p>
      </Dialog>
    )
  }

  const selectedProspect = prospects.find((p) => p.id === prospectId) ?? prospects[0]
  const description = prospects.length === 1
    ? `${selectedProspect.name} (${selectedProspect.role}, ${selectedProspect.ovr} OVR, age ${selectedProspect.age ?? 21}, Pot ${selectedProspect.potential ?? Math.min(99, selectedProspect.ovr + 8)}) has caught the eye. Promote them to the ${teamName(state, state.teamId)} main roster, or keep them developing in the academy.`
    : `${prospects.length} academy prospects are ready for a look. Choose one to promote to the ${teamName(state, state.teamId)} main roster and the bench player who makes room — or keep them all developing in the academy.`

  if (!bench.length) {
    return (
      <Dialog title="Academy standout" size="md" dismissible={false} description={description} actions={keepAction}>
        <ul className="dlg-choices">
          {prospects.map((p) => (
            <li key={p.id}>
              <Card variant="inset" className="dlg-choice">
                <p>{prospectLine(p)}</p>
              </Card>
            </li>
          ))}
        </ul>
        <p className="dlg-involved">{reason}</p>
      </Dialog>
    )
  }

  const roster = state.teams?.[state.teamId] ?? []
  const cutLegal = (cut) =>
    cut.role === selectedProspect.role || roster.some((p) => p.id !== cut.id && p.role === cut.role)
  const selectedCut = bench.find((p) => p.id === cutId) ?? null
  const canPromote = Boolean(selectedCut && cutLegal(selectedCut))

  return (
    <Dialog
      title="Academy standout"
      size="md"
      dismissible={false}
      description={description}
      actions={
        <>
          {keepAction}
          <Button
            variant="primary"
            disabled={!canPromote}
            onClick={() => dispatch({ type: 'RESOLVE_PROMOTION', promote: true, prospectId: selectedProspect.id, cutId: selectedCut.id })}
          >
            Promote →
          </Button>
        </>
      }
    >
      <p className="dlg-step">1 · Prospect to promote</p>
      <ul className="academy-options" aria-label="Academy prospects">
        {prospects.map((p) => (
          <li key={p.id}>
            <Button
              variant={p.id === selectedProspect.id ? 'primary' : 'secondary'}
              icon={p.id === selectedProspect.id ? 'check' : undefined}
              aria-pressed={p.id === selectedProspect.id}
              aria-label={`Promote ${p.name}`}
              onClick={() => setProspectId(p.id)}
            >
              {prospectLine(p)}
            </Button>
          </li>
        ))}
      </ul>
      <p className="dlg-step">2 · Bench player to release</p>
      <ul className="academy-options" aria-label="Bench players">
        {bench.map((p) => {
          const legal = cutLegal(p)
          return (
            <li key={p.id}>
              <Button
                variant={p.id === cutId ? 'primary' : 'secondary'}
                icon={p.id === cutId ? 'check' : undefined}
                aria-pressed={p.id === cutId}
                aria-label={`Release ${p.name}`}
                disabled={!legal}
                onClick={() => setCutId(p.id)}
              >
                {`${p.name} — ${p.role}, ${p.ovr} OVR${legal ? '' : ` (last ${p.role} on the roster)`}`}
              </Button>
            </li>
          )
        })}
      </ul>
      <p className="dlg-involved">
        {selectedCut
          ? `${selectedProspect.name} joins the main roster; ${selectedCut.name} is released to free agency. No fee is received.`
          : 'Choose the bench player who makes room. Keeping them in the academy leaves every prospect available next off-season.'}
      </p>
    </Dialog>
  )
}
