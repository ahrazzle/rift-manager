// ============================================================================
// PlayerTags — contract, morale, and wage chips for a player row.
//
// Pure display; every field degrades gracefully when absent so it can be
// dropped into Lineup, Squad, or Market rows without the reducer backfilling
// anything. Money is plain text colour (never a hue).
// ============================================================================
import { playerWage, fmtMoney } from '../game/economy.js'
import { Chip } from './ui/index.js'
import { moraleOf } from './team/PlayerActions.jsx'

export default function PlayerTags({ player }) {
  if (!player) return null
  const morale = player.morale ?? 70
  const contract = player.contract ?? 2
  const m = moraleOf(morale)

  return (
    <span className="tags">
      <Chip title="Years left on contract">
        <span className="sr-only">Contract </span>
        {contract}y
      </Chip>
      <Chip tone={m.tone === 'low' ? 'warn' : 'neutral'} icon={m.tone === 'low' ? 'alert' : undefined} title={`Morale ${morale}`}>
        <span className="sr-only">Morale </span>
        {m.label}
      </Chip>
      <Chip title="Annual wage">
        <span className="sr-only">Wage </span>
        {fmtMoney(playerWage(player))}/yr
      </Chip>
    </span>
  )
}
