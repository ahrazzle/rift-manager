import { useEffect, useId, useRef, useState } from 'react'
import { BASES, LANES, mapSnapshot, eventLocation, playbackLimit, physicalSide } from '../game/mapSimulation.js'
import { iglCallById } from '../game/igl.js'
import { CHAMP_BY_ID } from '../data/champions.js'

const COLORS = { A: '#66dbff', B: '#ff8a87' }
const RATE = { slow: 0.35, normal: 0.8, fast: 2.4, instant: 1000 }
const ROLE_GLYPH = { TOP: '◆', JNG: '✦', MID: '✧', BOT: '⊕', SUP: '+' }
export function clockLabel(minute) {
  return `${Math.floor(minute)}:${String(Math.floor((minute % 1) * 60)).padStart(2, '0')}`
}

export default function AnimatedRift({ game, homeName, awayName, initialTime = 0, speed = 'normal', decisionAt, callMade = false, decision = false,
  onCheckpoint, onComplete, onCursor, onSpeedChange, decisionPanel }) {
  const id = useId().replace(/:/g, '')
  const [time, setTime] = useState(initialTime)
  const [paused, setPaused] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
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
    setTime(next); lastSave.current = next; callbacks.current.onCursor?.(next)
  }
  const color = (side) => COLORS[physicalSide(game, side)]
  const blueName = game.blueSide === 'B' ? awayName : homeName
  const redName = game.blueSide === 'B' ? homeName : awayName
  const recent = snapshot.events.slice(-5).reverse()
  const latest = snapshot.events.at(-1)
  const burst = latest && time - latest.t < 0.7 ? eventLocation(latest, latest.type === 'tower' ? snapshot.events.filter((e) => e.type === 'tower' && e.side === latest.side).length - 1 : game.events.indexOf(latest), game) : null
  const call = game.coachingCall && time >= game.coachingCall.at ? iglCallById(game.coachingCall.id) : null
  return <section className="rift-view" aria-label="Animated match simulation">
    <div className="rift-scoreboard">
      {['A', 'B'].map((side) => <div key={side} className={`rift-score side-${physicalSide(game, side)}`}>
        <span className="eyebrow">{physicalSide(game, side) === 'A' ? 'Blue side · circle' : 'Red side · square'}</span>
        <div><strong>{side === 'A' ? homeName : awayName}</strong><b>{snapshot.sides[side].kills}</b></div>
        <span className="rift-objective-score">{snapshot.sides[side].towers} towers · {snapshot.sides[side].dragons} dragons · {snapshot.sides[side].barons} barons</span>
      </div>)}
      <div className="rift-clock"><strong>{clockLabel(time)}</strong><span>Game {game.game}</span><small>{Math.abs(snapshot.gold) < 100 ? 'Gold even' : `${snapshot.gold > 0 ? homeName : awayName} +${(Math.abs(snapshot.gold) / 1000).toFixed(1)}k gold`}</small></div>
    </div>
    <div className="rift-layout"><div className="rift-map-wrap">
      <svg className="rift-map" viewBox="0 0 100 100" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
        <title id={`${id}-title`}>Rift map at {clockLabel(time)}</title>
        <desc id={`${id}-desc`}>Ten player icons move between three lanes, jungle and objective pits. Blue circles represent {blueName}; red squares represent {redName}. This is a stylized illustration of simulated events.</desc>
        <defs>
          <pattern id={`${id}-grid`} width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" fill="none" stroke="#1e403f" strokeWidth=".12" /></pattern>
          <radialGradient id={`${id}-floor`}><stop stopColor="#163c3b" /><stop offset="1" stopColor="#0b2029" /></radialGradient>
        </defs>
        <rect x="1" y="1" width="98" height="98" rx="5" fill={`url(#${id}-floor)`} stroke="#315455" strokeWidth=".4" />
        <rect x="3" y="3" width="94" height="94" rx="4" fill={`url(#${id}-grid)`} />
        <path d="M18 13Q33 39 50 50T87 82" stroke="#328097" strokeWidth="8" fill="none" opacity=".32" />
        <path d="M18 13Q33 39 50 50T87 82" stroke="#62c2cf" strokeWidth=".3" strokeDasharray="1 2" fill="none" opacity=".5" />
        {Object.entries(LANES).map(([lane, path]) => <polyline key={lane} points={path.map((p) => p.join(',')).join(' ')} fill="none" stroke="#76856e" strokeWidth="3.8" opacity=".4" strokeLinejoin="round" />)}
        {[[26, 53, 8], [48, 76, 9], [53, 25, 9], [76, 49, 8], [34, 74, 4], [67, 27, 4]].map(([x, y, r]) => <g key={`${x}-${y}`}>
          <ellipse cx={x} cy={y} rx={r} ry={r * 0.65} fill="#102c2d" stroke="#477265" strokeWidth=".4" transform={`rotate(-35 ${x} ${y})`} />
          <path d={`M${x - 2} ${y + 1}l2 -4 2 4zm3 2l2 -4 2 4z`} fill="#356453" />
        </g>)}
        {Object.entries(BASES).map(([side, [x, y]]) => <g key={side} opacity={snapshot.ended && physicalSide(game, game.winner) !== side ? 0.25 : 1}>
          <circle cx={x} cy={y} r="6.5" fill={COLORS[side]} opacity=".09" stroke={COLORS[side]} strokeWidth=".6" />
          <path d={`M${x} ${y - 3.5}l3 3.5 -3 3.5 -3 -3.5z`} fill={COLORS[side]} />
          <text x={x} y={y + 10} textAnchor="middle" fill={COLORS[side]} fontSize="2">NEXUS</text>
        </g>)}
        {snapshot.towers.map(({ id: towerId, point: [x, y], side, alive }) => <g key={towerId} opacity={alive ? 0.9 : 0.16}>
          <path d={`M${x - 1.3} ${y + 1.6}h2.6l-.4 -3.2h-1.8z`} fill={alive ? color(side) : '#a2aaad'} stroke="#0b2029" strokeWidth=".35" />
          {!alive && <path d={`M${x - 1.5} ${y - 1.5}l3 3m0 -3l-3 3`} stroke="#a2aaad" strokeWidth=".4" />}
        </g>)}
        {snapshot.objectives.map(({ id: objective, point: [x, y], alive, nextSpawn }) => <g key={objective}>
          <circle cx={x} cy={y} r="5" fill="#0b2029" stroke={objective === 'dragon' ? '#eec581' : '#c3a2ff'} strokeWidth=".5" opacity={alive ? 1 : .35} />
          <path d={objective === 'dragon' ? `M${x - 2.8} ${y + 1}l1 -3 2 1 2 -1 .8 3 -2.6 1.5z` : `M${x - 2.5} ${y + 1.5}l.5 -4 2 1.5 2 -1.5 .5 4z`} fill={objective === 'dragon' ? '#eec581' : '#c3a2ff'} opacity={alive ? 1 : .25} />
          <text x={x} y={y + 7} textAnchor="middle" fill="#c3d4d3" fontSize="1.8">{objective.toUpperCase()}{alive ? '' : ` · ${clockLabel(nextSpawn)}`}</text>
        </g>)}
        {burst && <circle className="rift-burst" cx={burst[0]} cy={burst[1]} r="6" fill="none" stroke={color(latest.side)} strokeWidth=".7" />}
        {snapshot.players.map((p) => <g key={`${p.side}-${p.name}`} className="rift-player" style={{ transform: `translate(${p.point[0].toFixed(2)}px, ${p.point[1].toFixed(2)}px)`, opacity: p.dead ? .35 : 1 }}>
          <title>{p.name} · {p.role} · {p.kills}/{p.deaths}{p.dead ? ' · respawning' : ''}</title>
          {physicalSide(game, p.side) === 'A' ? <circle r="2.2" fill="#103c50" stroke={COLORS.A} strokeWidth=".5" /> : <rect x="-2.1" y="-2.1" width="4.2" height="4.2" rx=".5" fill="#4c2631" stroke={COLORS.B} strokeWidth=".5" />}
          <text y=".85" textAnchor="middle" fill={color(p.side)} fontSize="2.8" fontWeight="800">{p.dead ? '×' : ROLE_GLYPH[p.role]}</text>
          <text y="4.3" textAnchor="middle" fill="#edf7f6" fontSize="1.85" stroke="#0a2028" strokeWidth=".5" paintOrder="stroke">{p.name}</text>
        </g>)}
      </svg>
      {decision && <div className="rift-map-status" role="status">TACTICAL PAUSE · YOUR CALL</div>}
      {!decision && call && <div className="rift-map-status rift-call">{call.label}</div>}
    </div><aside className={`rift-sidebar ${decisionPanel ? 'rift-coaching' : ''}`}>
      {decisionPanel || <><h3>On the Rift</h3>
      {['A', 'B'].map((side) => <div className={`rift-roster side-${physicalSide(game, side)}`} key={side}>
        <h4>{side === 'A' ? homeName : awayName}</h4>
        {snapshot.players.filter((p) => p.side === side).map((p) => <div key={p.name} className={p.dead ? 'respawning' : ''}>
          <span className="rift-role" title={p.role}>{ROLE_GLYPH[p.role]}</span><span><strong>{p.name}</strong><small>{p.role}{game.picks?.[side]?.[p.role] ? ` · ${CHAMP_BY_ID[game.picks[side][p.role]]?.name || ''}` : ''}{p.dead ? ' · respawning' : ''}</small></span><b>{p.kills}/{p.deaths}</b>
        </div>)}
      </div>)}
      <div className="rift-feed"><h4>Match events</h4>{!recent.length && <p className="hint">Teams leave base. Lanes are forming.</p>}{recent.map((e, i) => <p key={`${e.t}-${i}`}><time>{clockLabel(e.t)}</time><span style={{ color: color(e.side) }}>{e.killer ? `${e.killer} → ${e.victim}` : `${e.side === 'A' ? homeName : awayName} · ${e.type}`}</span></p>)}</div></>}
    </aside></div>
    <div className="rift-controls">
      <button type="button" className="ghost" disabled={decision} onClick={() => { setPaused(!paused); callbacks.current.onCursor?.(time) }}>{paused ? '▶ Play' : 'Ⅱ Pause'}</button>
      <label className="rift-seek"><span className="sr-only">Match timeline</span><input type="range" min="0" max={limit} step="0.1" value={Math.min(time, limit)} disabled={decision} onChange={(e) => seek(Number(e.target.value))} /></label>
      <button type="button" className="ghost" disabled={decision} onClick={() => seek(game.events.find((e) => e.t > time + .01)?.t ?? limit)}>Next event</button>
      <button type="button" className="ghost" disabled={decision} onClick={() => seek(limit)}>{decisionAt != null && !callMade ? 'Jump to call' : 'Finish game'}</button>
      <label className="rift-speed"><span className="sr-only">Playback speed</span><select value={speed} onChange={(e) => onSpeedChange?.(e.target.value)}>{Object.keys(RATE).map((s) => <option key={s} value={s}>{s === 'instant' ? 'Instant' : s[0].toUpperCase() + s.slice(1)}</option>)}</select></label>
    </div>
    <p className="hint rift-caption">Stylized match simulation · Player positions illustrate the event timeline. Icons: ◆ top · ✦ jungle · ✧ mid · ⊕ bot · + support.</p>
  </section>
}
