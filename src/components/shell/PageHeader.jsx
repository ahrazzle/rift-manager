import { Seg } from '../ui/Seg.jsx'
import { cx } from '../ui/cx.js'

/**
 * Destination header: display h1, one-line context, and (optionally) the
 * destination's segment tabs plus page actions on the right.
 * seg: { name, items, value, onChange, panelId, label }
 */
export default function PageHeader({ title, sub, seg, actions, hidden = false, className }) {
  if (hidden) return <h1 className="sr-only">{title}</h1>
  return (
    <header className={cx('shell-page-head', className)}>
      <div className="shell-page-title">
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {(seg || actions) && (
        <div className="shell-page-tools">
          {actions}
          {seg && seg.items.length > 1 && <Seg variant="tabs" fill {...seg} />}
        </div>
      )}
    </header>
  )
}
