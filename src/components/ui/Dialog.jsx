import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button.jsx'
import { cx } from './cx.js'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusablesIn(root) {
  if (!root?.querySelectorAll) return []
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter((el) => !el.hasAttribute('inert') && el.getClientRects?.().length !== 0)
}

/**
 * Modal dialog. One primitive: centered panel on desktop, bottom sheet under
 * 900px (or always, with sheet="always"). Scrim, aria-modal, focus trap,
 * Esc closes, focus goes to `initialFocusRef` or the first control, and
 * returns to whatever had focus before it opened.
 *
 * Render it only while open: {open && <Dialog ... />}.
 * Props: title (required, becomes the accessible name), description,
 * onClose, actions (footer buttons), size: sm | md | lg,
 * sheet: auto | always | never, dismissible (default true: Esc, scrim, close button).
 */
export function Dialog({
  title,
  description,
  onClose,
  actions,
  size = 'md',
  sheet = 'auto',
  dismissible = true,
  initialFocusRef,
  className,
  children,
}) {
  const id = useId()
  const panelRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const doc = globalThis.document
    if (!doc?.addEventListener) return undefined
    const previouslyFocused = doc.activeElement
    const panel = panelRef.current
    const first = initialFocusRef?.current ?? focusablesIn(panel)[0] ?? panel
    first?.focus?.({ preventScroll: true })
    const root = doc.documentElement
    const prevOverflow = root?.style?.overflow
    if (root?.style) root.style.overflow = 'hidden'

    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible) {
        e.stopPropagation()
        e.preventDefault()
        closeRef.current?.()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusablesIn(panel)
      if (!items.length) {
        e.preventDefault()
        panel?.focus?.()
        return
      }
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      if (e.shiftKey && (doc.activeElement === firstEl || !panel.contains(doc.activeElement))) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && (doc.activeElement === lastEl || !panel.contains(doc.activeElement))) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    doc.addEventListener('keydown', onKey, true)
    return () => {
      doc.removeEventListener('keydown', onKey, true)
      if (root?.style) root.style.overflow = prevOverflow ?? ''
      if (previouslyFocused?.isConnected && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true })
      }
    }
  }, [dismissible, initialFocusRef])

  const node = (
    <div
      className={cx('ui-scrim', sheet === 'always' && 'ui-scrim--sheet', sheet === 'never' && 'ui-scrim--center')}
      onMouseDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        ref={panelRef}
        className={cx('ui-dialog', `ui-dialog--${size}`, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        {...(description ? { 'aria-describedby': `${id}-desc` } : {})}
        tabIndex={-1}
      >
        <div className="ui-dialog-h">
          <h2 id={`${id}-title`}>{title}</h2>
          {dismissible && <Button variant="quiet" icon="close" iconOnly label="Close" onClick={() => onClose?.()} />}
        </div>
        {description && (
          <p id={`${id}-desc`} className="ui-dialog-desc">
            {description}
          </p>
        )}
        <div className="ui-dialog-body">{children}</div>
        {actions && <div className="ui-dialog-actions">{actions}</div>}
      </div>
    </div>
  )

  const body = globalThis.document?.body
  return body && typeof body.appendChild === 'function' ? createPortal(node, body) : node
}

/** Same primitive, always presented as a bottom sheet (e.g. the mobile overflow menu). */
export function BottomSheet(props) {
  return <Dialog sheet="always" {...props} />
}
