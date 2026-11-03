import { useEffect, useId, useRef } from 'react'

export default function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel }) {
  const ref = useRef(null)
  const titleId = useId()
  const descriptionId = useId()
  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger?.isConnected) trigger.focus()
    }
  }, [])
  return (
    <dialog ref={ref} className="card" aria-labelledby={titleId} aria-describedby={descriptionId}
      style={{ width: 'min(460px, calc(100vw - 32px))', color: 'var(--text)', background: 'var(--bg1)' }}
      onCancel={(event) => { event.preventDefault(); onCancel() }}>
      <h2 id={titleId}>{title}</h2>
      <p id={descriptionId}>{children}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button type="button" className="ghost" autoFocus onClick={onCancel}>Keep playing</button>
        <button type="button" className="primary" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>
  )
}
