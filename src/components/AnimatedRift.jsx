import { useEffect, useId, useRef, useState } from 'react'
import terrain from '../assets/rift-terrain.webp'
import MatchIcon from './MatchIcon.jsx'
import { BASES, LANES, mapSnapshot, eventLocation, playbackLimit, physicalSide } from '../game/mapSimulation.js'
import { iglCallById } from '../game/igl.js'
import { CHAMP_BY_ID } from '../data/champions.js'
import { readMapDisplay, writeMapDisplay, playerIdentity } from '../game/mapDisplay.js'

const COLORS = { A: '#66dbff', B: '#ff8a87' }
const RATE = { slow: 0.35, normal: 0.8, fast: 2.4, instant: 1000 }
const factIcon = (type) =>
  ['kill', 'teamfight', 'ace', 'tower', 'dragon', 'baron'].includes(type) ? type : 'nexus'

function MapMarker({ player: p, game, display, color, clipId }) {
  const identity = playerIdentity(game, p, display)
  const [failedPortrait, setFailedPortrait] = useState(null)
  const blue = physicalSide(game, p.side) === 'A'
  const portrait = identity.portrait && failedPortrait !== identity.portrait && !p.dead
  const glyph = p.dead ? '×' : display.portraits === 'players' ? identity.initials : ''
  return (
    <g
      className="rift-player"
      data-player={p.name}
      style={{
        transform: `translate(${p.point[0].toFixed(2)}px, ${p.point[1].toFixed(2)}px)`,
        opacity: p.dead ? 0.35 : 1,
      }}
    >
      <title>
        {p.name}
        {identity.champion ? ` · ${identity.champion.name}` : ''} · {p.role} · {p.kills}/{p.deaths} · {p.activity}
      </title>
      <defs>
        <clipPath id={clipId}>
          {blue ? <circle r="2.2" /> : <rect x="-2.2" y="-2.2" width="4.4" height="4.4" rx=".5" />}
        </clipPath>
      </defs>
      {blue ? (
        <circle r="2.4" fill="#103c50" stroke={color} strokeWidth=".5" />
      ) : (
        <rect x="-2.3" y="-2.3" width="4.6" height="4.6" rx=".5" fill="#4c2631" stroke={color} strokeWidth=".5" />
      )}
      {!p.dead && display.portraits !== 'players' && !portrait && (
        <g transform="translate(-1.45 -1.45)" color={color}>
          <MatchIcon name={p.role} size={2.9} />
        </g>
      )}
      <text
        y=".85"
        textAnchor="middle"
        fill={color}
        fontSize={display.portraits === 'players' && !p.dead ? '1.8' : '2.8'}
        fontWeight="800"
      >
        {glyph}
      </text>
      {portrait && (
        <image
          href={identity.portrait}
          x="-2.2"
          y="-2.2"
          width="4.4"
          height="4.4"
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          onError={() => setFailedPortrait(identity.portrait)}
        />
      )}
      {identity.label && (
        <text
          className="rift-player-label"
          y="4.5"
          textAnchor="middle"
          fill="#edf7f6"
          fontSize="1.75"
          stroke="#0a2028"
          strokeWidth=".65"
          paintOrder="stroke"
        >
          {identity.label}
        </text>
      )}
    </g>
  )
}
export function clockLabel(minute) {
  return `${Math.floor(minute)}:${String(Math.floor((minute % 1) * 60)).padStart(2, '0')}`
}

