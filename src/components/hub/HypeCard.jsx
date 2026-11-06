import { useId } from 'react'
import { Pips } from '../ui/index.js'
import { hype, HYPE_SCALE } from './hubData.js'

/** Fan hype: informational, from the last five series and table position. */
export default function HypeCard({ state }) {
  const id = useId()
  const h = hype(state)
  return (
    <section className="ui-card hub-hype" aria-labelledby={id}>
      <div className="ui-card-h hub-hype-h">
        <h2 id={id}>Fan hype</h2>
        <span className="num">
          <b>{h.pct}</b> <span className="muted">/ 100</span>
        </span>
      </div>
      <div className="meter" aria-hidden="true">
        <i style={{ width: `${h.pct}%` }} />
      </div>
      <p className="sr-only">{`Fan hype ${h.pct} of 100, ${h.word}.`}</p>
      <div className="hub-hype-scale" aria-hidden="true">
        {HYPE_SCALE.map((w) => (
          <span key={w} className={w === h.word ? 'is-on' : ''}>
            {w}
          </span>
        ))}
      </div>
      <div className="hub-hype-form">
        <Pips results={h.dots} label="Last five series" />
        <span className="faint">Last five series</span>
      </div>
    </section>
  )
}
