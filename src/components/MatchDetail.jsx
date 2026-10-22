// ============================================================================
// MatchDetail — per-game detail UI per docs/match-detail-design.md (STABLE).
// Recomputes games[] deterministically: results[] stores only a compact
// detail seed ({seed, homeLineup, awayLineup, homeTactic, awayTactic}), and
// recomputeGames() re-runs simulateSeries with mulberry32(seed) to get the
// identical games the live sim produced. No full timelines are persisted.
// Side mapping: engine side 'A' = home. When the user is away, "You" lookups
// use side 'B' and gold-diff sign is flipped so above-zero = you ahead.
// ============================================================================
import { useMemo, useState } from 'react'
import { simulateSeries } from '../engine/sim.js'
import { mulberry32 } from '../game/useGameState.js'
import { TEAMS } from '../data/lck.js'

const STATIC_NAME = Object.fromEntries(TEAMS.map((t) => [t.id, t.name]))

function nameOf(state, teamId) {
  return state?.teamMeta?.[teamId]?.name ?? STATIC_NAME[teamId] ?? teamId
}
const ROLE_ORDER = ['TOP', 'JNG', 'MID', 'BOT', 'SUP']

const EVENT_META = {
  tower: { icon: '■', color: '#eab308', label: 'Tower' },
  dragon: { icon: '◆', color: 'var(--good)', label: 'Dragon' },
  baron: { icon: '▲', color: '#a855f7', label: 'Baron' },
  teamfight: { icon: '✖', color: 'var(--accent)', label: 'Teamfight' },
  ace: { icon: '★', color: '#fff', label: 'Ace' },
  kill: { icon: '●', color: 'var(--muted)', label: 'Kill' },
}

// Re-run the stored series inputs to recover the identical games[].
export function recomputeGames(result) {
  const d = result?.detail
  if (!d || !d.homeLineup || !d.awayLineup) return null
  try {
    const res = simulateSeries(
      d.homeLineup, d.homeTactic || { style: 'BAL', phase: 'MID' },
      d.awayLineup, d.awayTactic || { style: 'BAL', phase: 'MID' },
      mulberry32(d.seed >>> 0),
      result.homeId, result.awayId,
      {
        aBonus: d.bonusA ?? 0, bBonus: d.bonusB ?? 0,
        aStrat: d.homeStrat ?? null, bStrat: d.awayStrat ?? null,
        bigMatch: d.bigMatch ?? false, fearless: d.fearless ?? false,
        // Tournament matches resolved under random/manual must recompute
        // under the same mode, or the detail can show a different winner.
        simMode: d.simMode ?? result.simMode ?? 'biased',
        forcedWinner: d.forcedWinner ?? result.forcedWinner ?? null,
      },
    )
    return res.games || null
  } catch {
    return null
  }
}

export function fmtGold(v) {
  const k = Math.abs(v) / 1000
  const sign = v < 0 ? '−' : '+'
  return `${sign}${k.toFixed(1)}k`
}

