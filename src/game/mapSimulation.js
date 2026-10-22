import { goldAt } from './matchSession.js'

export const BASES = { A: [12, 88], B: [88, 12] }
export function physicalSide(game, engineSide) {
  return game.blueSide === 'B' ? (engineSide === 'A' ? 'B' : 'A') : engineSide
}

export const PITS = { dragon: [67, 67], baron: [33, 33] }
export const LANES = {
  TOP: [[12, 88], [12, 15], [18, 12], [88, 12]],
  MID: [[12, 88], [88, 12]],
  BOT: [[12, 88], [82, 88], [88, 82], [88, 12]],
}
export function onPath(path, progress) {
  const lengths = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]))
  let remaining = Math.max(0, Math.min(1, progress)) * lengths.reduce((a, b) => a + b, 0)
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      const k = remaining / (lengths[i] || 1)
      return path[i].map((v, axis) => v + (path[i + 1][axis] - v) * k)
    }
    remaining -= lengths[i]
  }
  return path.at(-1)
}
export const TOWERS = ['A', 'B'].flatMap((side) => ['TOP', 'MID', 'BOT'].flatMap((lane) =>
  [0.39, 0.25, 0.12].map((t, i) => ({ id: `${side}-${lane}-${i}`, side, lane, tier: i,
    point: onPath(LANES[lane], side === 'A' ? t : 1 - t) }))))

export function eventLocation(event, index = 0, game = {}) {
  if (event.type === 'dragon') return PITS.dragon
  if (event.type === 'baron') return PITS.baron
  if (event.type === 'tower') {
    const target = physicalSide(game, event.side) === 'A' ? 'B' : 'A'
    const lane = ['TOP', 'MID', 'BOT'][index % 3]
    return TOWERS.find((t) => t.side === target && t.lane === lane && t.tier === Math.min(2, Math.floor(index / 3)))?.point ?? [50, 50]
  }
  const zones = [[24, 23], [49, 51], [77, 76], [42, 68], [61, 36], [67, 67], [33, 33]]
  return zones[index % zones.length]
}

function movement(game, p, i, minute, events) {
  const physical = physicalSide(game, p.side)
  const blue = physical === 'A', base = BASES[physical]
  const deaths = events.filter((e) => e.type === 'kill' && e.victim === p.name && e.side !== p.side)
  const death = deaths.at(-1)
  if (death && minute - death.t < 0.55) return { point: base, dead: true }
  // Junglers patrol mirrored, closed routes, each beginning at their own base.
  // Closed endpoints also keep the animation continuous when the patrol loops.
  const jungle = [[12, 88], [30, 66], [28, 42], [48, 33], [65, 29], [70, 55], [54, 72], [30, 66], [12, 88]]
  const lane = p.role === 'JNG' ? jungle.map(([x, y]) => blue ? [x, y] : [100 - x, 100 - y])
    : LANES[p.role === 'SUP' ? 'BOT' : p.role] || LANES.MID
  const wave = Math.sin(minute * 0.8 + i * 0.4) * 0.06
  const deployment = Math.min(1, minute / 2)
  const progress = p.role === 'JNG' ? (minute * 0.052) % 1
    : blue ? (0.45 + wave) * deployment : 1 - (0.45 - wave) * deployment
  let point = onPath(lane, progress)
  // A recent death has a visible walk back out of base.
  if (death && minute - death.t < 1.1) {
    const f = (minute - death.t - 0.55) / 0.55
    point = base.map((v, a) => v + (point[a] - v) * f)
  }
  const nearby = game.events.map((e, index) => ({ e, index })).filter(({ e }) =>
    e.t <= minute && minute - e.t < 0.85 && (e.type !== 'kill' || e.killer === p.name || e.victim === p.name || p.role === 'JNG' || p.role === 'SUP'))
    .sort((a, b) => Math.abs(a.e.t - minute) - Math.abs(b.e.t - minute))[0]
  if (nearby) {
    const towerIndex = game.events.slice(0, nearby.index).filter((e) => e.type === 'tower' && e.side === nearby.e.side).length
    const target = eventLocation(nearby.e, nearby.e.type === 'tower' ? towerIndex : nearby.index, game)
    const f = Math.max(0, 1 - Math.abs(nearby.e.t - minute) / 0.85)
    point = point.map((v, a) => v + (target[a] - v) * f)
  }
  const call = game.coachingCall
  if (call && call.side === p.side && minute >= call.at && minute < call.at + 2.2) {
    let target = call.id === 'dragons' ? PITS.dragon : ['baron', 'herald'].includes(call.id) ? PITS.baron
      : call.id === 'scale' ? onPath(lane, blue ? 0.28 : 0.72)
        : call.id === 'split' && p.role === 'TOP' ? onPath(LANES.TOP, blue ? 0.68 : 0.32)
          : call.id === 'roam' && !['SUP', 'MID', 'JNG'].includes(p.role) ? point : [50, 50]
    const f = Math.min(1, (minute - call.at) * 2, (call.at + 2.2 - minute) * 2)
    point = point.map((v, a) => v + (target[a] - v) * f)
  }
  // Offsets keep five players readable when they gather around one objective.
  const angle = i % 5 * Math.PI * 2 / 5 + (blue ? 0 : 0.5)
  return { point: [point[0] + Math.cos(angle) * 2.5, point[1] + Math.sin(angle) * 2.5], dead: false }
}

export function mapSnapshot(game, minute) {
  const time = Math.max(0, Math.min(game.durationMin, minute))
  const events = game.events.filter((e) => e.t <= time)
  const count = (type, side) => events.filter((e) => e.type === type && e.side === side).length
  const sides = Object.fromEntries(['A', 'B'].map((side) => [side, {
    kills: count('kill', side), towers: count('tower', side), dragons: count('dragon', side), barons: count('baron', side),
  }]))
  const players = game.players.map((p, i) => ({ name: p.name, role: p.role, side: p.side,
    kills: events.filter((e) => e.type === 'kill' && e.side === p.side && e.killer === p.name).length,
    deaths: events.filter((e) => e.type === 'kill' && e.side !== p.side && e.victim === p.name).length,
    ...movement(game, p, i, time, events),
  }))
  const towers = TOWERS.map((t) => {
    const side = physicalSide(game, t.side)
    return { ...t, side, alive: t.tier * 3 + ['TOP', 'MID', 'BOT'].indexOf(t.lane) >= sides[side === 'A' ? 'B' : 'A'].towers }
  })
  const objectives = Object.entries(PITS).map(([id, point]) => {
    const last = events.filter((e) => e.type === id).at(-1)
    const spawn = id === 'dragon' ? 5 : 20
    const nextSpawn = last ? last.t + (id === 'dragon' ? 5 : 6) : spawn
    return { id, point, alive: time >= nextSpawn, nextSpawn, lastSide: last?.side }
  })
  return { time, events, players, sides, towers, objectives, gold: visualGoldAt(game, time), ended: time >= game.durationMin }
}

export function playbackLimit(game, decisionAt, callMade) {
  return decisionAt != null && !callMade ? Math.min(game.durationMin, decisionAt) : game.durationMin
}

// Presentation-only origin: interpolate from a level starting economy to the
// engine's five-minute checkpoint, then use the unmodified engine timeline.
// This removes the engine walk's nonzero t=0 offset without changing outcomes.
export function visualGoldAt(game, minute) {
  const anchor = Math.min(5, game.durationMin)
  const time = Math.max(0, Math.min(game.durationMin, minute))
  return time < anchor ? goldAt(game, anchor) * time / (anchor || 1) : goldAt(game, time)
}
