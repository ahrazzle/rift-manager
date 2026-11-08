// Managed roster card with the transfer controls (Sell / Release) in the
// PlayerActions slot. Used by Squad (Career) and by Market in Season mode,
// where Release is the only transfer. Every refusal comes from the same
// preview the reducer applies, so a disabled button always says why and a
// confirmed action never silently no-ops.
import { useState } from 'react'
import { Card } from '../ui/index.js'
import ConfirmDialog from '../ConfirmDialog.jsx'
import PlayerList from './PlayerList.jsx'
import { previewTransfer } from '../../game/backend/transfers.js'
import { fmtMoneyExact } from '../../game/economy.js'
import { ROLE_LABEL } from '../../data/lck.js'

export default function ManagedRoster({ state, dispatch }) {
  const [pending, setPending] = useState(null) // { type, playerId } | null
  const mode = state.mode ?? 'season'
  const roster = state.teams?.[state.teamId] ?? []
  const starterIds = new Set(Object.values(state.lineup || {}))
  const previewsFor = (p) => ({
    sell: mode === 'career' ? previewTransfer(state, { type: 'SELL_PLAYER', playerId: p.id }) : null,
    release: previewTransfer(state, { type: 'RELEASE_PLAYER', playerId: p.id }),
  })

  const pendingPreview = pending
    ? previewTransfer(state, { type: pending.type, playerId: pending.playerId })
    : null
  const pendingPlayer = pending ? roster.find((p) => p.id === pending.playerId) : null

  return (
    <>
      {state.lastEventLog && <p className="opt-hint">{state.lastEventLog}</p>}
      <Card title="My roster">
        <p className="opt-lede">
          Age and potential (Pot) — fixed cap in data; growth happens on Career Advance Season only.{' '}
          {mode === 'career'
            ? 'Sell lists a player to free agency for half their signing fee. Release is free, bench only.'
            : 'Release sends a bench player to free agency. Selling players is available only in Career.'}
        </p>
        <PlayerList
          label="My roster"
          players={roster}
          starterIds={starterIds}
          showMorale
          actionsHeader="Morale & transfers"
          getActions={(p) => {
            const { sell, release } = previewsFor(p)
            const actions = []
            if (sell) {
              actions.push({
                id: 'sell', label: 'Sell', disabled: !sell.ok,
                ariaLabel: `Sell ${p.name}`,
                onClick: () => setPending({ type: 'SELL_PLAYER', playerId: p.id }),
              })
            }
            actions.push({
              id: 'release', label: 'Release', disabled: !release.ok,
              ariaLabel: `Release ${p.name}`,
              onClick: () => setPending({ type: 'RELEASE_PLAYER', playerId: p.id }),
            })
            return actions
          }}
          getNote={(p) => {
            const { sell, release } = previewsFor(p)
            const blocked = []
            if (sell && !sell.ok) blocked.push({ label: 'Sell', reason: sell.reason })
            if (!release.ok) blocked.push({ label: 'Release', reason: release.reason })
            if (!blocked.length) return undefined
            if (blocked.length === 2 && blocked[0].reason === blocked[1].reason) return blocked[0].reason
            return blocked.map((b) => `${b.label}: ${b.reason}`).join(' ')
          }}
        />
      </Card>
      {pending && pendingPlayer && (
        <ConfirmDialog
          title={`${pending.type === 'SELL_PLAYER' ? 'Sell' : 'Release'} ${pendingPlayer.name}?`}
          confirmLabel={pending.type === 'SELL_PLAYER' ? 'Sell player' : 'Release player'}
          confirmDisabled={!pendingPreview?.ok}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            const fresh = previewTransfer(state, { type: pending.type, playerId: pending.playerId })
            setPending(null)
            if (fresh.ok) dispatch({ type: pending.type, playerId: pending.playerId })
          }}
        >
          {pendingPreview?.ok ? (
            <p>
              {pending.type === 'SELL_PLAYER' ? (
                <>
                  {pendingPlayer.name} ({ROLE_LABEL[pendingPlayer.role] ?? pendingPlayer.role}, OVR {pendingPlayer.ovr}) is
                  listed and leaves for free agency. The club receives{' '}
                  <strong>{fmtMoneyExact(pendingPreview.fee)}</strong>.
                  {pendingPreview.replacementName
                    ? ` ${pendingPreview.replacementName} becomes the ${ROLE_LABEL[pendingPlayer.role] ?? pendingPlayer.role} starter.`
                    : ' No starter change.'}
                </>
              ) : (
                <>
                  {pendingPlayer.name} ({ROLE_LABEL[pendingPlayer.role] ?? pendingPlayer.role}, OVR {pendingPlayer.ovr}) is
                  released and becomes a free agent. No fee is received.
                </>
              )}
            </p>
          ) : (
            <p>{pendingPreview?.reason ?? 'This transfer is no longer available.'}</p>
          )}
        </ConfirmDialog>
      )}
    </>
  )
}
