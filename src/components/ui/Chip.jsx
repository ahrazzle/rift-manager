import { Icon } from './Icon.jsx'
import { cx } from './cx.js'

/**
 * Static status chip (never interactive).
 * tone: neutral | blue | red | win | loss | gold | warn
 * One job per hue: blue/red only for sides, win/loss only for outcomes,
 * gold only for trophies/MVP/achievements, warn for needs-attention.
 */
export function Chip({ tone = 'neutral', icon, className, children, ...rest }) {
  return (
    <span className={cx('chip', tone !== 'neutral' && `chip-${tone}`, className)} {...rest}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  )
}
