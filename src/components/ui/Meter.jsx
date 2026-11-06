import { cx } from './cx.js'

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

/**
 * Horizontal meter. Always paired with a number in text.
 * variant "neutral": one bar from 0..max, `label` + value shown above.
 * variant "split": two-sided bar (left share vs right), `leftLabel`/`rightLabel`
 * shown with their percentages; `value` is the left share 0..100.
 * The bar itself is decorative (aria-hidden); the text carries the value.
 */
export function Meter({
  value = 0,
  max = 100,
  label,
  valueText,
  variant = 'neutral',
  leftLabel,
  rightLabel,
  hideText = false,
  className,
}) {
  if (variant === 'split') {
    const left = clamp(Math.round(value), 0, 100)
    return (
      <div className={cx('ui-meter ui-meter--split', className)}>
        {!hideText && (
          <div className="ui-meter-row">
            <span>
              <strong className="num">{left}%</strong> {leftLabel}
            </span>
            {label && <span className="ui-meter-mid">{label}</span>}
            <span>
              {rightLabel} <strong className="num">{100 - left}%</strong>
            </span>
          </div>
        )}
        <div className="ui-meter-bar" aria-hidden="true">
          <i style={{ width: `${left}%` }} />
        </div>
      </div>
    )
  }
  const pct = max > 0 ? clamp((value / max) * 100, 0, 100) : 0
  return (
    <div className={cx('ui-meter', className)}>
      {!hideText && (
        <div className="ui-meter-row">
          {label && <span className="label">{label}</span>}
          <strong className="num">{valueText ?? `${Math.round(value)}${max === 100 ? '' : ` / ${max}`}`}</strong>
        </div>
      )}
      <div className="meter" aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
