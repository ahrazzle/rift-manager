import { Button, Card, Chip } from '../ui/index.js'
import { ROLE_LABEL } from '../../data/lck.js'
import { fmtMoney } from '../../game/economy.js'

/** Career off-season report: development, contracts, churn, money. Dismissible. */
export default function OffseasonReport({ report, dispatch }) {
  if (!report) return null
  const { seasonIndexCompleted, roster, lineupChanges, released, aiChurn, newFreeAgents, finance } = report
  return (
    <Card
      id="offseason-report"
      tabIndex={-1}
      className="hub-offseason"
      eyebrow={`Off-season report · split ${seasonIndexCompleted} complete`}
      title="What changed over the break"
      action={
        <Button variant="quiet" onClick={() => dispatch({ type: 'DISMISS_OFFSEASON_REPORT' })}>
          Dismiss
        </Button>
      }
    >
      <p className="muted hub-os-lede">Career-only annual growth from Advance Season. Potential is a fixed cap, not chemistry or mentoring.</p>
      <h3>Roster development</h3>
      <ul className="hub-os-roster">
        {roster.map((p) => {
          const delta = p.ovrAfter - p.ovrBefore
          const deltaStr = delta === 0 ? '±0' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)}`
          return (
            <li key={p.id}>
              <b>{p.name}</b>
              <span className="muted">{ROLE_LABEL[p.role] ?? p.role}</span>
              <span className="muted">Age {p.ageBefore}→{p.ageAfter}</span>
              <span className={`num ${delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : ''}`}>
                {deltaStr} OVR ({p.ovrBefore}→{p.ovrAfter})
              </span>
              {p.atCeiling && <Chip>At ceiling (Pot {p.potential})</Chip>}
              {p.oswSpike != null && <Chip tone="warn">One-season spike +{p.oswSpike}</Chip>}
            </li>
          )
        })}
      </ul>
      {lineupChanges.length > 0 && (
        <>
          <h3>Starter changes</h3>
          <ul className="hub-os-list">
            {lineupChanges.map((c) => (
              <li key={c.role}>
                {ROLE_LABEL[c.role] ?? c.role}: {c.outName} → {c.inName}
              </li>
            ))}
          </ul>
        </>
      )}
      {released.length > 0 && (
        <>
          <h3>Released (contracts)</h3>
          <ul className="hub-os-list">
            {released.map((p) => (
              <li key={p.id}>
                {p.name} ({ROLE_LABEL[p.role] ?? p.role}, OVR {p.ovr})
              </li>
            ))}
          </ul>
        </>
      )}
      <h3>League churn</h3>
      {aiChurn.length === 0 ? (
        <p className="muted">No AI churn this off-season.</p>
      ) : (
        <ul className="hub-os-list">
          {aiChurn.map((c, i) => (
            <li key={i}>
              {c.teamId}: cut {c.cutName}, signed {c.signedName} ({ROLE_LABEL[c.role] ?? c.role})
            </li>
          ))}
        </ul>
      )}
      {newFreeAgents?.length > 0 && (
        <>
          <h3>New free agents</h3>
          <ul className="hub-os-list">
            {newFreeAgents.map((p) => (
              <li key={p.id}>
                {p.name} ({ROLE_LABEL[p.role] ?? p.role}, OVR {p.ovr}, age {p.age})
              </li>
            ))}
          </ul>
        </>
      )}
      {finance && (
        <>
          <h3>Money</h3>
          <ul className="hub-os-list">
            <li>
              Sponsorship {fmtMoney(finance.sponsorship)} + prize {fmtMoney(finance.prize)} = {fmtMoney(finance.income)} in
            </li>
            <li>
              Wages −{fmtMoney(finance.wages)} · renewals −{fmtMoney(finance.renewals)}
            </li>
            <li>
              Budget {fmtMoney(finance.budgetBefore)} → {fmtMoney(finance.budgetAfter)}
            </li>
          </ul>
        </>
      )}
    </Card>
  )
}
