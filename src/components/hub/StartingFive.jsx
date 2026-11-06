import { Button, Card, RoleIcon } from '../ui/index.js'
import { ROLES } from './hubData.js'

/**
 * The five starters: role, name, OVR and current form. Form reads against the
 * neutral 50 (the arrow is "above / below neutral", not a change over time).
 */
export default function StartingFive({ state, setTab }) {
  const roster = state.teams?.[state.teamId] ?? []
  const byId = Object.fromEntries(roster.map((p) => [p.id, p]))
  return (
    <Card
      title="Starting five"
      className="hub-five"
      action={
        <Button variant="quiet" onClick={() => setTab('lineup')}>
          Manage lineup
        </Button>
      }
    >
      <ul className="hub-roster">
        {ROLES.map((role) => {
          const p = byId[state.lineup?.[role]]
          if (!p) {
            return (
              <li key={role} className="is-empty">
                <span className="hub-roster-role">
                  <RoleIcon role={role} size={14} />
                  {role}
                </span>
                <b>Open</b>
                <span className="hub-roster-form">No starter</span>
              </li>
            )
          }
          const form = Math.round(state.form?.[p.id] ?? p.form ?? 50)
          const dir = form > 50 ? 'up' : form < 50 ? 'down' : 'flat'
          return (
            <li key={role}>
              <span className="hub-roster-role">
                <RoleIcon role={role} size={14} />
                {role}
              </span>
              <b title={p.name}>{p.name}</b>
              <span className="hub-roster-ovr num">
                {p.ovr}
                <span className="sr-only"> overall</span>
              </span>
              <span className={`hub-roster-form is-${dir}`}>
                <span aria-hidden="true">{dir === 'up' ? '▲ ' : dir === 'down' ? '▼ ' : ''}</span>
                Form {form}
                <span className="sr-only">{dir === 'flat' ? ', neutral' : dir === 'up' ? ', above neutral' : ', below neutral'}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
