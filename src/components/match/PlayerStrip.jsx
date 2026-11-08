import { RoleIcon } from '../ui/index.js'
import { CHAMP_BY_ID } from '../../data/champions.js'
import { ROLE_ORDER } from './matchModel.js'

/**
 * Five cards for one team: role, player, champion (hidden at phone width),
 * live kills / deaths. Assists are not tracked per event while a game plays,
 * so the strip shows K / D only.
 */
export default function PlayerStrip({ players, picks, teamName, tone }) {
  const ordered = ROLE_ORDER.map((role) => players.find((p) => p.role === role)).filter(Boolean)
  return (
    <ul className={`player-strip strip-${tone}`} aria-label={`${teamName} players, kills and deaths`}>
      {ordered.map((p) => {
        const champ = CHAMP_BY_ID[picks?.[p.role]]?.name
        return (
          <li key={p.name} className={`player-card${p.dead ? ' is-dead' : ''}`}>
            <span className="pc-role">
              <RoleIcon role={p.role} size={14} />
              <span>{p.role}</span>
            </span>
            <b className="pc-name">{p.name}</b>
            {champ && <span className="pc-champ">{champ}</span>}
            <span className="pc-kda num">
              {p.kills} / {p.deaths}
              <span className="sr-only"> kills and deaths</span>
              {p.dead && <span className="pc-state"> · Respawning</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
