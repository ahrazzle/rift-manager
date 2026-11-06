import { Icon } from './Icon.jsx'
import { cx } from './cx.js'

/** Empty state: dashed border, one sentence of cause, and the action that fixes it. */
export function EmptyState({ icon, title, action, className, children }) {
  return (
    <div className={cx('ui-empty', className)}>
      {icon && <Icon name={icon} size={24} className="ui-empty-icon" />}
      {title && <p className="ui-empty-title">{title}</p>}
      {children && <p className="ui-empty-body">{children}</p>}
      {action && <div className="ui-empty-action">{action}</div>}
    </div>
  )
}
