import { useId } from 'react'
import { cx } from './cx.js'

/**
 * Surface card. variant: default | hero (team-tinted) | inset (s2, no shadow).
 * `title` renders the card header (h2 18/600) with an optional `action` on the
 * right (usually a quiet Button). `eyebrow` renders a small label above.
 * With a title, the card is a labelled <section>.
 */
export function Card({
  variant = 'default',
  title,
  titleAs: TitleTag = 'h2',
  eyebrow,
  action,
  as,
  className,
  children,
  ...rest
}) {
  const id = useId()
  const Tag = as ?? (title ? 'section' : 'div')
  const titleId = `${id}-title`
  return (
    <Tag
      className={cx('ui-card', variant !== 'default' && `ui-card--${variant}`, className)}
      {...(title && Tag === 'section' ? { 'aria-labelledby': titleId } : {})}
      {...rest}
    >
      {(title || action || eyebrow) && (
        <div className="ui-card-h">
          <div className="ui-card-h-text">
            {eyebrow && <p className="label">{eyebrow}</p>}
            {title && <TitleTag id={titleId}>{title}</TitleTag>}
          </div>
          {action && <div className="ui-card-h-action">{action}</div>}
        </div>
      )}
      {children}
    </Tag>
  )
}
