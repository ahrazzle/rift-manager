/** Plain-language read of a win chance (pure, so game helpers and tests can import it). */
export function oddsWord(pct) {
  if (pct >= 56) return 'Favoured'
  if (pct <= 44) return 'Underdog'
  return 'Close match'
}
