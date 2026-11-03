import { useRef, useState } from 'react'
import { TEAMS } from '../data/lck.js'
import { orderStandings } from '../game/useGameState.js'
import { exportPng } from '../utils/exportPng.js'

const STATIC_NAME = Object.fromEntries(TEAMS.map((t) => [t.id, t.name]))

function nameOf(state, teamId) {
  return state.teamMeta?.[teamId]?.name ?? STATIC_NAME[teamId] ?? teamId
}

export default function Standings({ state }) {
  const shotRef = useRef(null)
  const [shotErr, setShotErr] = useState(null)
  const rows = orderStandings(state.standings)

  const me = state.teamId
  const regional = state.phase === 'regional'

  return (
    <div className="card" ref={shotRef}>
      <span className="eyebrow">📊 League table{state.league ? ` · ${state.league}` : ''}</span>
      <h2 style={{ marginTop: 4 }}>Standings</h2>
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>W</th>
            <th>L</th>
            <th>GW</th>
            <th>GL</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.teamId} className={r.teamId === me ? 'me' : ''}>
              <td className={regional && i < 2 ? 'pos-q' : regional && i < 4 ? 'pos-po' : ''}>{i + 1}</td>
              <td className="tname">{nameOf(state, r.teamId)}</td>
              <td>{r.W}</td>
              <td>{r.L}</td>
              <td>{r.gameWins}</td>
              <td>{r.gameLosses}</td>
              <td><strong>{r.points}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
      {regional && (
        <p className="hint">
          <span className="pos-q">Top 2</span> → MSI + Worlds &nbsp;·&nbsp;{' '}
          <span className="pos-po">Top 4</span> → playoffs
        </p>
      )}
      <p className="hint">W = series wins, GW/GL = individual game wins/losses, Pts = series wins.</p>
      <button className="ghost" onClick={async () => {
        setShotErr(null)
        try { await exportPng(shotRef, 'lck-standings.png') }
        catch { setShotErr('Export failed. Try again.') }
      }}>Download PNG ⬇</button>
      {shotErr && <p className="hint">{shotErr}</p>}
    </div>
  )
}
