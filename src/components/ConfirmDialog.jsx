import { useRef } from 'react'
import { Button, Dialog } from './ui/index.js'

// Two-choice confirmation on the shared Dialog (focus trap, Esc, aria-modal).
// "Keep playing" is the safe choice, so it takes initial focus.
export default function ConfirmDialog({ title, children, confirmLabel, confirmDisabled = false, onConfirm, onCancel }) {
  const keepRef = useRef(null)
  return (
    <Dialog
      title={title}
      size="sm"
      sheet="never"
      description={typeof children === 'string' ? children : undefined}
      onClose={onCancel}
      initialFocusRef={keepRef}
      actions={
        <>
          <Button ref={keepRef} variant="quiet" onClick={onCancel}>Keep playing</Button>
          <Button variant="primary" disabled={confirmDisabled} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      {typeof children === 'string' ? null : children}
    </Dialog>
  )
}
