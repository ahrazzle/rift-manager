import TeamCrest from '../TeamCrest.jsx'
import { clockLabel, goldLabel, goldLead } from './matchModel.js'

/**
 * Broadcast scorebug. Blue side is always on the left (physical side), so a
 * club changes ends between games exactly as on a real broadcast.
 *
 * sides: { blue, red } each { id, name, short, kills, towers, seriesWins }
 * Sticky and compact under 900px (CSS).
 */
export default function Scorebug({ sides, time, gameNumber, series, goldDiffA = 0, game, leader, className = '' }) {
  const lead = goldLead(game, goldDiffA)
  const even = Math.abs(goldDiffA) < 100
  const towers = `${sides.blue.towers}–${sides.red.towers}`
  return (
    <section className={`scorebug ${className}`} aria-label="Scoreboard">
      {[
        ['blue', 'A'],
        ['red', 'B'],
      ].map(([tone, physical]) => {
        const s = sides[tone]
        return (
          <div key={tone} className={`rift-score side-${physical} sb-side sb-${tone}`}>
            <TeamCrest teamId={s.id} name={s.name} size={48} className="sb-crest" />
            <div className="sb-id">
              <strong className="sb-name" title={s.name}>
                {s.short ?? s.name}
              </strong>
              <span className="sb-sub">
                {tone === 'blue' ? 'Blue' : 'Red'}
                <span aria-hidden="true"> · </span>
                <span className="sr-only">, </span>
                Series {s.seriesWins}
              </span>
            </div>
            <span className="sb-kills num">
              {s.kills}
              <span className="sr-only"> kills</span>
            </span>
          </div>
        )
      })}
      <div className="sb-clock">
        <span className="sb-game">Game {gameNumber}</span>
        <span className="sb-time num">
          <span className="sr-only">Game time </span>
          {clockLabel(time)}
        </span>
        <span className="sb-series">{series}</span>
      </div>
      <div className="sb-gold">
        <span className="sb-gold-text">
          {even ? (
            <b>Gold even</b>
          ) : (
            <>
              <b>
                {leader} +{goldLabel(goldDiffA)}
              </b>{' '}
              gold
            </>
          )}
        </span>
        <span className="sb-goldbar" aria-hidden="true">
          {lead.side && (
            <i
              className={`sb-gold-${lead.side}`}
              style={{ width: `${lead.pct}%`, [lead.side === 'blue' ? 'right' : 'left']: '50%' }}
            />
          )}
        </span>
        <span className="sb-towers">
          Towers <b className="num">{towers}</b>
        </span>
      </div>
    </section>
  )
}
