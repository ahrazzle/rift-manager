// ============================================================================
// LCK Manager — Coach roster (Career mode dataset)
// ----------------------------------------------------------------------------
// SCOPE CONTRACT: ALL ratings are GAME-BALANCED FICTIONAL VALUES for the
// simulation (same contract as player ovr). Only coach NAMES and team
// associations come from docs/coach-roster-research.md (Hazen).
//
// Present head coaches (one per present team):
//   REAL names (HIGH confidence in the research doc): T1 kkOma, GEN Ryu,
//   HLE Homme, DK cvMax, KT Score, DRX Ssong, BRO Edgar.
//   FICTIONAL fallbacks (doc flags UNCERTAIN / do-not-ship / LOW):
//   NS (LOW lineage), KDF (RapidStar [UNCERTAIN]), FOX (post-Ryu [UNCERTAIN]).
//   Fallbacks use rating = team tier - 5, style BAL, per the design doc.
//   NOTE: GEN's Ryu is shared with FOX's 2022-25 tenure in the doc; GEN keeps
//   him as present head (Nov 2025-present) and FOX takes the fallback.
//   NOTE: BRO's present head per the doc is Ssong (Nov 2025-present), but
//   Ssong is assigned to DRX (2024-25 tenure) so every team has ONE distinct
//   head; BRO keeps Edgar (Nov 2020-2025 tenure, HIGH confidence).
// Free-agent pool: elite/strong names unused as present heads —
//   Zefa, Bengi, NoFe, Tom, Hirai, Micro.
// ============================================================================

export const COACH_STYLES = ['AGGR', 'BAL', 'DEF']

// Coach = { id, name, team: teamId | 'FA', rating: 60..99, style }
export const COACHES = [
  // ---- Present head coaches (real names) ----
  { id: 'COACH-kkoma', name: 'kkOma', team: 'T1', rating: 92, style: 'BAL' },
  { id: 'COACH-ryu', name: 'Ryu', team: 'GEN', rating: 82, style: 'BAL' },
  { id: 'COACH-homme', name: 'Homme', team: 'HLE', rating: 84, style: 'DEF' },
  { id: 'COACH-cvmax', name: 'cvMax', team: 'DK', rating: 88, style: 'AGGR' },
  { id: 'COACH-score', name: 'Score', team: 'KT', rating: 85, style: 'BAL' },
  { id: 'COACH-ssong', name: 'Ssong', team: 'DRX', rating: 83, style: 'AGGR' },
  { id: 'COACH-edgar', name: 'Edgar', team: 'BRO', rating: 88, style: 'BAL' },
  // ---- Present head coaches (fictional fallbacks, tier - 5, BAL) ----
  { id: 'COACH-NS', name: 'Coach NS', team: 'NS', rating: 74, style: 'BAL' },
  { id: 'COACH-KDF', name: 'Coach KDF', team: 'KDF', rating: 75, style: 'BAL' },
  { id: 'COACH-FOX', name: 'Coach FOX', team: 'FOX', rating: 71, style: 'BAL' },
  // ---- Free-agent pool (real names, fictional ratings) ----
  { id: 'COACH-zefa', name: 'Zefa', team: 'FA', rating: 88, style: 'BAL' },
  { id: 'COACH-bengi', name: 'Bengi', team: 'FA', rating: 87, style: 'AGGR' },
  { id: 'COACH-nofe', name: 'NoFe', team: 'FA', rating: 85, style: 'DEF' },
  { id: 'COACH-hirai', name: 'Hirai', team: 'FA', rating: 83, style: 'DEF' },
  { id: 'COACH-micro', name: 'Micro', team: 'FA', rating: 83, style: 'AGGR' },
  { id: 'COACH-tom', name: 'Tom', team: 'FA', rating: 82, style: 'BAL' },
]

export const COACH_BY_ID = Object.fromEntries(COACHES.map((c) => [c.id, c]))

// Flat strength bonus for the managed team only (design doc §3.4).
// rating 75 -> 0; 90 -> +2.25; 60 -> -2.25.
export function coachBonus(rating) {
  return (rating - 75) * 0.15
}
