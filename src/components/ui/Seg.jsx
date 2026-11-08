import { useRef } from 'react'
import { cx } from './cx.js'

/** Stable id for a Seg tab button, so a panel can point aria-labelledby at it. */
export function segTabId(name, id) {
  return `seg-${name}-${id}`
}

/**
 * Segmented control.
 *
 * variant "toggle" (default): a group of buttons with aria-pressed; use for
 *   filters and options that change what a view shows.
 * variant "tabs": role=tablist with roving tabindex and arrow keys
 *   (Left/Right, Home/End move and select). Pair it with a panel:
 *   <div role="tabpanel" id={panelId} aria-labelledby={segTabId(name, value)}>.
 *
 * items: [{ id, label, tour? }]  (tour sets data-tour for the walkthrough)
 */
export function Seg({ name, items, value, onChange, label, variant = 'toggle', panelId, fill = false, className }) {
  const refs = useRef({})
  const tabs = variant === 'tabs'

  const move = (e, index) => {
    if (!tabs) return
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % items.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + items.length) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    if (next === null) return
    e.preventDefault()
    const target = items[next]
    onChange?.(target.id)
    refs.current[target.id]?.focus()
  }

  return (
    <div
      className={cx('seg', fill && 'seg-fill', className)}
      role={tabs ? 'tablist' : 'group'}
      aria-label={label}
    >
      {items.map((item, index) => {
        const selected = item.id === value
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[item.id] = el
            }}
            type="button"
            {...(tabs
              ? {
                  role: 'tab',
                  id: segTabId(name, item.id),
                  'aria-selected': selected,
                  'aria-controls': panelId,
                  tabIndex: selected ? 0 : -1,
                }
              : { 'aria-pressed': selected })}
            {...(item.tour ? { 'data-tour': item.tour } : {})}
            onClick={() => onChange?.(item.id)}
            onKeyDown={(e) => move(e, index)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
