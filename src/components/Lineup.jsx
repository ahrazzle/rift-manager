import { ROLES, ROLE_LABEL } from '../data/lck.js'
import { growthOutlook } from '../data/development.js'
import PlayerTags from './PlayerTags.jsx'
import TeamCrest from './TeamCrest.jsx'
import { Card, Chip, RoleIcon, cx } from './ui/index.js'

const OUTLOOK_TONE = {
  rising: 'rise',
  steady: 'steady',
  declining: 'decline',
  'at ceiling': 'ceiling',
}

function Stat({ label, name, v }) {
  return (
    <span className="lu-stat" title={`${name}: ${v}`}>
      <span className="lu-stat-l">
        <abbr title={name}>{label}</abbr>
        <b className="num">{v}</b>
      </span>
      <span className="lu-stat-bar" aria-hidden="true">
        <i style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
      </span>
    </span>
  )
}

function PlayerRow({ player, isStarter, form, onSelect, showOutlook }) {
  const f = form[player.id] ?? player.form
  const age = player.age ?? 21
  const outlook = showOutlook ? growthOutlook(player) : null
  return (
    <button
      type="button"
      className={cx('lu-row', isStarter && 'is-starter')}
      aria-pressed={isStarter}
      onClick={() => onSelect(player)}
    >
      <span className="lu-top">
        <span className="lu-name">{player.name}</span>
        {isStarter && <Chip icon="check">Starter</Chip>}
        <span className="lu-ovr num" title="Overall">
          <span className="sr-only">OVR </span>
          {player.ovr}
        </span>
      </span>
      <span className="lu-chips">
        <Chip title="Player age">Age {age}</Chip>
        {outlook && (
          <Chip
            className={`outlook-chip outlook-${OUTLOOK_TONE[outlook] || 'steady'}`}
            title="Career growth outlook (Advance Season only — not a promise every week)"
          >
            {outlook}
          </Chip>
        )}
        <PlayerTags player={player} />
      </span>
      <span className="lu-stats">
        <Stat label="MEC" name="Mechanics" v={player.mech} />
        <Stat label="MAC" name="Macro" v={player.macro} />
        <Stat label="CON" name="Consistency" v={player.consist} />
        <Stat label="FRM" name="Form" v={f} />
      </span>
    </button>
  )
}

export default function Lineup({ state, dispatch }) {
  const players = state.teams[state.teamId]
  const form = state.form
  const teamName = state.teamMeta?.[state.teamId]?.name ?? state.teamId
  const showOutlook = state.mode === 'career' && state.career?.status === 'active'

  function setStarter(role, playerId) {
    dispatch({ type: 'SET_LINEUP', role, playerId })
  }

  return (
    <div className="team-stack">
      {state.lastEventLog && <p className="opt-hint">{state.lastEventLog}</p>}
      <Card
        className="lu-card"
        title={
          <span className="lu-title">
            <TeamCrest teamId={state.teamId} name={teamName} size={32} />
            Starting lineup · {teamName}
          </span>
        }
      >
        <p className="lu-hint">
          Choose a player to start them in their role. Subs are listed beside starters.
          {showOutlook
            ? ' Growth outlook reflects Career off-season development bands — exact potential is on Squad.'
            : state.mode === 'season'
              ? ' Season mode has no annual player growth between splits.'
              : ''}
        </p>
        <div className="lu-roles">
          {ROLES.map((role) => {
            const inRole = players.filter((p) => p.role === role)
            const starterId = state.lineup[role]
            const starter = inRole.find((p) => p.id === starterId)
            return (
              <section className="lu-role" key={role} aria-label={ROLE_LABEL[role]}>
                <h3 className="lu-role-h">
                  <RoleIcon role={role} size={22} />
                  <span>{ROLE_LABEL[role]}</span>
                  {starter && <span className="lu-role-now">{starter.name} starts</span>}
                </h3>
                <div className="lu-rows">
                  {inRole.map((p) => (
                    <PlayerRow
                      key={p.id}
                      player={p}
                      form={form}
                      isStarter={p.id === starterId}
                      onSelect={() => setStarter(role, p.id)}
                      showOutlook={showOutlook}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