function avg(arr) {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

// --- Coach read (pure, §2.6) -------------------------------------------------
export function coachReadForGame(timeline, userWonGame, durationMin, youAreA) {
  const dur = Math.max(1, durationMin || 1)
  const pts = (timeline || []).map((p) => ({
    t: p.t,
    d: youAreA ? p.diff : -p.diff,
  }))
  const third = (lo, hi) => pts.filter((p) => p.t > lo && p.t <= hi).map((p) => p.d)
  const e = avg(third(0, dur / 3))
  const m = avg(third(dur / 3, (2 * dur) / 3))
  const l = avg(third((2 * dur) / 3, dur + 0.5))
  const a = avg(pts.map((p) => p.d))
  let text
  let style = 'Balanced'
  let phase = 'Mid'
  if (e > 1500 && m < -1000) {
    text = `Dominated early (${fmtGold(e)}) but bled mid (${fmtGold(m)}). Protect the mid rotation`
    style = 'Defensive'
    phase = 'Early'
  } else if (l > 2000 && userWonGame) {
    text = `Strong close (${fmtGold(l)} late). Trust the scaling plan`
    style = 'Balanced'
    phase = 'Late'
  } else if (e < -1500 && l > 0) {
    text = `Slow start (${fmtGold(e)} early) into a strong comeback (${fmtGold(l)} late). Trust scaling`
    style = 'Balanced'
    phase = 'Late'
  } else if (a < -1500 && !userWonGame) {
    text = `Out-golded all game (${fmtGold(a)} avg) in a loss. Nothing to force`
    style = 'Balanced'
    phase = 'Mid'
  } else if (e > 1000) {
    text = `Ahead early (${fmtGold(e)}). Keep pressing the lane phase`
    style = 'Aggressive'
    phase = 'Early'
  } else if (l > 1000) {
    text = `Ahead late (${fmtGold(l)}). Play for the late fights`
    style = 'Balanced'
    phase = 'Late'
  } else {
    text = 'Even gold, won on fights. Fine as-is'
    style = 'Balanced'
    phase = 'Mid'
  }
  return { text, style, phase }
}

// --- GoldGraph ----------------------------------------------------------------
function diffAt(timeline, t) {
  if (!timeline.length) return 0
  if (t <= timeline[0].t) return timeline[0].diff
  for (let i = 1; i < timeline.length; i++) {
    if (timeline[i].t >= t) {
      const a = timeline[i - 1]
      const b = timeline[i]
      const span = b.t - a.t || 1
      const f = (t - a.t) / span
      return a.diff + (b.diff - a.diff) * f
    }
  }
  return timeline[timeline.length - 1].diff
}

function GoldGraph({ timeline, events, durationMin, youAreA }) {
  const [hidden, setHidden] = useState(() => new Set())
  const dur = Math.max(1, durationMin || 1)
  const raw = useMemo(() => {
    let pts = (timeline || []).map((p) => ({ t: p.t, diff: youAreA ? p.diff : -p.diff }))
    if (pts.length > 200) {
      const stride = Math.ceil(pts.length / 200)
      pts = pts.filter((_, i) => i % stride === 0 || i === pts.length - 1)
    }
    return pts
  }, [timeline, youAreA])

  if (!raw || raw.length < 2) {
    return (
      <div className="md-block">
        <div className="md-block-title">Gold</div>
        <p className="hint">No gold data for this game.</p>
      </div>
    )
  }

  const W = 600
  const H = 220
  const PL = 46
  const PR = 12
  const PT = 10
  const PB = 26
  const pw = W - PL - PR
  const ph = H - PT - PB
  const maxAbs = Math.max(3000, ...raw.map((p) => Math.abs(p.diff)))
  const X = (t) => PL + (t / dur) * pw
  const Y = (d) => PT + ph / 2 - (d / maxAbs) * (ph / 2 - 4)
  const zeroY = PT + ph / 2

  const line = raw.map((p, i) => `${i === 0 ? 'M' : 'L'}${X(p.t).toFixed(1)},${Y(p.diff).toFixed(1)}`).join(' ')
  const areaTop = `${line} L${X(raw[raw.length - 1].t).toFixed(1)},${zeroY} L${X(raw[0].t).toFixed(1)},${zeroY} Z`
  const yLab = maxAbs >= 1000 ? `${(maxAbs / 1000).toFixed(maxAbs >= 9500 ? 0 : 1)}k` : `${Math.round(maxAbs)}`
  const xTicks = []
  for (let t = 0; t <= dur; t += 10) xTicks.push(t)
  if (xTicks[xTicks.length - 1] !== dur) xTicks.push(dur)

  const clipId = `mdclip-${Math.round(maxAbs)}-${dur}-${raw.length}`
  const visEvents = (events || []).filter((e) => !hidden.has(e.type))
  const toggle = (type) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const evShape = (e, i) => {
    const meta = EVENT_META[e.type] || EVENT_META.kill
    const cx = X(Math.min(Math.max(e.t, 0), dur))
    const cy = Y(Math.max(-maxAbs, Math.min(maxAbs, diffAt(raw, e.t))))
    const sideLabel = e.side === (youAreA ? 'A' : 'B') ? 'You' : 'Opp'
    const title = `${e.t}' ${meta.icon} ${meta.label} — ${sideLabel}: ${e.note}`
    const common = { key: i, className: 'md-marker' }
    const r = e.type === 'kill' ? 3 : 4
    if (e.type === 'dragon') {
      return (
        <g {...common}>
          <title>{title}</title>
          <rect x={cx - 4} y={cy - 4} width={8} height={8} transform={`rotate(45 ${cx} ${cy})`} fill={meta.color} stroke="#0b0e13" strokeWidth={1} />
          <rect x={cx - 12} y={cy - 12} width={24} height={24} fill="transparent" />
        </g>
      )
    }
    if (e.type === 'baron') {
      return (
        <g {...common}>
          <title>{title}</title>
          <polygon points={`${cx},${cy - 5} ${cx - 5},${cy + 4} ${cx + 5},${cy + 4}`} fill={meta.color} stroke="#0b0e13" strokeWidth={1} />
          <rect x={cx - 12} y={cy - 12} width={24} height={24} fill="transparent" />
        </g>
      )
    }
    if (e.type === 'tower') {
      return (
        <g {...common}>
          <title>{title}</title>
          <rect x={cx - 4} y={cy - 4} width={8} height={8} fill={meta.color} stroke="#0b0e13" strokeWidth={1} />
          <rect x={cx - 12} y={cy - 12} width={24} height={24} fill="transparent" />
        </g>
      )
    }
    return (
      <g {...common}>
        <title>{title}</title>
        <circle cx={cx} cy={cy} r={r} fill={meta.color} stroke="#0b0e13" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={12} fill="transparent" />
      </g>
    )
  }

  const last = raw[raw.length - 1]
  return (
    <div className="md-block">
      <div className="md-block-title">Gold</div>
      <svg className="md-gold" viewBox="0 0 600 220" role="img" aria-label="Gold difference graph">
        <defs>
          <clipPath id={`${clipId}-a`}>
            <rect x={PL} y={PT} width={pw} height={ph / 2} />
          </clipPath>
          <clipPath id={`${clipId}-b`}>
            <rect x={PL} y={zeroY} width={pw} height={ph / 2} />
          </clipPath>
        </defs>
        <line x1={PL} y1={zeroY} x2={W - PR} y2={zeroY} stroke="#3a4150" strokeWidth={1} strokeDasharray="5 4" />
        <path d={areaTop} fill="var(--good)" opacity={0.18} clipPath={`url(#${clipId}-a)`} />
        <path d={areaTop} fill="var(--bad)" opacity={0.18} clipPath={`url(#${clipId}-b)`} />
        <path d={line} fill="none" stroke="var(--good)" strokeWidth={2} clipPath={`url(#${clipId}-a)`} />
        <path d={line} fill="none" stroke="var(--bad)" strokeWidth={2} clipPath={`url(#${clipId}-b)`} />
        <text x={PL - 5} y={PT + 10} textAnchor="end" className="md-axis">+{yLab}</text>
        <text x={PL - 5} y={zeroY + 4} textAnchor="end" className="md-axis">0</text>
        <text x={PL - 5} y={PT + ph - 2} textAnchor="end" className="md-axis">−{yLab}</text>
        {xTicks.map((t) => (
          <text key={t} x={X(t)} y={H - 8} textAnchor="middle" className="md-axis">{t}&prime;</text>
        ))}
        <circle cx={X(last.t)} cy={Y(last.diff)} r={4} fill="var(--text)" stroke="#0b0e13" strokeWidth={1} />
        <text x={Math.min(X(last.t) - 6, W - PR - 52)} y={Y(last.diff) - 8} className="md-axis">{fmtGold(last.diff)}</text>
        {visEvents.map(evShape)}
      </svg>
      <div className="md-cap">Game time (min) · Gold diff (you − opp)</div>
      <div className="md-legend">
        <span className="md-lg"><i className="md-swatch good" /> You ahead (green)</span>
        <span className="md-lg"><i className="md-swatch bad" /> Behind (red)</span>
        <span className="md-lg"><i className="md-swatch even" /> - - even</span>
        {Object.keys(EVENT_META).map((type) => (
          <button
            key={type}
            type="button"
            className={hidden.has(type) ? 'md-chip off' : 'md-chip'}
            aria-pressed={!hidden.has(type)}
            onClick={() => toggle(type)}
          >
            {EVENT_META[type].icon} {EVENT_META[type].label}
          </button>
        ))}
      </div>
    </div>
  )
}

// --- PlayerPerformance --------------------------------------------------------
function ratingClass(r) {
  if (r >= 8) return 'var(--good)'
  if (r >= 6) return 'var(--warn)'
  return 'var(--muted)'
}

function PlayerCell({ p }) {
  if (!p) return <span className="md-missing">—</span>
  return (
    <div className="md-p">
      <div className="md-pname">
        {p.name} {p.mvp && <span className="md-mvp">★ <span className="badge">MVP</span></span>}
      </div>
      <div className="md-pnums">{p.kills}/{p.deaths}/{p.assists} · {p.cs}cs</div>
      <div className="md-pnums">DMG {Math.round((p.dmgShare || 0) * 100)}% · KP {Math.round((p.kp || 0) * 100)}%</div>
      <div className="md-rate">
        <span className="md-rbar"><span style={{ width: `${(p.rating || 0) * 10}%`, background: ratingClass(p.rating || 0) }} /></span>
        <span className="md-rnum">{(p.rating ?? 0).toFixed(1)}</span>
      </div>
    </div>
  )
}

function PlayerPerformance({ players, youAreA, youLabel, oppLabel }) {
  const youSide = youAreA ? 'A' : 'B'
  const oppSide = youAreA ? 'B' : 'A'
  const byRole = (side) => {
    const map = {}
    for (const p of players || []) if (p.side === side) map[p.role] = p
    return map
  }
  const you = byRole(youSide)
  const opp = byRole(oppSide)
  return (
    <div className="md-block">
      <div className="md-block-title">Players</div>
      <table className="table md-ptable">
        <thead>
          <tr>
            <th>Role</th>
            <th className="md-youhead">{youLabel} — KDA CS DMG KP Rating</th>
            <th>{oppLabel} — KDA CS DMG KP Rating</th>
          </tr>
        </thead>
        <tbody>
          {ROLE_ORDER.map((role) => (
            <tr key={role}>
              <td className="md-role">{role}</td>
              <td className="md-youcell"><PlayerCell p={you[role]} /></td>
              <td><PlayerCell p={opp[role]} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="md-pstack">
        <h4>Your team (by role)</h4>
        <table className="table">
          <tbody>
            {ROLE_ORDER.map((role) => (
              <tr key={role}>
                <td className="md-role">{role}</td>
                <td><PlayerCell p={you[role]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <h4>Opponent (by role)</h4>
        <table className="table">
          <tbody>
            {ROLE_ORDER.map((role) => (
              <tr key={role}>
                <td className="md-role">{role}</td>
                <td><PlayerCell p={opp[role]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- EventList -----------------------------------------------------------------
function EventList({ events, youAreA }) {
  const sorted = [...(events || [])].sort((a, b) => a.t - b.t)
  if (sorted.length === 0) {
    return (
      <div className="md-block">
        <div className="md-block-title">Events</div>
        <p className="hint">No events logged.</p>
      </div>
    )
  }
  return (
    <div className="md-block">
      <div className="md-block-title">Events</div>
      <ul className="log">
        {sorted.map((e, i) => {
          const meta = EVENT_META[e.type] || EVENT_META.kill
          const who = e.side === (youAreA ? 'A' : 'B') ? 'You' : 'Opp'
          return (
            <li key={i}>
              <span className="md-evicon" style={{ color: meta.color === 'var(--good)' || meta.color === 'var(--accent)' || meta.color === 'var(--muted)' ? meta.color : meta.color }}>
                {e.t}&prime; {meta.icon} {meta.label}
              </span>{' '}
              — {who} — {e.note}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// --- CoachRead ------------------------------------------------------------------
function CoachRead({ game, youAreA }) {
  const userWonGame = game.winner === (youAreA ? 'A' : 'B')
  const read = coachReadForGame(game.goldTimeline || [], userWonGame, game.durationMin, youAreA)
  return (
    <div className="md-block md-coach">
      <div className="md-block-title">Coach read</div>
      <p>
        {read.text}. Consider <span className="tac-mult">{read.style} style · {read.phase}-game focus</span> next time out.
      </p>
    </div>
  )
}

// --- GameCard --------------------------------------------------------------------
function GameCard({ game, youAreA, youLabel, oppLabel, showCoach, anchorId }) {
  const userWonGame = game.winner === (youAreA ? 'A' : 'B')
  const durLabel = game.durationMin > 0 ? `${game.durationMin} min` : '– min'
  const dispAvg = avg((game.goldTimeline || []).map((p) => (youAreA ? p.diff : -p.diff)))
  const winnerName = game.winner === 'A'
    ? (youAreA ? youLabel : oppLabel)
    : (youAreA ? oppLabel : youLabel)
  const reveals = (game.log || []).filter((l) => typeof l === 'string' && l.includes('reveals'))
  return (
    <section className="md-game" id={anchorId}>
      <div className="md-gamehead">
        <span className="md-gametitle">Game {game.game}</span>
        {showCoach ? (
          <span className={userWonGame ? 'outcome win' : 'outcome loss'}>{userWonGame ? 'WIN' : 'LOSS'}</span>
        ) : (
          <span className="md-wtag">{winnerName}</span>
        )}
        <span className="md-dur">{durLabel}</span>
        {(game.goldTimeline || []).length >= 2 && (
          <span className="md-avg">You {fmtGold(dispAvg)} avg</span>
        )}
      </div>
      {reveals.length > 0 && (
        <div className="md-reveals">
          {reveals.map((r, i) => (
            <span key={i} className="trait-badge">⚡ {r}</span>
          ))}
        </div>
      )}
      <GoldGraph timeline={game.goldTimeline} events={game.events} durationMin={game.durationMin} youAreA={youAreA} />
      <PlayerPerformance players={game.players} youAreA={youAreA} youLabel={youLabel} oppLabel={oppLabel} />
      <EventList events={game.events} youAreA={youAreA} />
      {showCoach && <CoachRead game={game} youAreA={youAreA} />}
    </section>
  )
}

// --- MatchDetail --------------------------------------------------------------------
export default function MatchDetail({ round, homeId, awayId, aWins, bWins, userSide, games, onBack, state }) {
  const isUser = userSide != null
  const youAreA = userSide !== 'away'
  const youWonSeries = isUser ? (youAreA ? aWins > bWins : bWins > aWins) : null
  const youLabel = isUser ? `You (${nameOf(state, youAreA ? homeId : awayId)})` : nameOf(state, homeId)
  const oppLabel = isUser ? nameOf(state, youAreA ? awayId : homeId) : nameOf(state, awayId)
  const homeLabel = isUser ? (youAreA ? youLabel : oppLabel) : nameOf(state, homeId)
  const awayLabel = isUser ? (youAreA ? oppLabel : youLabel) : nameOf(state, awayId)
  const ordered = [...(games || [])].sort((a, b) => b.game - a.game)

  return (
    <div className="card md">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
        <div className="md-series" style={{ margin: 0 }}>
          <span className="rw">Week {round} · {homeLabel} {aWins}–{bWins} {awayLabel}</span>
          {isUser && (
            <span className={youWonSeries ? 'outcome win' : 'outcome loss'}>{youWonSeries ? 'WIN' : 'LOSS'}</span>
          )}
        </div>
        <button type="button" className="ghost" onClick={onBack}>← Back</button>
      </div>
      {(!games || games.length === 0) ? (
        <p className="hint">No game data recorded for this series.</p>
      ) : (
        <>
          <div className="md-gamesline">
            Games: {[...games].sort((a, b) => a.game - b.game).map((g) => {
              const w = isUser ? g.winner === (youAreA ? 'A' : 'B') : null
              const d = g.durationMin > 0 ? `${g.durationMin}m` : '–'
              return <span key={g.game} className="md-gchip">({g.game}) {isUser ? (w ? 'W' : 'L') : (g.winner === 'A' ? homeLabel : awayLabel)} {d}</span>
            }).reduce((acc, el, i) => (i === 0 ? [el] : [...acc, ' · ', el]), [])}
          </div>
          <div className="tabs" role="navigation" aria-label="Games">
            {ordered.map((g) => (
              <a key={g.game} className="tab" href={`#md-g${round}-${homeId}-${awayId}-${g.game}`}>G{g.game}</a>
            ))}
          </div>
          {ordered.map((g) => (
            <GameCard
              key={g.game}
              game={g}
              youAreA={youAreA}
              youLabel={isUser ? youLabel : homeLabel}
              oppLabel={isUser ? oppLabel : awayLabel}
              showCoach={isUser}
              anchorId={`md-g${round}-${homeId}-${awayId}-${g.game}`}
            />
          ))}
        </>
      )}
    </div>
  )
}
