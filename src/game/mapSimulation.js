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
  // Kill events carry participants, not coordinates. Anchor the illustration
  // to the victim's lane instead of cycling unrelated fights through mid.
  const victim = game.players?.find((p) => p.name === event.victim && p.side !== event.side)
  const lane = victim?.role === 'SUP' ? 'BOT' : victim?.role
  if (LANES[lane]) return onPath(LANES[lane], 0.48)
  return physicalSide(game, event.side) === 'A' ? [39, 62] : [61, 38]
}

const ROLES = ['TOP', 'JNG', 'MID', 'BOT', 'SUP']
const mix = (a, b, amount) => a.map((v, axis) => v + (b[axis] - v) * amount)
const envelope = (elapsed, duration) => Math.sin(Math.PI * Math.max(0, Math.min(1, elapsed / duration))) ** 2
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

function movement(game, p, minute, events) {
  const physical = physicalSide(game, p.side)
  const blue = physical === 'A', base = BASES[physical]
  const deaths = events.filter((e) => e.type === 'kill' && e.victim === p.name && e.side !== p.side)
  const death = deaths.at(-1)
  if (death && minute - death.t < 0.55) return { point: [...base], dead: true, activity: 'Respawning' }
  // Junglers patrol mirrored, closed routes, each beginning at their own base.
  // Closed endpoints also keep the animation continuous when the patrol loops.
  const jungle = [[12, 88], [30, 70], [28, 48], [29, 38], [30, 62], [61, 72], [47, 79], [30, 70], [12, 88]]
  const lane = p.role === 'JNG' ? jungle.map(([x, y]) => blue ? [x, y] : [100 - x, 100 - y])
    : LANES[p.role === 'SUP' ? 'BOT' : p.role] || LANES.MID
  const roleIndex = Math.max(0, ROLES.indexOf(p.role))
  const wave = Math.sin(minute * 0.8 + roleIndex * 0.4) * 0.025
  const deployment = Math.min(1, minute / 2)
  const progress = p.role === 'JNG' ? (minute * 0.052) % 1
    : blue ? (0.43 + wave) * deployment : 1 - (0.43 + wave) * deployment
  let point = onPath(lane, progress)
  // A recent death has a visible walk back out of base.
  if (death && minute - death.t < 1.1) {
    const f = (minute - death.t - 0.55) / 0.55
    point = base.map((v, a) => v + (point[a] - v) * f)
  }
  let activity = p.role === 'JNG' ? 'Jungle patrol' : `${p.role === 'SUP' ? 'BOT' : p.role} lane`
  // Only revealed events may influence movement. Actors rotate; uninvolved
  // lanes keep farming. The zero-ended envelope avoids snapping at event time.
  const nearby = events.slice().reverse().find((e) => {
    if (minute - e.t >= 1.8) return false
    if (e.type === 'kill') return e.killer === p.name && e.side === p.side
    if (e.side !== p.side) return false
    if (e.type === 'dragon') return ['JNG', 'MID', 'BOT', 'SUP'].includes(p.role)
    if (e.type === 'baron') return ['TOP', 'JNG', 'MID', 'SUP'].includes(p.role)
    if (e.type === 'tower') {
      const index = events.slice(0, events.indexOf(e)).filter((x) => x.type === 'tower' && x.side === e.side).length
      return (p.role === 'SUP' ? 'BOT' : p.role) === ['TOP', 'MID', 'BOT'][index % 3]
    }
    return false
  })
  if (nearby) {
    const index = game.events.indexOf(nearby)
    const towerIndex = game.events.slice(0, index).filter((e) => e.type === 'tower' && e.side === nearby.side).length
    const target = eventLocation(nearby, nearby.type === 'tower' ? towerIndex : index, game)
    // Maintain an approach formation on the team's own side of the objective.
    const direction = blue ? -1 : 1
    const formation = [target[0] + direction * (4 + roleIndex), target[1] - direction * (8 - roleIndex)]
    point = mix(point, formation, envelope(minute - nearby.t, 1.8))
    activity = nearby.type === 'kill' ? 'Skirmish' : `${nearby.type[0].toUpperCase() + nearby.type.slice(1)} rotation`
  }
  const call = game.coachingCall
  if (call && call.side === p.side && minute >= call.at && minute < call.at + 2.2) {
    const midFormation = onPath(LANES.MID, blue ? 0.39 : 0.61)
    let target = call.id === 'dragons' ? PITS.dragon : ['baron', 'herald'].includes(call.id) ? PITS.baron
      : call.id === 'scale' ? onPath(lane, blue ? 0.28 : 0.72)
        : call.id === 'split' ? (p.role === 'TOP' ? onPath(LANES.TOP, blue ? 0.68 : 0.32) : point)
          : call.id === 'roam' ? (['SUP', 'JNG'].includes(p.role) ? midFormation : point)
            : call.id === 'group' ? midFormation : point
    if (['dragons', 'baron', 'herald', 'group', 'roam'].includes(call.id)) {
      const direction = blue ? -1 : 1
      target = [target[0] + direction * (3 + roleIndex * 1.7), target[1] - direction * (9 - roleIndex * 1.7)]
      // A roam call never redirects the uninvolved laners.
      if (call.id === 'roam' && !['SUP', 'JNG'].includes(p.role)) target = point
    }
    point = mix(point, target, envelope(minute - call.at, 2.2))
    activity = iglActivity(call.id, p.role, activity)
  }
  // Offsets keep five players readable when they gather around one objective.
  const angle = roleIndex * Math.PI * 2 / 5 + (blue ? 0 : Math.PI)
  return { point: [point[0] + Math.cos(angle) * 2.5, point[1] + Math.sin(angle) * 2.5], dead: false, activity }
}

