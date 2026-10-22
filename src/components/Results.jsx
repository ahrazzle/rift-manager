import { useMemo, useState } from 'react'
import { TEAMS } from '../data/lck.js'
import { campaignById } from '../game/useGameState.js'
import MatchDetail, { recomputeGames } from './MatchDetail.jsx'

const STATIC_NAME = Object.fromEntries(TEAMS.map((t) => [t.id, t.name]))

// Campaign-mode results: flat list of played slots (winnable slots expand
// via the same recomputeGames path; historical slots render statically).
function CampaignResults({ state }) {
  const [openKey, setOpenKey] = useState(null)
  const prog = state.campaign
  const campaign = prog ? campaignById(prog.campaignId) : null
  if (!prog || !campaign || prog.nodeResults.length === 0) {
    return (
      <div className="card">
        <h2>Results</h2>
        <p className="hint">No campaign games played yet. Play from the Campaign tab.</p>
      </div>
    )
  }
  const nodeById = Object.fromEntries(campaign.nodes.map((n, i) => [n.id, { node: n, index: i }]))
  const ordered = [...prog.nodeResults].reverse()
  return (
    <div className="stack">
      {ordered.map((r) => {
        const { node, index } = nodeById[r.nodeId] || {}
        const key = `${r.nodeId}-${r.slot}`
        const isOpen = openKey === key
        const games = r.detail
          ? recomputeGames({ detail: r.detail, homeId: r.homeId, awayId: r.awayId })
          : null
        return (
          <div className="card result" key={key}>
            <div className="result-head">
              <span className="rw">
                {node ? node.round : r.nodeId} · Game {r.slot}
              </span>
              {r.historicalLoss ? (
                <span className="hint">🎞 HISTORICAL</span>
              ) : (
                <span className={r.playerWon ? 'outcome win' : 'outcome loss'}>
                  {r.playerWon ? 'WIN' : 'LOSS'}
                </span>
              )}
            </div>
            <div className="result-score">
              <span>{campaign.playerLabel} (You)</span>
              <span className="rs">
                {r.historicalLoss ? '0–1' : `${r.aWins}–${r.bWins}`}
              </span>
              <span>{node ? node.opponentLabel : r.awayId}</span>
            </div>
            {r.detail && (
              <div className="md-toggle-row">
                <button
                  type="button"
                  className="ghost"
                  aria-expanded={isOpen}
                  onClick={() => setOpenKey(isOpen ? null : key)}
                >
                  Match detail →
                </button>
              </div>
            )}
            {isOpen && r.detail && (
              <MatchDetail
                round={(index ?? 0) + 1}
                homeId={r.homeId}
                awayId={r.awayId}
                aWins={r.aWins}
                bWins={r.bWins}
                userSide="home"
                games={games || []}
                onBack={() => setOpenKey(null)}
                state={state}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function Results({ state }) {
  const [openKey, setOpenKey] = useState(null)

  const nameOf = (teamId) => state.teamMeta?.[teamId]?.name ?? STATIC_NAME[teamId] ?? teamId

  if (state.mode === 'campaign') return <CampaignResults state={state} />

  const ordered = useMemo(() => [...state.results].reverse(), [state.results])
  // Lazy: recompute a series' games only when its card is opened. Re-running
  // simulateSeries for every stored result on each render was the heaviest
  // page in the app.
  const gamesFor = (key, r) => {
    if (openKey !== key) return null
    try { return recomputeGames(r) } catch { return null }
  }

  if (state.results.length === 0) {
    return (
      <div className="card">
        <h2>Results</h2>
        <p className="hint">No matches played yet. Play a week from the Dashboard.</p>
      </div>
    )
  }

  return (
    <div className="stack">
      {ordered.map((r, i) => {
        const youHome = r.userSide === 'home'
        const youWon = r.userSide
          ? (youHome ? r.homeWon : !r.homeWon)
          : null
        const key = `${r.round}-${r.homeId}-${r.awayId}`
        const isOpen = openKey === key
        const games = gamesFor(key, r)
        return (
          <div className="card result" key={key}>
            <div className="result-head">
              <span className="rw">Week {r.round}</span>
              {r.isUser && (
                <span className={youWon ? 'outcome win' : 'outcome loss'}>
                  {youWon ? 'WIN' : 'LOSS'}
                </span>
              )}
            </div>
            <div className="result-score">
              <span>{nameOf(r.homeId)}</span>
              <span className="rs">{r.aWins}–{r.bWins}</span>
              <span>{nameOf(r.awayId)}</span>
            </div>
            <div className="md-toggle-row">
              <button
                type="button"
                className="ghost"
                aria-expanded={isOpen}
                onClick={() => setOpenKey(isOpen ? null : key)}
              >
                {r.isUser ? 'Match detail →' : 'Details →'}
              </button>
            </div>
            {isOpen && (
              <MatchDetail
                round={r.round}
                homeId={r.homeId}
                awayId={r.awayId}
                aWins={r.aWins}
                bWins={r.bWins}
                userSide={r.userSide}
                games={games || []}
                onBack={() => setOpenKey(null)}
                state={state}
              />
            )}
            <details>
              <summary>Match log</summary>
              <ul className="log">
                {r.log.map((line, j) => (
                  <li key={j}>{line}</li>
                ))}
              </ul>
            </details>
          </div>
        )
      })}
    </div>
  )
}
