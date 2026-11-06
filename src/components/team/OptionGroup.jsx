import { Seg, cx } from '../ui/index.js'

/**
 * A choice among labelled options with every explanation kept on screen.
 * The Seg toggle (aria-pressed) is the control; the list beneath states what
 * each option does and marks the chosen one.
 *
 * options: [{ v, label, blurb, extra? }]; `value` compares with ===.
 */
export default function OptionGroup({ name, label, hint, options, value, onPick }) {
  const items = options.map((o) => ({ id: String(o.v), label: o.label }))
  const current = String(value)
  return (
    <div className="opt-group">
      <div className="opt-head">
        <h3 id={`opt-${name}`}>{label}</h3>
        <Seg
          name={name}
          label={label}
          items={items}
          value={current}
          className="team-seg"
          onChange={(id) => onPick(options.find((o) => String(o.v) === id).v)}
        />
      </div>
      <ul className="opt-notes">
        {options.map((o) => (
          <li key={String(o.v)} className={cx(String(o.v) === current && 'is-on')}>
            <strong>{o.label}</strong>
            <span>{o.blurb}</span>
            {o.extra && <span className="opt-extra num">{o.extra}</span>}
          </li>
        ))}
      </ul>
      {hint && <p className="opt-hint">{hint}</p>}
    </div>
  )
}