function iglActivity(call, role, fallback) {
  if (call === 'split') return role === 'TOP' ? 'Split pushing' : fallback
  if (call === 'roam') return ['SUP', 'JNG'].includes(role) ? 'Roaming mid' : fallback
  return { dragons: 'Dragon setup', baron: 'Baron setup', herald: 'Herald setup', scale: 'Safe farming', group: 'Grouping mid' }[call] || fallback
}

// Resolve marker overlap for readability; this never alters simulation data.
function separateMarkers(players, time) {
  if (time < 2) return
  const spacing = 5.6 * Math.min(1, time - 2)
  for (let pass = 0; pass < 12; pass++) {
    for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) {
      const a = players[i], b = players[j]
      if (a.dead || b.dead) continue
      const d = distance(a.point, b.point)
      if (d >= spacing) continue
      const dx = d > 0.001 ? (b.point[0] - a.point[0]) / d : 1
      const dy = d > 0.001 ? (b.point[1] - a.point[1]) / d : 0
      const push = (spacing - d) / 2
      a.point = [a.point[0] - dx * push, a.point[1] - dy * push]
      b.point = [b.point[0] + dx * push, b.point[1] + dy * push]
    }
  }
}

export function mapSnapshot(game, minute) {
  const time = Math.max(0, Math.min(game.durationMin, minute))
  const events = game.events.filter((e) => e.t <= time)
  const count = (type, side) => events.filter((e) => e.type === type && e.side === side).length
  const sides = Object.fromEntries(['A', 'B'].map((side) => [side, {
    kills: count('kill', side), towers: count('tower', side), dragons: count('dragon', side), barons: count('baron', side),
  }]))
  const players = game.players.map((p) => ({ name: p.name, role: p.role, side: p.side,
    kills: events.filter((e) => e.type === 'kill' && e.side === p.side && e.killer === p.name).length,
    deaths: events.filter((e) => e.type === 'kill' && e.side !== p.side && e.victim === p.name).length,
    ...movement(game, p, time, events),
  }))
  separateMarkers(players, time)
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
