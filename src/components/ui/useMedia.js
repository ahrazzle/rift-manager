import { useEffect, useState } from 'react'

/** matchMedia as state. Server and test renders (no window) get `false` (desktop). */
export function useMedia(query) {
  const read = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false)
  const [matches, setMatches] = useState(read)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const mq = window.matchMedia(query)
    const on = () => setMatches(mq.matches)
    on()
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [query])
  return matches
}

/** The shell's one breakpoint: rail → tabbar, draft columns → strip + sheet, dialogs → bottom sheets. */
export const NARROW = '(max-width: 900px)'
