import TeamCrest from '../TeamCrest.jsx'
import { Chip } from '../ui/index.js'
import { shortName } from './matchModel.js'

/**
 * Series header for the non-live stages (setup, between games, result):
 * crests, club tags, the series score (or VS before it starts) and the context.
 * Sides are not shown here: a club changes sides between games.
 */
export default function SeriesHeader({ context: c, homeWins = 0, awayWins = 0, preview = false, caption, badges = [] }) {
  const bestOf = c.needWins * 2 - 1
  const clubs = [
    ['home', c.homeId, c.homeName],
    ['away', c.awayId, c.awayName],
  ]
  return (
    <header className={`series-header${preview ? ' is-preview' : ''}`}>
      <div className="sh-context">
        <span className="label">{c.label}</span>
        <span className="sh-context-meta">
          {bestOf > 1 ? `Best of ${bestOf}` : 'Single game'}
          <span aria-hidden="true"> · </span>
          {c.userSide ? `Coaching ${c.userSide === 'home' ? c.homeName : c.awayName}` : 'Spectating'}
        </span>
      </div>
      <div className="sh-faceoff">
        {clubs.map(([side, id, name], i) => (
          <div key={side} className={`sh-club sh-${side}`}>
            <TeamCrest teamId={id} name={name} size={72} />
            <strong className="sh-tag">{shortName(id, name)}</strong>
            {shortName(id, name) !== name && <span className="sh-name">{name}</span>}
            {i === 0 && <span className="sr-only"> versus </span>}
          </div>
        ))}
        <div className="sh-score" aria-hidden={preview ? 'true' : undefined}>
          {preview ? (
            <strong className="sh-vs">VS</strong>
          ) : (
            <strong className="sh-num num">
              {homeWins}
              <span className="sh-dash">–</span>
              {awayWins}
            </strong>
          )}
          {caption && <span className="sh-caption">{caption}</span>}
        </div>
      </div>
      {badges.length > 0 && (
        <ul className="sh-badges" aria-label="Match options">
          {badges.map((b) => (
            <li key={b}>
              <Chip>{b}</Chip>
            </li>
          ))}
        </ul>
      )}
    </header>
  )
}
