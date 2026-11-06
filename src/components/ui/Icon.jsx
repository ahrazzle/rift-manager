import { ICONS, ROLES } from './iconData.js'
import { cx } from './cx.js'

/**
 * UI icon from the Broadcast Night sprite (24px grid, 2px stroke, currentColor).
 * Decorative by default; pass `title` when the icon is the only label.
 */
export function Icon({ name, size = 20, title, className, ...rest }) {
  const inner = ICONS[name]
  if (!inner) return null
  return (
    <svg
      className={cx('ui-icon', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      focusable="false"
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': 'true' })}
      dangerouslySetInnerHTML={{ __html: inner }}
      {...rest}
    />
  )
}

/** Role mark (TOP JNG MID BOT SUP). Original geometric glyphs, not game art. */
export function RoleIcon({ role, size = 16, title, className, ...rest }) {
  const key = String(role || '').toUpperCase()
  const inner = ROLES[key]
  if (!inner) return null
  return (
    <svg
      className={cx('ui-role', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      focusable="false"
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': 'true' })}
      dangerouslySetInnerHTML={{ __html: inner }}
      {...rest}
    />
  )
}

export const ICON_NAMES = Object.keys(ICONS)
export const ROLE_NAMES = Object.keys(ROLES)
