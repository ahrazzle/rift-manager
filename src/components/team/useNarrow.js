import { useMedia } from '../ui/index.js'

/** True under 760px. Squad and Market swap a table for a card grid with it. Desktop (false) when there is no matchMedia. */
export function useNarrow() {
  return useMedia('(max-width: 760px)')
}
