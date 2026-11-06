import { createContext, useContext, useLayoutEffect, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Mode screens (Draft, Matchday) run full-screen: the shell hides the nav and
// shows a mode bar with Back + title only. The shell computes a sensible
// default from state.matchSession; a mode screen can override it.
//
//   useModeBar({ title, subtitle, backLabel, onBack, backHidden })
//     Strings/booleans only in the deps; onBack is read from a ref, so passing
//     a fresh arrow function every render is fine. Cleared on unmount.
//
//   <ModeBarActions>…</ModeBarActions>
//     Portals controls (pause, speed, skip) into the right side of the bar.
//
//   useHasModeBar()
//     True inside the shell's mode bar provider; use it to fall back to inline controls.

const ModeBarContext = createContext(null)

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export function ModeBarProvider({ children }) {
  const [override, setOverride] = useState(null)
  const [actionsEl, setActionsEl] = useState(null)
  const backRef = useRef(null)
  const value = useRef(null)
  value.current = { override, setOverride, actionsEl, setActionsEl, backRef }
  return <ModeBarContext.Provider value={value.current}>{children}</ModeBarContext.Provider>
}

/** Shell-internal: read the current override + actions slot. */
export function useModeBarState() {
  return useContext(ModeBarContext)
}

/**
 * Public: true when a mode bar is mounted (the screen runs inside the shell's
 * match mode), so controls can portal into it via <ModeBarActions>; false in
 * tests and standalone renders, where a screen keeps its controls inline.
 */
export function useHasModeBar() {
  return useContext(ModeBarContext) != null
}

export function useModeBar({ title, subtitle, backLabel, onBack, backHidden } = {}) {
  const ctx = useContext(ModeBarContext)
  const setOverride = ctx?.setOverride
  const backRef = ctx?.backRef
  if (backRef) backRef.current = onBack ?? null
  useIsoLayoutEffect(() => {
    if (!setOverride) return undefined
    setOverride({ title, subtitle, backLabel, backHidden: !!backHidden, hasBack: typeof onBack === 'function' })
    return () => setOverride(null)
    // onBack is read through backRef; only its presence matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setOverride, title, subtitle, backLabel, backHidden, typeof onBack === 'function'])
}

export function ModeBarActions({ children }) {
  const ctx = useContext(ModeBarContext)
  if (!ctx?.actionsEl) return null
  return createPortal(children, ctx.actionsEl)
}
