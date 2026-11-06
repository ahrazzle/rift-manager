import { useState } from 'react'
import { Button, Card, Dialog } from '../ui/index.js'

/** Career standing on the Hub: which split, titles so far, and the way out. */
export default function CareerCard({ state, dispatch }) {
  const [confirm, setConfirm] = useState(false)
  const c = state.career
  if (state.mode !== 'career' || !c || c.status !== 'active') return null
  const titles = (c.history ?? []).filter((h) => h.championId === state.teamId).length
  return (
    <Card title="Career" className="hub-career">
      <p className="muted">
        Split {c.seasonIndex} of {c.maxSeasons} · {titles} title{titles === 1 ? '' : 's'} so far. Players age and develop when you advance a season.
      </p>
      <Button variant="quiet" onClick={() => setConfirm(true)}>
        Retire career
      </Button>
      {confirm && (
        <Dialog
          title="Retire now?"
          description="Your managerial career ends here. Completed seasons stay in your record."
          size="sm"
          onClose={() => setConfirm(false)}
          actions={
            <>
              <Button variant="quiet" onClick={() => setConfirm(false)}>
                Keep managing
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setConfirm(false)
                  dispatch({ type: 'RETIRE' })
                }}
              >
                Retire
              </Button>
            </>
          }
        />
      )}
    </Card>
  )
}
