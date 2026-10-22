// ============================================================================
// PlayerTags — contract, morale, and wage chips for a player row.
//
// Pure display; every field degrades gracefully when absent so it can be
// dropped into Lineup, Squad, or Market rows without the reducer backfilling
// anything.
// ============================================================================
import { playerWage, fmtMoney } from '../game/economy.js'

function moraleOf(morale) {
  if (morale >= 80) return { icon: '🔥', label: 'Locked in', cls: 'edge' }
  if (morale >= 55) return { icon: '😐', label: 'Steady', cls: '' }
  return { icon: '🧊', label: 'Cold', cls: 'risk' }
}

export default function PlayerTags({ player }) {
  if (!player) return null
  const morale = player.morale ?? 70
  const contract = player.contract ?? 2
  const m = moraleOf(morale)

  return (
    <span className="tale" style={{ margin: 0, display: 'inline-flex' }}>
      <span className="tale-chip" title="Years left on contract">📝 {contract}y</span>
      <span className={`tale-chip ${m.cls}`} title={`Morale ${morale}`}>
        {m.icon} {m.label}
      </span>
      <span className="tale-chip" title="Annual wage">💰 {fmtMoney(playerWage(player))}/yr</span>
    </span>
  )
}
