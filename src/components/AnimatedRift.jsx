import { useEffect, useId, useRef, useState } from 'react'
import { mapSnapshot, playbackLimit, physicalSide } from '../game/mapSimulation.js'
import { iglCallById } from '../game/igl.js'
import { readMapDisplay, mapDisplay } from '../game/mapDisplay.js'
import { Button, Card, Chip, Seg } from './ui/index.js'
import { ModeBarActions, useModeBarState } from './shell/modeBar.jsx'
import Scorebug from './match/Scorebug.jsx'
import RiftMap from './match/RiftMap.jsx'
import EventFeed from './match/EventFeed.jsx'
import ObjectivesTable from './match/ObjectivesTable.jsx'
import PlayerStrip from './match/PlayerStrip.jsx'
import MatchIcon from './MatchIcon.jsx'
import { clockLabel, feedItems, seriesState, shortName } from './match/matchModel.js'

export { clockLabel }

const RATE = { slow: 0.35, normal: 0.8, fast: 2.4, instant: 1000 }
const SPEEDS = [
  { id: 'slow', label: 'Slow' },
  { id: 'normal', label: 'Normal' },
  { id: 'fast', label: 'Fast' },
  { id: 'instant', label: 'Instant' },
]
const factIcon = (type) => (['kill', 'teamfight', 'ace', 'tower', 'dragon', 'baron'].includes(type) ? type : 'nexus')
const IMPACT_TITLE = { tower: 'Tower destroyed', dragon: 'Dragon secured', baron: 'Baron secured' }

/**
 * Playback controls live in the shell's mode bar. Outside the shell (tests,
 * isolated renders) they render inline so every action stays reachable.
 */
function PlaybackActions({ children }) {
  const modeBar = useModeBarState()
  if (modeBar) return <ModeBarActions>{children}</ModeBarActions>
  return <div className="match-playback-inline">{children}</div>
}

function objectiveStatus(snapshot) {
  const up = snapshot.objectives.filter((o) => o.alive)
  if (up.some((o) => o.id === 'baron')) return { tone: 'warn', text: 'Baron is up' }
  if (up.some((o) => o.id === 'dragon')) return { tone: 'warn', text: 'Dragon is up' }
  const next = [...snapshot.objectives].sort((a, b) => a.nextSpawn - b.nextSpawn)[0]
  return next ? { tone: 'neutral', text: `Next ${next.id} ${clockLabel(next.nextSpawn)}` } : null
}

/**
 * The live matchday broadcast for one game: scorebug, the Rift, objectives,
 * player strip and play-by-play, driven by one playback clock. The engine
 * result is fixed before playback starts; this only reveals it.
 */
