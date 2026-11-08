import { Chip } from '../ui/index.js'
import { cx } from '../ui/cx.js'
import { SIDE_WORD } from './copy.js'

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/** Done state: both comp identities with their bonus, then the post-draft debrief. */
export function DraftSummary({ comps, debrief, userSide, teams }) {
  return (
    <>
      <section className="draft-sum" aria-labelledby="draft-sum-title">
        <h2 id="draft-sum-title" className="draft-sum-h">
          Comps are locked
        </h2>
        <div className="draft-sum-grid">
          {comps.map((c) => (
            <article key={c.side} className={cx('draft-sum-comp', `side-${c.side.toLowerCase()}`)}>
              <p className="draft-sum-who">
                <Chip tone={c.side === 'BLUE' ? 'blue' : 'red'}>{SIDE_WORD[c.side]} side</Chip>
                <span>{c.side === userSide ? 'Your comp' : `${teams[c.side].abbr} comp`}</span>
              </p>
              <h3>{cap(c.identity)}</h3>
              <p className="draft-sum-bonus num">Comp bonus +{c.bonus.toFixed(2)}</p>
              <ul>
                {c.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
      {debrief.length > 0 && (
        <section className="draft-sum" aria-labelledby="draft-debrief-title">
          <h2 id="draft-debrief-title" className="draft-sum-h">
            What the challenger would have picked
          </h2>
          <ul className="draft-debrief">
            {debrief.map((e, i) => (
              <li key={i}>
                <b>
                  {e.yourPick.name}
                  {e.yourPick.role && <span> ({e.yourPick.role})</span>}
                  {e.yourPick.flex && <span> (flex)</span>}
                </b>
                {e.delta > 0 && e.optimalPick ? (
                  <span>
                    Challenger pick: <strong>{e.optimalPick.name}</strong> ({e.optimalPick.role}), {e.note}
                  </span>
                ) : (
                  <span>Matches the data-optimal pick.</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
