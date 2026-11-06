import { useState } from 'react'
import { PREPARATION_FOCI, canPrepare, preparationBonus, scoutOpponent } from '../game/preparation.js'

export default function Preparation({ state, dispatch, suggestedFocus }) {
  const report = scoutOpponent(state)
  const [selected, setSelected] = useState(() => PREPARATION_FOCI.some((f) => f.id === suggestedFocus) ? suggestedFocus : report?.recommended ?? 'scrims')
  if (!report) return null
  const prepared = state.trainedRound === state.round
  const plan = state.preparation?.round === state.round ? state.preparation : null
  const chosen = PREPARATION_FOCI.find((f) => f.id === (prepared ? plan?.focus : selected))
  const bonus = preparationBonus(state)
  return (
    <section className="card preparation" id="weekly-preparation" data-tour="tour-prep" aria-labelledby="prep-title">
      <div className="prep-heading">
        <div>
          <span className="eyebrow">Coach’s office · Week {state.round}</span>
          <h2 id="prep-title">Win the week before match day.</h2>
        </div>
        <span className={`prep-status ${prepared ? 'complete' : ''}`}>{prepared ? 'Preparation complete' : 'One session available'}</span>
      </div>
      <div className="scout-strip">
        <div><span className="stat-label">Player to watch</span><strong>{report.threat.name}</strong><span>{report.threat.role} · {report.threat.ovr} OVR</span></div>
        <div><span className="stat-label">Your starter form</span><strong>{Math.round(report.averageForm)}<small> / 100</small></strong><span>{report.averageForm < 45 ? 'Needs a reset' : report.averageForm >= 65 ? 'In rhythm' : 'Ready to work'}</span></div>
        <p>{prepared ? 'Your work is banked for this week. The matchup bonus follows the players who took part.' : report.reason}</p>
      </div>
      {!prepared ? (
        <>
          <div className="prep-options" role="group" aria-label="Weekly preparation focus">
            {PREPARATION_FOCI.map((focus) => (
              <button type="button" key={focus.id} aria-pressed={selected === focus.id} className={`prep-option ${selected === focus.id ? 'active' : ''}`} onClick={() => setSelected(focus.id)}>
                <span className="prep-icon" aria-hidden="true">{focus.icon}</span>
                <strong>{focus.label}</strong>
                <span>{focus.description}</span>
                <small>{focus.effect}</small>
                {focus.id === report.recommended && <span className="prep-recommended">Coach recommendation</span>}
              </button>
            ))}
          </div>
          <div className="prep-footer">
            <p className="hint">Form carries forward. Match preparation expires after this week’s series. Training is optional and can only be completed once per week.</p>
            <button type="button" className="primary" disabled={!canPrepare(state)} onClick={() => dispatch({ type: 'PREPARE_WEEK', focus: selected })}>Run {chosen?.label.toLowerCase()} →</button>
          </div>
        </>
      ) : (
        <div className="prep-complete" role="status">
          <div><strong>{chosen?.label ?? 'Starter training'} completed</strong><p>{bonus > 0 ? `+${bonus.toFixed(1)} match preparation against ${report.opponentId}, plus the form changes below.` : 'Your starters’ form gains are ready for match day.'}</p></div>
          {plan?.changes && <div className="prep-gains">{plan.changes.map((c) => <span key={c.playerId}><b>{c.role}</b> {c.before} → {c.after}</span>)}</div>}
        </div>
      )}
    </section>
  )
}