export default function AnimatedRift({
  game,
  homeName,
  awayName,
  initialTime = 0,
  speed = 'normal',
  decisionAt,
  callMade = false,
  decision = false,
  onCheckpoint,
  onComplete,
  onCursor,
  onSpeedChange,
  decisionPanel,
  seriesLabel,
  homeWins = 0,
  awayWins = 0,
}) {
  const id = useId().replace(/:/g, '')
  const [time, setTime] = useState(initialTime)
  const [display, setDisplay] = useState(readMapDisplay)
  const changeDisplay = (key, value) => {
    const next = { ...display, [key]: value }
    setDisplay(next)
    writeMapDisplay(next)
  }
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )
  const [paused, setPaused] = useState(reducedMotion)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [impact, setImpact] = useState(null)
  const previousTime = useRef(initialTime)
  const seeking = useRef(false)
  const callbacks = useRef({})
  callbacks.current = { onCheckpoint, onComplete, onCursor }
  const limit = playbackLimit(game, decisionAt, callMade)
  const lastSave = useRef(initialTime)
  useEffect(() => {
    if (paused || decision || time >= limit) return
    const timer = setInterval(() => setTime((t) => Math.min(limit, t + (RATE[speed] ?? RATE.normal) * 0.1)), 100)
    return () => clearInterval(timer)
  }, [paused, decision, speed, limit, time >= limit])
  useEffect(() => {
    if (time >= limit) {
      if (decisionAt != null && !callMade) callbacks.current.onCheckpoint?.()
      else callbacks.current.onComplete?.()
    }
    if (Math.abs(time - lastSave.current) >= 2) {
      lastSave.current = time
      callbacks.current.onCursor?.(time)
    }
  }, [time, limit, decisionAt, callMade])
  const snapshot = mapSnapshot(game, time)
  const seek = (t) => {
    const next = Math.min(limit, Math.max(0, t))
    seeking.current = true
    setImpact(null)
    setTime(next)
    lastSave.current = next
    callbacks.current.onCursor?.(next)
  }
  const color = (side) => COLORS[physicalSide(game, side)]
  const blueName = game.blueSide === 'B' ? awayName : homeName
  const redName = game.blueSide === 'B' ? homeName : awayName
  const recent = snapshot.events.slice(-5).reverse()
  useEffect(() => {
    const previous = previousTime.current
    previousTime.current = time
    if (seeking.current) {
      seeking.current = false
      return
    }
    if (paused || decision || reducedMotion || time <= previous || time - previous > 0.5) return
    const crossed = game.events
      .filter(
        (event) =>
          event.t > previous && event.t <= time && ['kill', 'tower', 'dragon', 'baron'].includes(event.type),
      )
      .at(-1)
    if (crossed) setImpact(crossed)
  }, [time, paused, decision, reducedMotion, game])
  useEffect(() => {
    if (!impact || paused || decision) return
    const timer = setTimeout(() => setImpact(null), 850)
    return () => clearTimeout(timer)
  }, [impact, paused, decision])
  const burst = impact
    ? eventLocation(
        impact,
        impact.type === 'tower'
          ? snapshot.events.filter((e) => e.type === 'tower' && e.side === impact.side).length - 1
          : game.events.indexOf(impact),
        game,
      )
    : null
  const call = game.coachingCall && time >= game.coachingCall.at ? iglCallById(game.coachingCall.id) : null
  return (
    <section
      className={`rift-view rift-arena ${paused || decision ? 'is-paused' : ''} ${reducedMotion ? 'reduce-motion' : ''}`}
      aria-label="Animated match simulation"
    >
      <div className="rift-broadcast-label">
        <span>
          <i /> {seriesLabel || 'MATCH SIMULATION'}
        </span>
        <span>
          GAME {game.game} ·{' '}
          {decision ? 'TACTICAL PAUSE' : snapshot.ended ? 'FINAL' : paused ? 'PAUSED' : 'ON AIR'}
        </span>
      </div>
      <div className="rift-scoreboard">
        {['A', 'B'].map((physical) => {
          const side = game.blueSide === 'B' ? (physical === 'A' ? 'B' : 'A') : physical
          const stats = snapshot.sides[side]
          return (
            <div key={side} className={`rift-score side-${physical}`}>
              <span className="eyebrow">
                {physical === 'A' ? 'Blue side' : 'Red side'} · Games won {side === 'A' ? homeWins : awayWins}
              </span>
              <div>
                <strong>{side === 'A' ? homeName : awayName}</strong>
                <span className="rift-kill-score">
                  <b aria-label={`${stats.kills} kills`}>{stats.kills}</b>
                  <small>KILLS</small>
                </span>
              </div>
              <span className="rift-objective-score">
                {[
                  ['tower', stats.towers],
                  ['dragon', stats.dragons],
                  ['baron', stats.barons],
                ].map(([icon, value]) => (
                  <span key={icon} title={`${value} ${icon}s`}>
                    <MatchIcon name={icon} size={13} />
                    {value}
                    <span className="sr-only"> {icon}s</span>
                  </span>
                ))}
              </span>
            </div>
          )
        })}
        <div className="rift-clock">
          <span className="rift-clock-label">
            <MatchIcon name="clock" size={12} /> GAME TIME
          </span>
          <strong>{clockLabel(time)}</strong>
          <small>
            <MatchIcon name="gold" size={12} />{' '}
            {Math.abs(snapshot.gold) < 100
              ? 'Gold even'
              : `${snapshot.gold > 0 ? homeName : awayName} +${(Math.abs(snapshot.gold) / 1000).toFixed(1)}k gold`}
          </small>
        </div>
      </div>
      <div className={`rift-layout${decision ? ' rift-layout--decision' : ''}`}>
        <div className="rift-map-wrap">
          <svg className="rift-map" viewBox="0 0 100 100" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
            <title id={`${id}-title`}>Rift map at {clockLabel(time)}</title>
            <desc id={`${id}-desc`}>
              Ten player icons move between three lanes, jungle and objective pits. Blue circles represent{' '}
              {blueName}; red squares represent {redName}. This is a stylized illustration of simulated events.
            </desc>
            <defs>
              <linearGradient id={`${id}-pit`} x2="0" y2="1">
                <stop stopColor="#13263d" />
                <stop offset="1" stopColor="#07111e" />
              </linearGradient>
            </defs>
            <image href={terrain} x="0" y="0" width="100" height="100" preserveAspectRatio="none" />
            <rect width="100" height="100" fill="#071323" opacity=".12" />
            {Object.entries(LANES).map(([lane, path]) => (
              <g key={lane}>
                <polyline
                  points={path.map((p) => p.join(',')).join(' ')}
                  fill="none"
                  stroke="#bbd0d8"
                  strokeWidth="2.5"
                  opacity=".09"
                  strokeLinejoin="round"
                />
                <polyline
                  points={path.map((p) => p.join(',')).join(' ')}
                  fill="none"
                  stroke="#c5e2ed"
                  strokeWidth=".18"
                  opacity=".32"
                  strokeLinejoin="round"
                />
              </g>
            ))}
            {Object.entries(BASES).map(([side, [x, y]]) => (
              <g key={side} opacity={snapshot.ended && physicalSide(game, game.winner) !== side ? 0.25 : 1}>
                <circle
                  cx={x}
                  cy={y}
                  r="6.5"
                  fill={COLORS[side]}
                  opacity=".09"
                  stroke={COLORS[side]}
                  strokeWidth=".6"
                />
                <path
                  d={`M${x} ${y - 4}l3 3.5v2l-3 3.5 -3 -3.5v-2z`}
                  fill="#0b2134"
                  stroke={COLORS[side]}
                  strokeWidth=".4"
                />
                <path d={`M${x} ${y - 3.2}l2.1 2.6 -2.1 2.7 -2.1 -2.7z`} fill={COLORS[side]} />
                <path d={`M${x} ${y - 3.2}v5.3l-2.1 -2.7z`} fill="#fff" opacity=".35" />
                <text x={x} y={y + 10} textAnchor="middle" fill={COLORS[side]} fontSize="2">
                  NEXUS
                </text>
              </g>
            ))}
            {snapshot.towers.map(({ id: towerId, point: [x, y], side, alive }) => (
              <g key={towerId} opacity={alive ? 0.9 : 0.16}>
                <ellipse cx={x} cy={y + 1.4} rx="2" ry=".8" fill="#020a13" opacity=".8" />
                <path
                  d={`M${x - 1.2} ${y + 1.1}v-2.8l1.2 -.8 1.2 .8v2.8l-1.2 .7z`}
                  fill={alive ? color(side) : '#a2aaad'}
                  stroke="#071323"
                  strokeWidth=".3"
                />
                <path d={`M${x} ${y - 2.5}v4.3l1.2 -.7v-2.8z`} fill="#071323" opacity=".5" />
                {!alive && <path d={`M${x - 1.5} ${y - 1.5}l3 3m0 -3l-3 3`} stroke="#a2aaad" strokeWidth=".4" />}
              </g>
            ))}
            {snapshot.objectives.map(({ id: objective, point: [x, y], alive, nextSpawn }) => (
              <g key={objective}>
                <circle
                  cx={x}
                  cy={y}
                  r="5"
                  fill={`url(#${id}-pit)`}
                  stroke={objective === 'dragon' ? '#eec581' : '#c3a2ff'}
                  strokeWidth=".5"
                  opacity={alive ? 1 : 0.35}
                />
                <g
                  transform={`translate(${x - 2.4} ${y - 2.4})`}
                  color={objective === 'dragon' ? '#ffd18a' : '#d2b5ff'}
                  opacity={alive ? 1 : 0.25}
                >
                  <MatchIcon name={objective} size={4.8} />
                </g>
                <text x={x} y={y + 7} textAnchor="middle" fill="#c3d4d3" fontSize="1.8">
                  {objective.toUpperCase()}
                  {alive ? '' : ` · ${clockLabel(nextSpawn)}`}
                </text>
              </g>
            ))}
            {burst && (
              <circle
                key={`${impact.t}-${impact.type}`}
                className="rift-burst"
                cx={burst[0]}
                cy={burst[1]}
                r="6"
                fill="none"
                stroke={
                  impact.type === 'dragon' ? '#f3bd62' : impact.type === 'baron' ? '#b99aff' : color(impact.side)
                }
                strokeWidth=".7"
              />
            )}
            {snapshot.players.map((p, index) => (
              <MapMarker
                key={`${p.side}-${p.role}`}
                player={p}
                game={game}
                display={display}
                color={color(p.side)}
                clipId={`${id}-portrait-${index}`}
              />
            ))}
          </svg>
          {impact && !decision && (
            <div
              className="rift-impact-callout"
              key={`${impact.t}-${impact.type}`}
              style={{
                '--impact-color':
                  impact.type === 'dragon' ? '#f3bd62' : impact.type === 'baron' ? '#b99aff' : color(impact.side),
              }}
            >
              <MatchIcon name={factIcon(impact.type)} size={24} />
              <div>
                <span>
                  {impact.type === 'kill'
                    ? game.events.find((e) => e.type === 'kill') === impact
                      ? 'FIRST BLOOD'
                      : 'ELIMINATION'
                    : impact.type === 'tower'
                      ? 'TOWER DESTROYED'
                      : `${impact.type.toUpperCase()} SECURED`}
                </span>
                <strong>
                  {impact.killer || (impact.side === 'A' ? homeName : awayName)}
                  {impact.victim ? ` → ${impact.victim}` : ''}
                </strong>
              </div>
              <time>{clockLabel(impact.t)}</time>
            </div>
          )}
          {decision && (
            <div className="rift-map-status" role="status">
              TACTICAL PAUSE · YOUR CALL
            </div>
          )}
          {!decision && call && <div className="rift-map-status rift-call">{call.label}</div>}
        </div>
        <aside className={`rift-sidebar ${decisionPanel ? 'rift-coaching' : ''}`}>
          {decisionPanel || (
            <>
              <h3>
                <MatchIcon name="kill" size={14} /> PLAYER TRACKER
              </h3>
              {['A', 'B'].map((side) => (
                <div className={`rift-roster side-${physicalSide(game, side)}`} key={side}>
                  <h4>{side === 'A' ? homeName : awayName}</h4>
                  {snapshot.players
                    .filter((p) => p.side === side)
                    .map((p) => (
                      <div key={p.name} className={p.dead ? 'respawning' : ''}>
                        <span className="rift-role" title={p.role}>
                          <MatchIcon name={p.role} size={15} />
                        </span>
                        <span>
                          <strong>{p.name}</strong>
                          <small>
                            {p.role}
                            {game.picks?.[side]?.[p.role]
                              ? ` · ${CHAMP_BY_ID[game.picks[side][p.role]]?.name || ''}`
                              : ''}
                            {p.dead ? ' · respawning' : ''}
                          </small>
                        </span>
                        <b>
                          {p.kills}/{p.deaths}
                        </b>
                      </div>
                    ))}
                </div>
              ))}
              <div className="rift-feed">
                <h4>PLAY BY PLAY</h4>
                {!recent.length && <p className="hint">Teams leave base. Lanes are forming.</p>}
                {recent.map((e, i) => (
                  <p key={`${e.t}-${i}`}>
                    <span className="rift-feed-icon" style={{ color: color(e.side) }}>
                      <MatchIcon name={factIcon(e.type)} size={14} />
                    </span>
                    <time>{clockLabel(e.t)}</time>
                    <span style={{ color: color(e.side) }}>
                      {e.killer
                        ? `${e.killer} → ${e.victim}`
                        : `${e.side === 'A' ? homeName : awayName} · ${e.type}`}
                    </span>
                  </p>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>
      <div className="rift-controls">
        <button
          type="button"
          className="ghost rift-playback-toggle"
          disabled={decision}
          onClick={() => {
            setPaused(!paused)
            callbacks.current.onCursor?.(time)
          }}
        >
          <MatchIcon name={paused ? 'play' : 'pause'} size={16} />
          {paused ? 'Play' : 'Pause'}
        </button>
        <label className="rift-seek">
          <span className="sr-only">Match timeline</span>
          <input
            type="range"
            min="0"
            max={limit}
            step="0.1"
            value={Math.min(time, limit)}
            disabled={decision}
            onChange={(e) => seek(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          className="ghost"
          disabled={decision}
          onClick={() => seek(game.events.find((e) => e.t > time + 0.01)?.t ?? limit)}
        >
          <MatchIcon name="skip" size={14} />
          Next event
        </button>
        <button type="button" className="ghost" disabled={decision} onClick={() => seek(limit)}>
          {decisionAt != null && !callMade ? 'Jump to call' : 'Finish game'}
        </button>
        <label className="rift-speed">
          <span className="sr-only">Playback speed</span>
          <select value={speed} onChange={(e) => onSpeedChange?.(e.target.value)}>
            {Object.keys(RATE).map((s) => (
              <option key={s} value={s}>
                {s === 'instant' ? 'Instant' : s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="ghost rift-settings"
          aria-label="Map display"
          aria-expanded={settingsOpen}
          aria-controls={`${id}-display`}
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <MatchIcon name="settings" size={14} />
          <span>Display</span>
        </button>
      </div>
      <fieldset id={`${id}-display`} className="rift-display-controls" hidden={!settingsOpen}>
        <legend className="sr-only">Map display</legend>
        <label>
          Names{' '}
          <select
            aria-label="Names"
            value={display.names}
            onChange={(e) => changeDisplay('names', e.target.value)}
          >
            <option value="players">Players</option>
            <option value="champions">Champions</option>
            <option value="both">Players + champions</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
        <label>
          Portraits{' '}
          <select
            aria-label="Portraits"
            value={display.portraits}
            onChange={(e) => changeDisplay('portraits', e.target.value)}
          >
            <option value="roles">Role icons</option>
            <option value="players">Player initials</option>
            <option value="champions">Champions</option>
          </select>
        </label>
        {!game.picks &&
          (display.names === 'champions' || display.names === 'both' || display.portraits === 'champions') && (
            <span className="hint">Champion names and portraits appear after a draft.</span>
          )}
      </fieldset>
      <p className="hint rift-caption">
        Illustrative simulation · Positions follow recorded events and calls. Blue circles / red squares identify
        teams.
      </p>
    </section>
  )
}
