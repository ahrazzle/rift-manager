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
import { Button, Card, Chip } from './ui/index.js'
import TeamCrest from './TeamCrest.jsx'

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
  const [teamId, setTeamId] = useState(campaign.championId || season.teams[0].id)
  const [opponentId, setOpponentId] = useState(season.teams.find((t) => t.id !== (campaign.championId || season.teams[0].id)).id)

  if (!prog) {
    return (
      <Card title={campaign.title}>
        <div className="cmp-actions">
          <Button onClick={() => dispatch({ type: 'QUIT_CAMPAIGN' })}>← Back to menu</Button>
        </div>
      </Card>
    )
  }

  if (prog.status === 'cleared') {
    return (
      <Card title="Replay complete">
        <p className="cmp-lede">{campaign.title}, replayed. History kept its order.</p>
        <div className="cmp-actions">
          <Button variant="primary" onClick={() => dispatch({ type: 'RESTART_CAMPAIGN' })}>Replay again →</Button>
          <Button variant="quiet" onClick={() => dispatch({ type: 'QUIT_CAMPAIGN' })}>Back to menu</Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="cmp-stack">
      <Card eyebrow={season.label} title={campaign.title}>
        <p className="cmp-lede">{campaign.description}</p>
        {champ && (
          <p className="cmp-champ">
            <Chip tone="gold" icon="star">Champions</Chip>
            <span className="cmp-team">
              <TeamCrest teamId={champ.id} name={champ.name} size={24} />
              <span className="cmp-team-name">{champ.name}</span>
            </span>
          </p>
        )}
      </Card>
      <Card title="Final standings" action={<Chip>Locked: history decided</Chip>}>
        <div className="cmp-table-wrap">
          <table className="cmp-table cmp-table--plain">
            <caption className="sr-only">Final standings of the replayed season</caption>
            <thead>
              <tr>
                <th scope="col" className="c-pos">#</th>
                <th scope="col" className="c-team">Team</th>
                <th scope="col" className="c-wl">W</th>
                <th scope="col" className="c-wl">L</th>
                <th scope="col" className="c-wl">Pts</th>
              </tr>
            </thead>
            <tbody>
              {campaign.standings.map((row, i) => {
                const name = byId[row.teamId] ? byId[row.teamId].name : row.teamId
                return (
                  <tr key={row.teamId} className="cmp-row">
                    <td className="c-pos">{i + 1}</td>
                    <th scope="row" className="c-team">
                      <span className="cmp-team">
                        <TeamCrest teamId={row.teamId} name={name} size={28} />
                        <span className="cmp-team-name">{name}</span>
                      </span>
                    </th>
                    <td className="c-wl">{dash(row.wins)}</td>
                    <td className="c-wl">{dash(row.losses)}</td>
                    <td className="c-wl">{dash(row.pts)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Play an exhibition">
        <p className="cmp-note">Take a historical roster onto the Rift with Draft, IGL or a map simulation. Practice results leave the recorded standings unchanged.</p>
        <div className="cmp-exhibition">
          <label className="cmp-pick">
            <TeamCrest teamId={teamId} name={byId[teamId]?.name} size={32} />
            <span className="cmp-pick-text">
              <span className="label">Your team</span>
              <select className="year-select" value={teamId} onChange={(e) => setTeamId(e.target.value)}>{season.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            </span>
          </label>
          <label className="cmp-pick">
            <TeamCrest teamId={opponentId} name={byId[opponentId]?.name} size={32} />
            <span className="cmp-pick-text">
              <span className="label">Opponent</span>
              <select className="year-select" value={opponentId} onChange={(e) => setOpponentId(e.target.value)}>{season.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            </span>
          </label>
        </div>
        <div className="cmp-actions">
          <Button variant="primary" disabled={teamId === opponentId} onClick={() => dispatch({ type: 'PREVIEW_MATCH', action: { type: 'PLAY_REPLAY_EXHIBITION', teamId, opponentId } })}>Enter exhibition →</Button>
        </div>
      </Card>
      <Card title="Rosters">
        <ul className="cmp-roster-list">
          {season.teams.map((t) => (
            <li key={t.id}>
              <Button variant="quiet" aria-expanded={!!open[t.id]} onClick={() => setOpen((o) => ({ ...o, [t.id]: !o[t.id] }))}>
                <TeamCrest teamId={t.id} name={t.name} size={24} />
                {t.name} {open[t.id] ? '▴' : '▾'}
              </Button>
              {open[t.id] && (
                <ul className="cmp-roster">
                  {startersOf(t).map((p) => (
                    <li key={p.id}><span className="label">{p.role}</span> {p.name}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </Card>
      <div className="cmp-actions">
        <Button variant="secondary" onClick={() => dispatch({ type: 'COMPLETE_SEASON_REPLAY' })}>Complete replay →</Button>
        <Button variant="quiet" onClick={() => dispatch({ type: 'QUIT_CAMPAIGN' })}>← Back to menu</Button>
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
  if (entry.historicalLoss && !entry.games) {
    return (
      <li className="cmp-slot">
        <Chip>Historical</Chip>
        <span>Game {entry.slot}: historical loss (auto). {campaign.playerLabel} fell to {node.opponentLabel}.</span>
      </li>
    )
  }
  const adapted = entry
  return (
    <li className="cmp-slot cmp-slot--played">
      <Button variant="quiet" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Chip tone={entry.playerWon ? 'win' : 'loss'}>{entry.playerWon ? 'Win' : 'Loss'}</Chip>
        Game {entry.slot} ({entry.aWins}–{entry.bWins}) {open ? '▴' : '▾'}
      </Button>
      {open && (
        <div className="cmp-slot-detail">
          <p className="cmp-note">
            Game {entry.slot} detail: {campaign.playerLabel} (You) vs {node.opponentLabel}
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
    </li>
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
  if (isCleared) badge = <Chip tone="win" icon="check">Cleared</Chip>
  else if (isFailedHere) badge = <Chip tone="loss" icon="alert">Failed here</Chip>
  else if (isCurrent) badge = <Chip tone="win" icon="play">Next</Chip>
  else badge = <Chip>Upcoming</Chip>

  return (
    <Card
      className={['cmp-node', isCurrent ? 'is-current' : ''].filter(Boolean).join(' ')}
      title={node.round}
      action={badge}
      aria-current={isCurrent ? 'step' : undefined}
    >
      <p className="cmp-node-vs">
        <span className="cmp-team">
          <TeamCrest teamId={campaign.playerTeamId} name={campaign.playerLabel} size={28} />
          <span className="cmp-team-name">{campaign.playerLabel}</span>
        </span>
        <span className="cmp-vs-small">vs</span>
        <span className="cmp-team">
          <TeamCrest teamId={node.opponentId} name={node.opponentLabel} size={28} />
          <span className="cmp-team-name">{node.opponentLabel}</span>
        </span>
      </p>
      {node.blurb && <p className="cmp-note">{node.blurb}</p>}
      <ul className="cmp-slots">
        {Array.from({ length: CAMPAIGN_SLOTS }, (_, i) => i + 1).map((slot) => {
          const entry = played[slot]
          if (entry) {
            return <SlotDetail key={slot} entry={entry} node={node} campaign={campaign} roundLabel={index + 1} />
          }
          const isHard = hardLosses.includes(slot)
          const isNext = isCurrent && slot === nextSlot
          return (
            <li key={slot} className="cmp-slot cmp-slot--todo">
              {isHard ? <Chip>Historical</Chip> : isNext ? <Chip icon="play">To play</Chip> : <Chip>Later</Chip>}
              <span>Game {slot}{isHard ? ': historical loss (auto)' : ''}</span>
            </li>
          )
        })}
      </ul>
      {isCurrent && nextSlot <= CAMPAIGN_SLOTS && (
        <div className="cmp-actions">
          <Button variant="primary" onClick={() => dispatch({ type: 'PREVIEW_MATCH', action: { type: 'PLAY_CAMPAIGN_NODE' } })}>
            {nextIsHard ? 'Enter historical game →' : `Play Game ${nextSlot} →`}
          </Button>
        </div>
      )}
    </Card>
  )
}

export default function Campaign({ state, dispatch }) {
  const prog = state.campaign
  const campaign = prog ? campaignById(prog.campaignId) : null

  if (!prog || !campaign) {
    return (
      <Card title="Scenario">
        <p className="cmp-lede">No scenario in progress.</p>
        <div className="cmp-actions">
          <Button onClick={() => dispatch({ type: 'QUIT_CAMPAIGN' })}>← Back to menu</Button>
        </div>
      </Card>
    )
  }

  if (campaign && campaign.kind === 'season') return <SeasonReplay campaign={campaign} state={state} dispatch={dispatch} />

  const nodes = campaign.nodes.map((node, i) => (
    <NodeCard key={node.id} campaign={campaign} prog={prog} node={node} index={i} dispatch={dispatch} />
  ))

  if (prog.status === 'cleared') {
    return (
      <div className="cmp-stack">
        <Card variant="hero" eyebrow="Scenario" title="Campaign cleared">
          <p className="cmp-lede">
            <Chip tone="gold" icon="star">Cleared</Chip>{' '}
            {campaign.playerLabel} walk the real path: {campaign.title}. Every winnable game won;
            history kept its losses.
          </p>
          <div className="cmp-actions">
            <Button variant="primary" onClick={() => dispatch({ type: 'RESTART_CAMPAIGN' })}>Play again →</Button>
            <Button variant="quiet" onClick={() => dispatch({ type: 'QUIT_CAMPAIGN' })}>Back to menu</Button>
          </div>
        </Card>
        {nodes}
      </div>
    )
  }

  if (prog.status === 'failed') {
    const node = campaign.nodes.find((n) => n.id === prog.failedNodeId)
    return (
      <div className="cmp-stack">
        <Card variant="hero" eyebrow="Scenario" title="Campaign failed">
          <p className="cmp-lede">
            {campaign.playerLabel} fell in {node ? `${node.round} Game ${prog.failedSlot} vs ${node.opponentLabel}` : 'this run'}:
            a winnable game was lost. Campaign over.
          </p>
          <div className="cmp-actions">
            <Button variant="primary" onClick={() => dispatch({ type: 'RETRY_CAMPAIGN_NODE' })}>Retry Game {prog.failedSlot} →</Button>
            <Button variant="quiet" onClick={() => dispatch({ type: 'QUIT_CAMPAIGN' })}>Back to menu</Button>
          </div>
        </Card>
        {nodes}
      </div>
    )
  }

  return (
    <div className="cmp-stack">
      <Card eyebrow="Scenario" title={campaign.title}>
        <p className="cmp-lede">{campaign.description}</p>
        <p className="cmp-note">
          You are {campaign.playerLabel}. Historical games are losses that play automatically. Win every
          other game: one winnable loss ends the run. Tune Lineup and Tactics between games.
        </p>
      </Card>
      {nodes}
    </div>
  )
}
