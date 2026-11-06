import { cx } from './cx.js'

const WORD = { W: 'win', L: 'loss' }

/**
 * Form pips. `results` is an array of 'W' | 'L' | null (null = upcoming,
 * drawn dashed). The letter sits inside each pip so meaning is never
 * color-only; screen readers get one summary line instead of each pip.
 */
export function Pips({ results = [], label = 'Form', className }) {
  const summary = results.map((r) => WORD[r] ?? 'upcoming').join(', ')
  return (
    <span className={cx('pips', className)}>
      <span className="sr-only">
        {label}: {summary || 'no games yet'}
      </span>
      {results.map((r, i) => (
        <span key={i} className={cx('pip', r === 'W' ? 'w' : r === 'L' ? 'l' : 'n')} aria-hidden="true">
          {r === 'W' || r === 'L' ? r : ''}
        </span>
      ))}
    </span>
  )
}
