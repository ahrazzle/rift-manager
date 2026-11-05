import { ROLES, ROLE_LABEL } from '../data/lck.js'
import { growthOutlook } from '../data/development.js'
import { styledPlayer } from '../game/logic.js'
import PlayerTags from './PlayerTags.jsx'

const OUTLOOK_CLS = {
  rising: 'outlook-rise',
  steady: 'outlook-steady',
  declining: 'outlook-decline',
  'at ceiling': 'outlook-ceiling',
}

function PlayerRow({ player, isStarter, form, onSelect, showOutlook }) {
  const f = form[player.id] ?? player.form
  const age = player.age ?? 21
  const outlook = showOutlook ? growthOutlook(player) : null
  return (
    <button
      className={isStarter ? 'plrow starter' : 'plrow'}
      onClick={() => onSelect(player)}
    >
      <span className="pl-name">{player.name}</span>
      <span className="pl-ovr" title="Overall">{player.ovr}</span>
      <span className="tale-chip pl-age" title="Player age">Age {age}</span>
      {outlook && (
        <span
          className={`tale-chip outlook-chip ${OUTLOOK_CLS[outlook] || ''}`}
          title="Career growth outlook (Advance Season only — not a promise every week)"
        >
          {outlook}
        </span>
      )}
      <span className="bars">
        <Mini label="M" v={player.mech} />
        <Mini label="A" v={player.macro} />
        <Mini label="C" v={player.consist} />
        <Mini label="F" v={f} />
      </span>
      <PlayerTags player={player} />
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
  const showOutlook = state.mode === 'career' && state.career?.status === 'active'

  function setStarter(role, playerId) {
    dispatch({ type: 'SET_LINEUP', role, playerId })
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>Starting Lineup: {teamName}</h2>
        <p className="hint">
          Click a player to start them in their role. Subs are listed below starters.
          {showOutlook
            ? ' Growth outlook reflects Career off-season development bands — exact potential is on Squad.'
            : state.mode === 'season'
              ? ' Season mode has no annual player growth between splits.'
              : ''}
        </p>
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
                    showOutlook={showOutlook}
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