export default function AnimatedRift({
  game,
  homeName,
  awayName,
  homeId,
  awayId,
  userSide = 'home',
  initialTime = 0,
  speed = 'normal',
  decisionAt,
  callMade = false,
  decision = false,
  onCheckpoint,
  onComplete,
  onCursor,
  onSpeedChange,
  onSkipSeries,
  homeWins = 0,
  awayWins = 0,
  needWins,
  callout,
  extraFeed = [],
  display: displayProp,
}) {
  const id = useId().replace(/:/g, '')
  const [time, setTime] = useState(initialTime)
  // Map display is a browser preference set in Guide › Settings.
  const [storedDisplay] = useState(readMapDisplay)
  const display = displayProp ? mapDisplay(displayProp) : storedDisplay
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )
  const [paused, setPaused] = useState(reducedMotion)
  const [impact, setImpact] = useState(null)
  const mapWrapRef = useRef(null)
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
  useEffect(() => {
    const previous = previousTime.current
    previousTime.current = time
    if (seeking.current) {
      seeking.current = false
      return
    }
    if (paused || decision || reducedMotion || time <= previous || time - previous > 0.5) return
    const crossed = game.events
      .filter((event) => event.t > previous && event.t <= time && ['kill', 'tower', 'dragon', 'baron'].includes(event.type))
      .at(-1)
    if (crossed) setImpact(crossed)
  }, [time, paused, decision, reducedMotion, game])
  useEffect(() => {
    if (!impact || paused || decision) return
    const timer = setTimeout(() => setImpact(null), 1400)
    return () => clearTimeout(timer)
  }, [impact, paused, decision])
  // Crisp map at any size: size the SVG backing store to the wrap in device pixels.
  useEffect(() => {
    const wrap = mapWrapRef.current
    const svg = wrap?.querySelector?.('svg.rift-map')
    if (!wrap || !svg || typeof ResizeObserver === 'undefined') return
    const syncSize = () => {
      const width = wrap.clientWidth
      const height = wrap.clientHeight
      if (width < 1 || height < 1) return
      const dpr = window.devicePixelRatio || 1
      svg.setAttribute('width', String(Math.round(width * dpr)))
      svg.setAttribute('height', String(Math.round(height * dpr)))
      svg.style.width = `${width}px`
      svg.style.height = `${height}px`
    }
    syncSize()
    const observer = new ResizeObserver(syncSize)
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  // Sides: physical A is blue. Engine A is the home club.
  const blueEngine = game.blueSide === 'B' ? 'B' : 'A'
  const redEngine = blueEngine === 'A' ? 'B' : 'A'
  const club = (engine) => {
    const home = engine === 'A'
    const name = home ? homeName : awayName
    const cid = home ? homeId : awayId
    return {
      engineSide: engine,
      id: cid,
      name,
      short: cid ? shortName(cid, name) : name,
      seriesWins: home ? homeWins : awayWins,
      kills: snapshot.sides[engine].kills,
      towers: snapshot.sides[engine].towers,
    }
  }
  const blue = club(blueEngine)
  const red = club(redEngine)
  const homeShort = (homeId && shortName(homeId, homeName)) || homeName
  const awayShort = (awayId && shortName(awayId, awayName)) || awayName
  const teamName = (engine) => (engine === 'A' ? homeShort : awayShort)
  const leader = snapshot.gold > 0 ? homeShort : awayShort
  const series = seriesState({ homeShort, awayShort, homeWins, awayWins, needWins })
  const items = feedItems(snapshot.events, game, teamName, extraFeed.filter((x) => x.t <= time + 0.001))
  const status = objectiveStatus(snapshot)
  const userEngine = userSide === 'away' ? 'B' : 'A'
  const userTone = physicalSide(game, userEngine) === 'A' ? 'blue' : 'red'
  const call = game.coachingCall && time >= game.coachingCall.at ? iglCallById(game.coachingCall.id) : null
  const summary = `${blue.short} ${blue.kills} kills, ${blue.towers} towers; ${red.short} ${red.kills} kills, ${red.towers} towers${status?.tone === 'warn' ? `; ${status.text.toLowerCase()}` : ''}.`
  const pendingCall = decisionAt != null && !callMade
  const skipLabel = pendingCall ? 'Skip to call' : onSkipSeries ? 'Skip to result' : 'Finish game'
  const skip = () => (!pendingCall && onSkipSeries ? onSkipSeries() : seek(limit))
  const togglePause = () => {
    setPaused(!paused)
    callbacks.current.onCursor?.(time)
  }
  const speedSeg = (className) => (
    <span className={`match-speed ${className}`}>
      <Seg name="match-speed" label="Playback speed" items={SPEEDS} value={speed} onChange={(s) => onSpeedChange?.(s)} />
    </span>
  )
  const impactTitle = impact
    ? impact.type === 'kill'
      ? game.events.find((e) => e.type === 'kill') === impact
        ? 'First blood'
        : 'Kill'
      : IMPACT_TITLE[impact.type] ?? impact.type
    : null
  const impactIndex = impact
    ? impact.type === 'tower'
      ? snapshot.events.filter((e) => e.type === 'tower' && e.side === impact.side).length - 1
      : game.events.indexOf(impact)
    : 0

  return (
    <section
      className={`rift-view rift-arena match-live${paused || decision ? ' is-paused' : ''}${reducedMotion ? ' reduce-motion' : ''}`}
      aria-label="Live match"
    >
      <PlaybackActions>
        <Button
          variant="secondary"
          icon={paused ? 'play' : 'pause'}
          iconOnly
          label="Pause"
          aria-pressed={paused || decision}
          disabled={decision}
          className="match-pause"
          onClick={togglePause}
        />
        {speedSeg('desk-only')}
        <Button variant="quiet" className="match-skip" disabled={decision} onClick={skip}>
          {skipLabel}
        </Button>
      </PlaybackActions>

      <Scorebug
        sides={{ blue, red }}
        time={time}
        gameNumber={game.game}
        series={series}
        goldDiffA={snapshot.gold}
        leader={leader}
        game={game}
      />

      <div className={`rift-arena-grid${decision ? ' rift-arena-grid--decision' : ''}`}>
        <Card
          className="rift-card"
          title="The Rift"
          action={status && <Chip tone={status.tone === 'warn' ? 'warn' : 'neutral'}>{status.text}</Chip>}
        >
          <div className="rift-map-wrap" ref={mapWrapRef}>
            <RiftMap
              id={id}
              game={game}
              snapshot={snapshot}
              display={display}
              impact={impact}
              impactIndex={impactIndex}
              summary={summary}
              blueName={blue.name}
              redName={red.name}
            />
            {impact && !decision && (
              <div
                className={`rift-impact-callout tone-${physicalSide(game, impact.side) === 'A' ? 'blue' : 'red'}`}
                key={`${impact.t}-${impact.type}`}
              >
                <MatchIcon name={factIcon(impact.type)} size={20} />
                <span className="ric-text">
                  <span className="ric-title">{impactTitle}</span>
                  <strong>
                    {impact.killer || teamName(impact.side)}
                    {impact.victim ? ` on ${impact.victim}` : ''}
                  </strong>
                </span>
                <span className="ric-time num">{clockLabel(impact.t)}</span>
              </div>
            )}
            {decision && (
              <div className="rift-map-status is-call" role="status">
                Tactical pause · Your call
              </div>
            )}
            {!decision && call && <div className="rift-map-status">Call: {call.label}</div>}
          </div>
          <ul className="rift-legend" aria-label="Map legend">
            <li>
              <i className="lg-dot lg-blue" aria-hidden="true" /> {blue.short}
            </li>
            <li>
              <i className="lg-dot lg-red" aria-hidden="true" /> {red.short}
            </li>
            <li>
              <i className="lg-ring" aria-hidden="true" /> Objective up
            </li>
          </ul>
          <div className="rift-controls">
            <label className="rift-seek">
              <span className="sr-only">Match timeline</span>
              <input
                type="range"
                min="0"
                max={limit}
                step="0.1"
                value={Math.min(time, limit)}
                disabled={decision}
                aria-valuetext={clockLabel(Math.min(time, limit))}
                onChange={(e) => seek(Number(e.target.value))}
              />
            </label>
            <Button
              variant="secondary"
              disabled={decision}
              onClick={() => seek(game.events.find((e) => e.t > time + 0.01)?.t ?? limit)}
            >
              Next event
            </Button>
            {speedSeg('mob-only')}
          </div>
        </Card>

        <div className="rift-side">
          <Card className="objectives-card" title="Objectives">
            <ObjectivesTable events={snapshot.events} blue={blue} red={red} />
            {callout}
          </Card>
          <section className="players-card" aria-labelledby={`${id}-players`}>
            <h2 id={`${id}-players`} className="sr-only">
              {userEngine === 'A' ? homeName : awayName} players
            </h2>
            <PlayerStrip
              players={snapshot.players.filter((p) => p.side === userEngine)}
              picks={game.picks?.[userEngine]}
              teamName={userEngine === 'A' ? homeName : awayName}
              tone={userTone}
            />
          </section>
          <Card className="feed-card" title="Play-by-play">
            <EventFeed items={items} sideNames={{ blue: `${blue.short}, blue`, red: `${red.short}, red` }} />
          </Card>
        </div>
      </div>
    </section>
  )
}
