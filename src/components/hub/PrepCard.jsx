import { useId, useState } from 'react'
import { Button, Chip } from '../ui/index.js'
import { PREPARATION_FOCI, canPrepare, preparationBonus, scoutOpponent } from '../../game/preparation.js'
import { teamName } from '../../game/hype.js'

/**
 * Coach's office: the optional weekly session (was Preparation.jsx).
 * Four programmes with their exact effects, the coach's recommendation, and
 * one run per week. Keeps the walkthrough anchors (#weekly-preparation,
 * data-tour="tour-prep") and the review room's "Plan next week" focus.
 */
export default function PrepCard({ state, dispatch, suggestedFocus }) {
  const titleId = useId()
  const report = scoutOpponent(state)
  const [selected, setSelected] = useState(() =>
    PREPARATION_FOCI.some((f) => f.id === suggestedFocus) ? suggestedFocus : report?.recommended ?? 'scrims',
  )
  if (!report) return null
  const prepared = state.trainedRound === state.round
  const plan = state.preparation?.round === state.round ? state.preparation : null
  const chosen = PREPARATION_FOCI.find((f) => f.id === (prepared ? plan?.focus : selected))
  const bonus = preparationBonus(state)
  const form = Math.round(report.averageForm)
  return (
    <section
      className="ui-card hub-prep"
      id="weekly-preparation"
      data-tour="tour-prep"
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <div className="ui-card-h">
        <div className="ui-card-h-text">
          <p className="label">Coach’s office · Week {state.round}</p>
          <h2 id={titleId}>Weekly session</h2>
        </div>
        <div className="ui-card-h-action">
          {prepared ? <Chip tone="win" icon="check">Done this week</Chip> : <Chip>Optional · one per week</Chip>}
        </div>
      </div>

      <dl className="hub-prep-scout">
        <div>
          <dt>Player to watch</dt>
          <dd>
            <b>{report.threat.name}</b> <span className="muted">{teamName(state, report.opponentId)} · {report.threat.role} · {report.threat.ovr} OVR</span>
          </dd>
        </div>
        <div>
          <dt>Your starters’ form</dt>
          <dd>
            <b className="num">{form}</b> <span className="muted">/ 100 · {form < 45 ? 'needs a reset' : form >= 65 ? 'in rhythm' : 'ready to work'}</span>
          </dd>
        </div>
      </dl>

      {!prepared ? (
        <>
          <p className="hub-prep-reason">{report.reason}</p>
          <div className="hub-prep-options" role="group" aria-label="Weekly preparation focus">
            {PREPARATION_FOCI.map((focus) => (
              <button
                type="button"
                key={focus.id}
                aria-pressed={selected === focus.id}
                className="hub-prep-option"
                onClick={() => setSelected(focus.id)}
              >
                <span className="hub-prep-name">
                  <b>{focus.label}</b>
                  {focus.id === report.recommended && <span className="hub-prep-rec">Coach’s pick</span>}
                </span>
                <span className="hub-prep-desc">{focus.description}</span>
                <span className="hub-prep-fx">{focus.effect}</span>
              </button>
            ))}
          </div>
          <div className="hub-prep-foot">
            <p>Form carries forward. The matchup bonus expires after this week’s series.</p>
            <Button disabled={!canPrepare(state)} onClick={() => dispatch({ type: 'PREPARE_WEEK', focus: selected })}>
              Run {chosen?.label.toLowerCase()} →
            </Button>
          </div>
        </>
      ) : (
        <div className="hub-prep-done" role="status">
          <p>
            <b>{chosen?.label ?? 'Starter training'} completed.</b>{' '}
            {bonus > 0
              ? `+${bonus.toFixed(1)} match preparation against ${report.opponentId}, plus these form changes.`
              : 'Your starters’ form gains are ready for match day.'}
          </p>
          {plan?.changes && (
            <ul className="hub-prep-gains">
              {plan.changes.map((c) => (
                <li key={c.playerId}>
                  <span className="faint">{c.role}</span> <b>{c.name ?? ''}</b>{' '}
                  <span className="num">
                    {c.before} → {c.after}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
