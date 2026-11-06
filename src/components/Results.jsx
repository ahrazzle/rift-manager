import { useMemo, useState } from 'react'
import { campaignById } from '../game/useGameState.js'
import MatchDetail, { recomputeGames } from './MatchDetail.jsx'
import { Button, Card, Chip, EmptyState, Seg } from './ui/index.js'
import TeamCrest from './TeamCrest.jsx'
import { resultItems, teamNameOf } from './compete/model.js'

/**
 * One series as a row: home crest + name, scoreline, away name + crest.
 * Winner reads in full text, loser in --text-2; your series carries the 3px
 * team bar, a "You" tag and a WIN or LOSS chip (words, not just color).
 */
function SeriesRow({ week, home, away, score, homeWon, you, youWon, historical, open, onToggle, toggleLabel, controls, children }) {
  return (
    <li className={['cmp-series', you ? 'is-you' : ''].filter(Boolean).join(' ')} {...(you ? { 'aria-current': 'true' } : {})}>
      {(week || you) && (
        <div className="cmp-series-top">
          {week && <span className="label">{week}</span>}
          {you && <span className="cmp-you-tag">You</span>}
          {historical ? <Chip>Historical</Chip> : you && <Chip tone={youWon ? 'win' : 'loss'}>{youWon ? 'Win' : 'Loss'}</Chip>}
        </div>
      )}
      <div className="cmp-series-score">
        <span className={`cmp-club home ${homeWon === true ? 'is-winner' : homeWon === false ? 'is-loser' : ''}`}>
          <span className="cmp-team-name">{home.name}</span>
          <TeamCrest teamId={home.teamId} name={home.name} size={32} />
        </span>
        <span className="cmp-score">{score}</span>
        <span className={`cmp-club away ${homeWon === false ? 'is-winner' : homeWon === true ? 'is-loser' : ''}`}>
          <TeamCrest teamId={away.teamId} name={away.name} size={32} />
          <span className="cmp-team-name">{away.name}</span>
        </span>
        <div className="cmp-series-actions">
          {onToggle && (
            <Button variant="quiet" aria-expanded={open} onClick={onToggle}>{toggleLabel}</Button>
          )}
          {controls}
        </div>
      </div>
      {children}
    </li>
  )
}

// Campaign-mode results: flat list of played slots (winnable slots expand
// via the same recomputeGames path; historical slots render statically).
function CampaignResults({ state }) {
  const [openKey, setOpenKey] = useState(null)
  const prog = state.campaign
  const campaign = prog ? campaignById(prog.campaignId) : null
  if (!prog || !campaign || prog.nodeResults.length === 0) {
    return <EmptyState title="No scenario games played yet">Play from the Scenario page and each game will be listed here.</EmptyState>
  }
  const nodeById = Object.fromEntries(campaign.nodes.map((n, i) => [n.id, { node: n, index: i }]))
  const ordered = [...prog.nodeResults].reverse()
  return (
    <ul className="cmp-series-list">
      {ordered.map((r) => {
        const { node, index } = nodeById[r.nodeId] || {}
        const key = `${r.nodeId}-${r.slot}`
        const isOpen = openKey === key
        const games = recomputeGames(r)
        return (
          <SeriesRow
            key={key}
            week={`${node ? node.round : r.nodeId} · Game ${r.slot}`}
            home={{ teamId: r.homeId, name: `${campaign.playerLabel}` }}
            away={{ teamId: r.awayId, name: node ? node.opponentLabel : r.awayId }}
            score={r.historicalLoss ? '0–1' : `${r.aWins}–${r.bWins}`}
            homeWon={r.historicalLoss ? false : !!r.playerWon}
            you
            youWon={!!r.playerWon}
            historical={!!r.historicalLoss}
            open={isOpen}
            onToggle={games ? () => setOpenKey(isOpen ? null : key) : null}
            toggleLabel="Match detail"
          >
            {isOpen && games && (
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
          </SeriesRow>
        )
      })}
    </ul>
  )
}

const FILTERS = [
  { id: 'all', label: 'All results' },
  { id: 'you', label: 'Your series' },
]

export default function Results({ state }) {
  const [openKey, setOpenKey] = useState(null)
  const [filter, setFilter] = useState('all')

  const items = useMemo(() => resultItems(state), [state.results])

  if (state.mode === 'campaign') return <CampaignResults state={state} />

  // Lazy: recompute a series' games only when its card is opened. Re-running
  // simulateSeries for every stored result on each render was the heaviest
  // page in the app.
  const gamesFor = (key, r) => {
    if (openKey !== key) return null
    try { return recomputeGames(r) } catch { return null }
  }

  if (state.results.length === 0) {
    return <EmptyState title="No matches played yet">Play a week from the Hub and every series will be listed here.</EmptyState>
  }

  const shown = filter === 'you' ? items.filter((it) => it.r.isUser) : items
  // Group by week, newest first (items are already newest first).
  const weeks = []
  for (const it of shown) {
    const last = weeks[weeks.length - 1]
    if (last && last.round === it.r.round) last.items.push(it)
    else weeks.push({ round: it.r.round, items: [it] })
  }
  // Your series first inside each week.
  for (const w of weeks) w.items.sort((a, b) => Number(!!b.r.isUser) - Number(!!a.r.isUser))

  return (
    <div className="cmp-results">
      <div className="cmp-results-bar">
        <Seg name="results-filter" label="Filter results" items={FILTERS} value={filter} onChange={setFilter} />
      </div>
      {weeks.length === 0 && <EmptyState>None of your series have been played yet.</EmptyState>}
      {weeks.map((w) => (
        <Card key={w.round} title={`Week ${w.round}`} className="cmp-week">
          <ul className="cmp-series-list">
            {w.items.map(({ r, key, youWon, homeWon }) => {
              const isOpen = openKey === key
              const games = gamesFor(key, r)
              return (
                <SeriesRow
                  key={key}
                  home={{ teamId: r.homeId, name: teamNameOf(state, r.homeId) }}
                  away={{ teamId: r.awayId, name: teamNameOf(state, r.awayId) }}
                  score={`${r.aWins}–${r.bWins}`}
                  homeWon={homeWon}
                  you={!!r.isUser}
                  youWon={youWon}
                  open={isOpen}
                  onToggle={() => setOpenKey(isOpen ? null : key)}
                  toggleLabel={r.isUser ? 'Match detail' : 'Details'}
                >
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
                  {isOpen && (r.log?.length ?? 0) > 0 && (
                    <details className="cmp-log">
                      <summary>Match log</summary>
                      <ul className="log">
                        {r.log.map((line, j) => <li key={j}>{line}</li>)}
                      </ul>
                    </details>
                  )}
                </SeriesRow>
              )
            })}
          </ul>
        </Card>
      ))}
    </div>
  )
}
