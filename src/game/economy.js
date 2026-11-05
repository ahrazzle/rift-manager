// ============================================================================
// Rift Manager — team economy helpers (pure, no state).
// Fictional currency. Wages scale with the square of OVR so stars cost
// disproportionately more than role players; fees are a multiple of wage.
// ============================================================================

// Annual wage for a player, from OVR. e.g. OVR 85 → ~$87K, OVR 95 → ~$108K.
export function playerWage(p) {
  const ovr = p?.ovr ?? 70
  return Math.round(ovr * ovr * 12)
}

// One-time signing fee for a free agent.
export function signingFee(p) {
  return playerWage(p) * 4
}

// A team's season transfer budget, from its tier (70-95ish).
// e.g. tier 90 → $10.8M, enough for a few star signings, not a whole roster.
export function teamBudget(tier) {
  return (tier ?? 80) * 120_000
}

export function canAfford(budget, fee) {
  return fee <= budget
}

// "$4.2M" / "$850K" / "$95K" / "$0" — never "$0K".
export function fmtMoney(n) {
  const v = Math.round(n ?? 0)
  if (v === 0) return '$0'
  if (v >= 1_000_000) {
    const m = v / 1_000_000
    return '$' + (Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1)) + 'M'
  }
  return '$' + Math.round(v / 1000) + 'K'
}

// Exact dollars with thousands separators: "$346,800". Used where a rounded
// label would hide a real difference, such as the transfer market.
export function fmtMoneyExact(n) {
  const v = Math.round(n ?? 0)
  const digits = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (v < 0 ? '-$' : '$') + digits
}
