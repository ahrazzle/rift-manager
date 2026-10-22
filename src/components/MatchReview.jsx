import { useId } from 'react'
import { reviewSeries } from '../game/matchReview.js'
import { PREPARATION_FOCI } from '../game/preparation.js'

export default function MatchReview({ games, userSide, onPrepare }) {
  const titleId = useId()
  const review = reviewSeries(games, userSide)
  if (!review) return null
  const { stats, notes, focus } = review
  return (
    <section className="card match-review" aria-labelledby={titleId}>
      <span className="eyebrow">The review room</span>
      <h2 id={titleId}>A result is something to learn from.</h2>
      <div className="review-objectives">
        {[["Dragons", stats.dragons, stats.enemyDragons], ["Towers", stats.towers, stats.enemyTowers], ["Barons", stats.barons, stats.enemyBarons]].map(([label, mine, theirs]) => (
          <div key={label}>
            <div className="review-stat"><strong>{mine}</strong><span>{label}</span><strong>{theirs}</strong></div>
            <div className="review-bar" role="img" aria-label={`${label}: your team ${mine}, opponent ${theirs}`}><span style={{ width: `${mine + theirs ? mine / (mine + theirs) * 100 : 50}%` }} /></div>
          </div>
        ))}
      </div>
      <p className="review-caption">Your team on the left · Opponent on the right · Recorded events across the series</p>
      <div className="review-notes">{notes.map((note) => <article className={`review-note ${note.kind}`} key={note.title}><span aria-hidden="true">{note.kind === 'good' ? '✓' : '↗'}</span><div><h3>{note.title}</h3><p>{note.text}</p></div></article>)}</div>
      {onPrepare && <div className="prep-footer"><p className="hint">Next focus: <strong>{PREPARATION_FOCI.find((f) => f.id === focus)?.label}</strong></p><button type="button" className="ghost" onClick={() => onPrepare(focus)}>Plan next week →</button></div>}
      <p className="hint review-footnote">Coaching suggestions use the simulated match timeline. They describe patterns, not the cause of a win or loss.</p>
    </section>
  )
}
