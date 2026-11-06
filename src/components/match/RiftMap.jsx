import { useState } from 'react'
import terrain from '../../assets/rift-terrain.webp'
import MatchIcon from '../MatchIcon.jsx'
import { BASES, LANES, eventLocation, physicalSide } from '../../game/mapSimulation.js'
import { playerIdentity } from '../../game/mapDisplay.js'
import { clockLabel } from './matchModel.js'

// Physical side A is blue (bottom-left base), B is red. Shape carries the side
// as well as colour: blue players are circles, red players are squares.
const tone = (physical) => (physical === 'A' ? 'blue' : 'red')

function MapMarker({ player: p, game, display, clipId }) {
  const identity = playerIdentity(game, p, display)
  const [failedPortrait, setFailedPortrait] = useState(null)
  const blue = physicalSide(game, p.side) === 'A'
  const portrait = identity.portrait && failedPortrait !== identity.portrait && !p.dead
  const glyph = p.dead ? '×' : display.portraits === 'players' ? identity.initials : ''
  return (
    <g
      className="rift-player"
      data-side={blue ? 'blue' : 'red'}
      data-dead={p.dead ? 'true' : undefined}
      data-player={p.name}
      style={{ transform: `translate(${p.point[0].toFixed(2)}px, ${p.point[1].toFixed(2)}px)` }}
    >
      <title>
        {p.name}
        {identity.champion ? ` · ${identity.champion.name}` : ''} · {p.role} · {p.kills}/{p.deaths} · {p.activity}
      </title>
      <defs>
        <clipPath id={clipId}>
          {blue ? <circle r="2.2" /> : <rect x="-2.2" y="-2.2" width="4.4" height="4.4" rx=".6" />}
        </clipPath>
      </defs>
      {blue ? (
        <circle className="rm-dot" r="2.5" />
      ) : (
        <rect className="rm-dot" x="-2.4" y="-2.4" width="4.8" height="4.8" rx=".7" />
      )}
      {!p.dead && display.portraits !== 'players' && !portrait && (
        <g className="rm-glyph" transform="translate(-1.45 -1.45)">
          <MatchIcon name={p.role} size={2.9} />
        </g>
      )}
      <text
        className="rm-glyph-text"
        y=".85"
        textAnchor="middle"
        fontSize={display.portraits === 'players' && !p.dead ? '1.9' : '2.8'}
        fontWeight="700"
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
        <text className="rift-player-label" y="4.7" textAnchor="middle" fontSize="1.75" paintOrder="stroke">
          {identity.label}
        </text>
      )}
    </g>
  )
}

/**
 * The Rift: illustrated terrain (unchanged art), lanes, towers, objective pits
 * with a warn ring while an objective is up, and ten player markers.
 * role=img with a text summary of the moment.
 */
export default function RiftMap({ id, game, snapshot, display, impact, impactIndex, summary, blueName, redName }) {
  const burst = impact ? eventLocation(impact, impactIndex, game) : null
  const burstTone = impact ? tone(physicalSide(game, impact.side)) : null
  return (
    <svg className="rift-map" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
      <title id={`${id}-title`}>Rift map at {clockLabel(snapshot.time)}</title>
      <desc id={`${id}-desc`}>
        {summary} Circles are {blueName} (blue side); squares are {redName} (red side). Stylised illustration of
        simulated events.
      </desc>
      <image href={terrain} x="0" y="0" width="100" height="100" preserveAspectRatio="none" />
      <rect className="rm-tint" width="100" height="100" />
      {Object.entries(LANES).map(([lane, path]) => (
        <polyline key={lane} className="rm-lane" points={path.map((p) => p.join(',')).join(' ')} />
      ))}
      {Object.entries(BASES).map(([side, [x, y]]) => (
        <g
          key={side}
          className={`rm-base rm-${tone(side)}`}
          opacity={snapshot.ended && physicalSide(game, game.winner) !== side ? 0.3 : 1}
        >
          <circle className="rm-base-ring" cx={x} cy={y} r="6.5" />
          <path className="rm-base-gem" d={`M${x} ${y - 3.4}l2.6 3.2 -2.6 3.4 -2.6 -3.4z`} />
        </g>
      ))}
      {snapshot.towers.map(({ id: towerId, point: [x, y], side, alive }) => (
        <g key={towerId} className={`rm-tower rm-${tone(side)}${alive ? '' : ' is-down'}`}>
          <path d={`M${x - 0.9} ${y + 0.9}v-2.1l.9 -.7 .9 .7v2.1l-.9 .6z`} />
          {!alive && <path className="rm-tower-x" d={`M${x - 1.1} ${y - 1.1}l2.2 2.2m0 -2.2l-2.2 2.2`} />}
        </g>
      ))}
      {snapshot.objectives.map(({ id: objective, point: [x, y], alive, nextSpawn }) => (
        <g key={objective} className={`rm-pit${alive ? ' is-up' : ''}`}>
          {alive && <circle className="rm-ping" cx={x} cy={y} r="6.6" />}
          <circle className="rm-pit-bg" cx={x} cy={y} r="5" />
          <g className="rm-pit-icon" transform={`translate(${x - 2.4} ${y - 2.4})`}>
            <MatchIcon name={objective} size={4.8} />
          </g>
          <text className="rm-pit-label" x={x} y={y + 7.6} textAnchor="middle" fontSize="1.8">
            {objective === 'dragon' ? 'DRAGON' : 'BARON'}
            {alive ? ' · UP' : ` · ${clockLabel(nextSpawn)}`}
          </text>
        </g>
      ))}
      {burst && (
        <circle
          key={`${impact.t}-${impact.type}`}
          className={`rift-burst rm-${burstTone}`}
          cx={burst[0]}
          cy={burst[1]}
          r="6"
        />
      )}
      {snapshot.players.map((p, index) => (
        <MapMarker key={`${p.side}-${p.role}`} player={p} game={game} display={display} clipId={`${id}-portrait-${index}`} />
      ))}
    </svg>
  )
}
