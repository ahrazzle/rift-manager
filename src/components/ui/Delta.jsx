import { cx } from './cx.js'

/**
 * Change indicator: ▲ (win color) / ▼ (loss color) / – (neutral), with the
 * magnitude and a screen-reader phrase. Positive `value` means "better".
 * `unit` is read aloud ("places", "points"); `suffix` is shown after the number.
 */
export function Delta({ value = 0, unit = '', suffix = '', className }) {
  const n = Number(value) || 0
  const dir = n > 0 ? 'up' : n < 0 ? 'down' : 'flat'
  const glyph = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '–'
  const abs = Math.abs(n)
  const spoken = dir === 'flat' ? 'no change' : `${dir} ${abs}${unit ? ` ${unit}` : ''}`
  return (
    <span className={cx('ui-delta', `ui-delta--${dir}`, className)}>
      <span aria-hidden="true">
        {glyph}
        {dir !== 'flat' && (
          <>
            {' '}
            {abs}
            {suffix}
          </>
        )}
      </span>
      <span className="sr-only">{spoken}</span>
    </span>
  )
}
