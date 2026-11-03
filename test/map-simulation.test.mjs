import assert from 'node:assert/strict'
import { BASES, TOWERS, mapSnapshot, physicalSide, eventLocation, visualGoldAt } from '../src/game/mapSimulation.js'
const roles = ['TOP', 'JNG', 'MID', 'BOT', 'SUP']
const game = {
 durationMin: 30, winner: 'A',
 players: ['A', 'B'].flatMap(side => roles.map(role => ({ side, role, name: side + role, kills: 99, deaths: 99 }))),
 goldTimeline: [{ t: 0, diff: 1400 }, { t: 5, diff: 2200 }, { t: 30, diff: 5000 }],
 events: [{ t: 8, type: 'kill', side: 'A', killer: 'AJNG', victim: 'BMID' },
   { t: 10, type: 'tower', side: 'A' }, { t: 11, type: 'tower', side: 'B' },
   { t: 12, type: 'dragon', side: 'A' }, { t: 22, type: 'baron', side: 'B' }],
}
const original = JSON.stringify(game)
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
for (const blueSide of ['A', 'B']) {
 const g = { ...game, blueSide }
 const start = mapSnapshot(g, 0)
 assert.equal(start.players.length, 10)
 for (const p of start.players) assert(distance(p.point, BASES[physicalSide(g, p.side)]) <= 2.51)
 for (const side of ['A', 'B']) {
  const jungler = mapSnapshot(g, 0.3).players.find(p => p.role === 'JNG' && p.side === side)
  assert(distance(jungler.point, BASES[physicalSide(g, side)]) < 8, 'jungler deploys from own corner')
 }
 const deployed = mapSnapshot(g, 3)
 for (const p of deployed.players) {
  assert(distance(p.point, start.players.find(q => q.name === p.name).point) > 8, `${p.name} moves out of base`)
  assert(distance(p.point, mapSnapshot(g, 3.2).players.find(q => q.name === p.name).point) > 0.01, `${p.name} keeps moving`)
 }
 for (const p of mapSnapshot(g, 2 - 1e-6).players) assert(distance(p.point, mapSnapshot(g, 2 + 1e-6).players.find(q => q.name === p.name).point) < 0.001)
 const s = mapSnapshot(g, 10)
 const destroyed = s.towers.filter(t => !t.alive)
 assert.equal(destroyed.length, 1)
 assert.equal(destroyed[0].side, 'B')
 assert.deepEqual(destroyed[0].point, eventLocation(game.events[1], 0, g))
 assert.equal(s.players.find(p => p.name === 'AJNG').kills, 1)
 assert.equal(s.players.find(p => p.name === 'BMID').deaths, 1)
 assert.equal(s.sides.B.kills, 0)
 assert.equal(s.events.length, 2)
}
assert.equal(mapSnapshot(game, 0).gold, 0)
assert(visualGoldAt(game, 19 / 60) < 200, 'opening gold lead grows from zero')
assert(Math.abs(visualGoldAt(game, 5 - 1e-6) - visualGoldAt(game, 5 + 1e-6)) < 0.01)
assert.equal(visualGoldAt(game, 30), 5000)
assert.equal(mapSnapshot(game, 4).objectives.find(o => o.id === 'dragon').alive, false)
assert.equal(mapSnapshot(game, 5).objectives.find(o => o.id === 'dragon').alive, true)
assert.equal(mapSnapshot(game, 12).objectives.find(o => o.id === 'dragon').alive, false)
assert.equal(mapSnapshot(game, 17).objectives.find(o => o.id === 'dragon').alive, true)
assert.equal(mapSnapshot(game, 21).objectives.find(o => o.id === 'baron').alive, true)
assert.equal(mapSnapshot(game, 22).objectives.find(o => o.id === 'baron').alive, false)
const hiddenEvent = { ...game, events: [{ t: 3.1, type: 'dragon', side: 'A' }] }
assert.deepEqual(mapSnapshot(hiddenEvent, 3).players, mapSnapshot({ ...hiddenEvent, events: [] }, 3).players, 'future events cannot attract icons')
assert.equal(JSON.stringify(game), original, 'presentation preserves engine data')
assert.equal(TOWERS.length, 18)

// Ordinary lane play must not repeatedly funnel both teams through mid.
const quiet = { ...game, events: [] }
for (let minute = 3; minute < 30; minute += 0.25) {
 const s = mapSnapshot(quiet, minute)
 assert(s.players.filter(p => distance(p.point, [50, 50]) < 12).length <= 2, 'uninvolved lanes stay out of mid')
 for (let i = 0; i < s.players.length; i++) for (let j = i + 1; j < s.players.length; j++) {
  assert(distance(s.players[i].point, s.players[j].point) >= 5.5, 'living markers remain readable')
 }
}
for (const blueSide of ['A', 'B']) {
 const objective = { ...quiet, blueSide, events: [{ t: 12, type: 'dragon', side: 'A' }] }
 const rotating = mapSnapshot(objective, 12.9)
 const baseline = mapSnapshot({ ...objective, events: [] }, 12.9)
 for (const p of rotating.players.filter(p => p.role === 'TOP' || p.side === 'B')) {
  assert.deepEqual(p.point, baseline.players.find(q => q.name === p.name).point, 'dragon rotation does not summon every player')
 }
 assert.equal(rotating.players.find(p => p.name === 'AJNG').activity, 'Dragon rotation')
 for (const t of [12, 13.8]) {
  const left = mapSnapshot(objective, t - 1e-6), right = mapSnapshot(objective, t + 1e-6)
  for (const p of left.players) assert(distance(p.point, right.players.find(q => q.name === p.name).point) < .001, 'rotations start and end continuously')
 }
}
const roam = { ...quiet, coachingCall: { at: 10, side: 'A', id: 'roam' } }
for (const name of ['ATOP', 'ABOT', 'AMID']) {
 assert(distance(mapSnapshot(roam, 11).players.find(p => p.name === name).point,
  mapSnapshot(quiet, 11).players.find(p => p.name === name).point) < 3, 'roam preserves uninvolved lanes apart from marker spacing')
}
const split = mapSnapshot({ ...quiet, coachingCall: { at: 10, side: 'A', id: 'split' } }, 11)
assert(distance(split.players.find(p => p.name === 'ATOP').point, [50, 50]) > 25, 'split pusher remains in a side lane')
console.log('Map spawning, side alternation, movement, gold continuity, revealed stats and objectives pass')
