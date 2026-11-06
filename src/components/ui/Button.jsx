import { forwardRef } from 'react'
import { Icon } from './Icon.jsx'
import { cx } from './cx.js'

const VARIANT = { primary: 'btn-primary', secondary: '', quiet: 'btn-quiet' }

/**
 * Button. variant: primary | secondary | quiet. size: md | lg.
 * `icon` adds a leading sprite icon; `iconOnly` makes a 44px square icon button
 * and requires `label` (used as aria-label). Pass `href` to render a link.
 * Max one primary per view.
 */
export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', icon, iconOnly = false, label, href, type = 'button', className, children, ...rest },
  ref,
) {
  const classes = cx('btn', VARIANT[variant], size === 'lg' && 'btn-lg', iconOnly && 'icon-btn', className)
  const content = (
    <>
      {icon && <Icon name={icon} size={iconOnly ? 22 : 18} />}
      {iconOnly ? null : children ?? label}
    </>
  )
  const a11y = iconOnly ? { 'aria-label': label } : {}
  if (href) {
    return (
      <a ref={ref} className={classes} href={href} {...a11y} {...rest}>
        {content}
      </a>
    )
  }
  return (
    <button ref={ref} type={type} className={classes} {...a11y} {...rest}>
      {content}
    </button>
  )
})
