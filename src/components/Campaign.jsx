// ============================================================================
// Campaign — Faker's First LCK Win bracket path (per-game loss model).
// Each node = one Bo5 series = 5 ordered game slots. hardLossSlots auto-
// resolve as historical losses; every other slot is winnable and played via
// ONE simulateSeries call per press (reducer-side). Completed winnable slots
// re-render through the existing MatchDetail/recomputeGames path by adapting
// the stored entry ({detail, homeId, awayId}); historical slots have
// detail: null and render as static cards (never passed to recomputeGames).
// ============================================================================
import { useState } from 'react'
import { CAMPAIGN_SLOTS, campaignById } from '../game/useGameState.js'
import { getSeason } from '../data/seasons.js'
import MatchDetail, { recomputeGames } from './MatchDetail.jsx'

const REPLAY_ROLES = ['TOP', 'JNG', 'MID', 'BOT', 'SUP']

function startersOf(team) {
  return REPLAY_ROLES.map((role) => (team.players || []).find((p) => p.role === role)).filter(Boolean)
}

function SeasonReplay({ campaign, state, dispatch }) {
  const prog = state.campaign
  const season = getSeason(campaign.seasonYear)
  const byId = Object.fromEntries(season.teams.map((t) => [t.id, t]))
  const champ = byId[campaign.championId]
  const dash = (v) => (v === null || v === undefined ? '—' : String(v))
  const [open, setOpen] = useState({})

  if (!prog) {
    return (
      <div className="card">
        <h2>{campaign.title}</h2>
        <button type="button" onClick={() => dispatch({ type: 'QUIT_CAMPAIGN' })}>
          ← Back to menu
        </button>
      </div>
    )
  }

  if (prog.status === 'cleared') {
    return (
      <div className="stack">
        <div className="card">
          <p>{campaign.title} — replayed. History kept its order.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={() => dispatch({ type: 'RESTART_CAMPAIGN' })}>
              Replay again →
            </button>
            <button type="button" onClick={() => dispatch({ type: 'QUIT_CAMPAIGN' })}>
              Back to menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>{campaign.title}</h2>
        <p style={{ opacity: 0.8 }}>{season.label}</p>
        <p>{campaign.description}</p>
        <p>🏆 {champ ? champ.name : campaign.championId} — champions</p>
      </div>
      <div className="card">
        <h3>Final standings (locked — history decided)</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>W</th>
              <th>L</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {campaign.standings.map((row, i) => (
              <tr key={row.teamId}>
                <td>{i + 1}</td>
                <td>{byId[row.teamId] ? byId[row.teamId].name : row.teamId}</td>
                <td>{dash(row.wins)}</td>
                <td>{dash(row.losses)}</td>
                <td>{dash(row.pts)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h3>Rosters</h3>
        {season.teams.map((t) => (
          <div key={t.id} style={{ marginBottom: 8 }}>
            <button type="button" onClick={() => setOpen((o) => ({ ...o, [t.id]: !o[t.id] }))} aria-expanded={!!open[t.id]}>
              {t.name} {open[t.id] ? '▴' : '▾'}
            </button>
            {open[t.id] && (
              <ul>
                {startersOf(t).map((p) => (
                  <li key={p.id}>
                    {p.role}: {p.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => dispatch({ type: 'COMPLETE_SEASON_REPLAY' })}>
          Complete replay →
        </button>
        <button type="button" onClick={() => dispatch({ type: 'QUIT_CAMPAIGN' })}>
          ← Back to menu
        </button>
      </div>
    </div>
  )
}

function slotsOf(prog, nodeId) {
  const m = {}
  for (const r of prog.nodeResults) if (r.nodeId === nodeId) m[r.slot] = r
  return m
}

function SlotDetail({ entry, node, campaign, roundLabel }) {
  const [open, setOpen] = useState(false)
  if (entry.historicalLoss) {
    return (
      <div className="hint" style={{ margin: '4px 0' }}>
        🎞 Game {entry.slot}: historical loss (auto) — {campaign.playerLabel} fell to {node.opponentLabel}.
      </div>
    )
  }
  const adapted = { detail: entry.detail, homeId: entry.homeId, awayId: entry.awayId }
  return (
    <div style={{ margin: '4px 0' }}>
      <button type="button" className="ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
        {entry.playerWon ? '✅' : '❌'} Game {entry.slot}: {entry.playerWon ? 'WIN' : 'LOSS'}{' '}
        ({entry.aWins}–{entry.bWins}) {open ? '▴' : '▾'}
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          <p className="hint">
            Game {entry.slot} detail — {campaign.playerLabel} (You) vs {node.opponentLabel}
          </p>
          <MatchDetail
            round={roundLabel}
            homeId={entry.homeId}
            awayId={entry.awayId}
            aWins={entry.aWins}
            bWins={entry.bWins}
            userSide="home"
            games={recomputeGames(adapted) || []}
            onBack={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  )
}

function NodeCard({ campaign, prog, node, index, dispatch }) {
  const isCurrent = prog.status === 'active' && index === prog.nodeIndex
  const isCleared = prog.status === 'cleared' || index < prog.nodeIndex
  const isFailedHere = prog.status === 'failed' && prog.failedNodeId === node.id
  const played = slotsOf(prog, node.id)
  const nextSlot = Object.keys(played).length + 1
  const hardLosses = node.hardLossSlots || []
  const nextIsHard = hardLosses.includes(nextSlot)

  let badge
  if (isCleared) badge = <span className="outcome win">✔ CLEARED</span>
  else if (isFailedHere) badge = <span className="outcome loss">❌ FAILED HERE</span>
  else if (isCurrent) badge = <span className="outcome win">📍 NEXT</span>
  else badge = <span className="hint">⏳ UPCOMING</span>

  return (
    <div className="card">
      <div className="result-head">
        <span className="rw">
          {node.round} · {campaign.playerLabel} vs {node.opponentLabel}
        </span>
        {badge}
      </div>
      {node.blurb && <p className="hint">{node.blurb}</p>}
      <div>
        {Array.from({ length: CAMPAIGN_SLOTS }, (_, i) => i + 1).map((slot) => {
          const entry = played[slot]
          if (entry) {
            return (
              <SlotDetail
                key={slot}
                entry={entry}
                node={node}
                campaign={campaign}
                roundLabel={index + 1}
              />
            )
          }
          const isHard = hardLosses.includes(slot)
          const isNext = isCurrent && slot === nextSlot
          return (
            <div key={slot} className="hint" style={{ margin: '4px 0' }}>
              Game {slot}: {isHard ? '🎞 historical loss (auto)' : isNext ? '📍 to play' : '· to play'}
            </div>
          )
        })}
      </div>
      {isCurrent && nextSlot <= CAMPAIGN_SLOTS && (
        <button
          className="primary"
          style={{ marginTop: 8 }}
          onClick={() => dispatch({ type: 'PLAY_CAMPAIGN_NODE' })}
        >
          {nextIsHard ? 'Acknowledge historical result →' : `Play Game ${nextSlot} →`}
        </button>
      )}
    </div>
  )
}

export default function Campaign({ state, dispatch }) {
  const prog = state.campaign
  const campaign = prog ? campaignById(prog.campaignId) : null

  if (!prog || !campaign) {
    return (
      <div className="card">
        <h2>Campaign</h2>
        <p className="hint">No campaign in progress.</p>
        <button className="ghost" onClick={() => dispatch({ type: 'QUIT_CAMPAIGN' })}>
          ← Back to menu
        </button>
      </div>
    )
  }

  if (campaign && campaign.kind === 'season') return <SeasonReplay campaign={campaign} state={state} dispatch={dispatch} />

  if (prog.status === 'cleared') {
    return (
      <div className="stack">
        <div className="card">
          <h2>🏆 CAMPAIGN CLEARED</h2>
          <p>
            {campaign.playerLabel} walk the real path — {campaign.title}. Every winnable game won;
            history kept its losses.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="primary" onClick={() => dispatch({ type: 'RESTART_CAMPAIGN' })}>
              Play again →
            </button>
            <button className="ghost" onClick={() => dispatch({ type: 'QUIT_CAMPAIGN' })}>
              Back to menu
            </button>
          </div>
        </div>
        {campaign.nodes.map((node, i) => (
          <NodeCard key={node.id} campaign={campaign} prog={prog} node={node} index={i} dispatch={dispatch} />
        ))}
      </div>
    )
  }

  if (prog.status === 'failed') {
    const node = campaign.nodes.find((n) => n.id === prog.failedNodeId)
    return (
      <div className="stack">
        <div className="card">
          <h2>CAMPAIGN FAILED</h2>
          <p>
            {campaign.playerLabel} fell in {node ? `${node.round} Game ${prog.failedSlot} vs ${node.opponentLabel}` : 'this run'} —
            a winnable game was lost. Campaign over.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="primary" onClick={() => dispatch({ type: 'RETRY_CAMPAIGN_NODE' })}>
              Retry Game {prog.failedSlot} →
            </button>
            <button className="ghost" onClick={() => dispatch({ type: 'QUIT_CAMPAIGN' })}>
              Back to menu
            </button>
          </div>
        </div>
        {campaign.nodes.map((n, i) => (
          <NodeCard key={n.id} campaign={campaign} prog={prog} node={n} index={i} dispatch={dispatch} />
        ))}
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>{campaign.title}</h2>
        <p className="tag">{campaign.description}</p>
        <p className="hint">
          You are {campaign.playerLabel}. 🎞 games are historical losses (automatic). Win every
          other game — one winnable loss ends the run. Tune Lineup/Tactics between games.
        </p>
      </div>
      {campaign.nodes.map((node, i) => (
        <NodeCard key={node.id} campaign={campaign} prog={prog} node={node} index={i} dispatch={dispatch} />
      ))}
    </div>
  )
}
