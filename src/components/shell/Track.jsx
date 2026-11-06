import { cx } from '../ui/cx.js'

const SPOKEN = { done: 'done', now: 'current', next: 'upcoming', lost: 'eliminated' }

/**
 * Read-only progress track (season phases, gauntlet ladder, scenario path).
 * steps: [{ id, label, status: 'done' | 'now' | 'next' | 'lost' }]
 */
export default function Track({ steps, label, className }) {
  if (!steps?.length) return null
  return (
    <ol className={cx('shell-track', className)} aria-label={label}>
      {steps.map((s) => (
        <li key={s.id} className={`is-${s.status}`} {...(s.status === 'now' ? { 'aria-current': 'step' } : {})}>
          <span className="dot" aria-hidden="true" />
          {s.label}
          <span className="sr-only"> ({SPOKEN[s.status]})</span>
        </li>
      ))}
    </ol>
  )
}
