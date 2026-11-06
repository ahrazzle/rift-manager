import { Icon } from '../ui/index.js'
import { cx } from '../ui/index.js'

/**
 * Wizard step indicator. steps: [{ id, label }], current index (0-based).
 * Semantics: an ordered list with aria-current="step" on the active item.
 */
export default function Stepper({ steps, current, label = 'Setup steps' }) {
  return (
    <ol className="ng-steps" aria-label={label}>
      {steps.map((s, i) => {
        const status = i < current ? 'done' : i === current ? 'now' : 'next'
        return (
          <li key={s.id} className={cx('ng-step', `is-${status}`)} aria-current={i === current ? 'step' : undefined}>
            <span className="ng-step-dot" aria-hidden="true">
              {status === 'done' ? <Icon name="check" size={14} /> : i + 1}
            </span>
            <span className="ng-step-label">
              <span className="sr-only">{`Step ${i + 1} of ${steps.length}: `}</span>
              {s.label}
              {status === 'done' && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
