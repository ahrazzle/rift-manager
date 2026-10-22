import { ROLES, ROLE_LABEL } from '../data/lck.js'
import { styledPlayer } from '../game/logic.js'

function PlayerRow({ player, isStarter, form, onSelect, onHover }) {
  const f = form[player.id] ?? player.form
  return (
    <button
      className={isStarter ? 'plrow starter' : 'plrow'}
      onClick={() => onSelect(player)}
    >
      <span className="pl-name">{player.name}</span>
      <span className="pl-ovr" title="Overall">{player.ovr}</span>
      <span className="bars">
        <Mini label="M" v={player.mech} />
        <Mini label="A" v={player.macro} />
        <Mini label="C" v={player.consist} />
        <Mini label="F" v={f} />
      </span>
      {isStarter && <span className="badge">START</span>}
    </button>
  )
}

function Mini({ label, v }) {
  return (
    <span className="mini" title={`${label}: ${v}`}>
      <span className="mini-l">{label}</span>
      <span className="mini-bar">
        <span style={{ width: `${v}%`, background: v >= 80 ? '#22c55e' : v >= 65 ? '#eab308' : '#ef4444' }} />
      </span>
    </span>
  )
}

export default function Lineup({ state, dispatch }) {
  const players = state.teams[state.teamId]
  const form = state.form
  const teamName = state.teamMeta?.[state.teamId]?.name ?? state.teamId

  function setStarter(role, playerId) {
    dispatch({ type: 'SET_LINEUP', role, playerId })
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>Starting Lineup — {teamName}</h2>
        <p className="hint">Click a player to start them in their role. Subs are listed below starters.</p>
        {ROLES.map((role) => {
          const inRole = players.filter((p) => p.role === role)
          const starterId = state.lineup[role]
          return (
            <div className="role-block" key={role}>
              <div className="role-head">
                <span className="role-label">{ROLE_LABEL[role]}</span>
              </div>
              <div className="plrows">
                {inRole.map((p) => (
                  <PlayerRow
                    key={p.id}
                    player={p}
                    form={form}
                    isStarter={p.id === starterId}
                    onSelect={() => setStarter(role, p.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
