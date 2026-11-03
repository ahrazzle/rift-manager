// ============================================================================
// Rift Manager — IGL (in-game leader) macro calls. Pure logic, no DOM.
//
// Two-pass honesty: each game is simmed once WITHOUT the call (pass 1). The
// ticker shows pass 1's early events, pauses at a mid-game moment, the player
// makes ONE macro call, then the game is re-simmed WITH the call's modifier
// (pass 2, the official result) and the ticker continues with pass 2's later
// events. The call genuinely affects the outcome because the winner comes
// from pass 2.
//
// Coaching-puzzle grading (per mobatrainer.com recon): every call is graded
// against the state-optimal call for the game state read from pass 1's
// events. buildIglPrompt returns optimalCallId + a Challenger-coach rationale.
// ============================================================================

export const IGL_CALLS = [
  {
    id: 'dragons',
    label: 'Play for dragons',
    desc: 'Stack drakes toward soul. Your team groups for every dragon timer.',
    mod: { str: 0.6 },
    flavor: 'Dragon setup begins. Your team is grouping mid.',
    // Optimal when the game is even and dragons are contested.
    when: 'even',
    edge: 'Stronger when even and drakes are contested. Denying soul decides neutral games.',
  },
  {
    id: 'herald',
    label: 'Herald into dives',
    desc: 'Take Rift Herald early, then force tower dives with the charge.',
    mod: { str: 0.6 },
    flavor: 'Herald secured. Your team is posturing for dives.',
    // Optimal when ahead — press the lead before the enemy stabilizes.
    when: 'ahead',
    edge: 'Stronger when ahead. Herald dives punish a lead before the enemy stabilizes.',
  },
  {
    id: 'scale',
    label: 'Slow down and scale',
    desc: 'Avoid fights, trade objectives, and let your carries outscale.',
    mod: { str: 0.5 },
    flavor: 'Your team backs off. No fights, just farm and vision.',
    // Optimal when behind — deny the snowball.
    when: 'behind',
    edge: 'Stronger when behind. Slowing the game denies the enemy snowball.',
  },
  {
    id: 'baron',
    label: 'Force Baron',
    desc: 'Group as five and burn Baron before the enemy can answer.',
    mod: { str: 0.7 },
    flavor: 'Your team collapses on the Baron pit. It is now or never.',
    // Optimal when ahead with Baron live (20+ min) — close the game.
    when: 'ahead-late',
    edge: 'Stronger when ahead after 20 minutes. Baron ends close games.',
  },
  {
    id: 'roam',
    label: 'Support roams mid',
    desc: 'Send support roaming to unlock mid while bot holds the wave.',
    mod: { str: 0.55 },
    flavor: 'Your support leaves bot and ghosts toward mid lane.',
    // Optimal when bot is stable but mid is losing — swing the map.
    when: 'mid-behind',
    edge: 'Stronger when mid is behind but bot holds. Roams break mid open.',
  },
  {
    id: 'split',
    label: 'Split push',
    desc: 'Send your fed top laner to the side lane and play the map.',
    mod: { str: 0.6 },
    flavor: 'Your top laner takes the side lane. The map stretches.',
    // Optimal with a fed top laner — 1v1 kingdom, 4v4 elsewhere.
    when: 'fed-top',
    edge: 'Stronger with a fed top laner. Split punishes teams that cannot answer.',
  },
  {
    id: 'group',
    label: 'Group for 5v5',
    desc: 'Ball up as five and force the teamfight on your terms.',
    mod: { str: 0.6 },
    flavor: 'Your team groups mid. The 5v5 is coming.',
    // Optimal when even with a tower lead — your comp teamfights better.
    when: 'even-ahead',
    edge: 'Stronger when even with a tower lead. Force the fight you win.',
  },
]

const CALL_BY_ID = Object.fromEntries(IGL_CALLS.map((c) => [c.id, c]))

function countEvents(events, type, side) {
  let n = 0
  for (const e of events || []) {
    if (e && e.type === type && e.side === side) n++
  }
  return n
}

// Read the mid-game state straight from pass 1's events + players + gold.
function readGameState(pass1Game, userIsA) {
  const events = pass1Game?.events ?? []
  const me = userIsA ? 'A' : 'B'
  const foe = userIsA ? 'B' : 'A'
  const myDrakes = countEvents(events, 'dragon', me)
  const foeDrakes = countEvents(events, 'dragon', foe)
  const myKills = countEvents(events, 'kill', me)
  const foeKills = countEvents(events, 'kill', foe)
  const myTowers = countEvents(events, 'tower', me)
  const foeTowers = countEvents(events, 'tower', foe)
  const myBarons = countEvents(events, 'baron', me)
  const foeBarons = countEvents(events, 'baron', foe)
  const lastT = events.length ? Math.round(events[events.length - 1].t || 0) : 0
  const minute = lastT > 0 ? lastT : Math.round((pass1Game?.durationMin || 30) / 2)
  // Gold diff (user-relative) at the split point.
  const tl = pass1Game?.goldTimeline ?? []
  let goldDiff = 0
  for (const p of tl) {
    if (p.t <= lastT) goldDiff = p.diff
    else break
  }
  if (!userIsA) goldDiff = -goldDiff
  // Lane evidence is read only from revealed kill events; final KDA is hidden.
  const panel = liveGameState({ events, players: pass1Game?.players ?? [], userIsA })
  const roleKda = {}
  for (const p of [...panel.myPlayers, ...panel.foePlayers]) roleKda[p.role + (p.mine ? '_me' : '_foe')] = p.kills - p.deaths
  return {
    me, foe, myDrakes, foeDrakes, myKills, foeKills, myTowers, foeTowers,
    myBarons, foeBarons, kd: myKills - foeKills, minute, goldDiff, roleKda,
  }
}

// Live game state for the decision panel, recomputed from REVEALED events so
// the panel updates as the ticker plays. KDA is attributed from kill events
// (killer/victim are stamped by enrichEvents); assists are not tracked per
// event and stay 0 here. Gold is read from the timeline at the last revealed
// event. Pass the pass-2 game for the late phase (the call changed it).
export function liveGameState({ events = [], goldTimeline = [], players = [], userIsA = true }) {
  const kda = {}
  for (const p of players) {
    kda[p.name] = { name: p.name, role: p.role, kills: 0, deaths: 0, assists: 0, mine: (p.side === 'A') === userIsA }
  }
  const c = { myKills: 0, foeKills: 0, myDrakes: 0, foeDrakes: 0, myTowers: 0, foeTowers: 0, myBarons: 0, foeBarons: 0 }
  let lastT = 0
  for (const e of events) {
    if (e.t > lastT) lastT = e.t
    const mine = (e.side === 'A') === userIsA
    if (e.type === 'kill') {
      if (mine) c.myKills++; else c.foeKills++
      if (e.killer && kda[e.killer]) kda[e.killer].kills++
      if (e.victim && kda[e.victim]) kda[e.victim].deaths++
    }
    else if (e.type === 'dragon') { if (mine) c.myDrakes++; else c.foeDrakes++ }
    else if (e.type === 'tower') { if (mine) c.myTowers++; else c.foeTowers++ }
    else if (e.type === 'baron') { if (mine) c.myBarons++; else c.foeBarons++ }
  }
  let goldDiff = 0
  for (const p of goldTimeline) {
    if (p.t <= lastT) goldDiff = p.diff
    else break
  }
  if (!userIsA) goldDiff = -goldDiff
  const myPlayers = Object.values(kda).filter((p) => p.mine)
  const foePlayers = Object.values(kda).filter((p) => !p.mine)
  return { minute: Math.round(lastT), goldDiff, ...c, myPlayers, foePlayers }
}

// Full game-state snapshot for the coach's decision panel.
export function getIglGameState(pass1Game, userIsA) {
  const st = readGameState(pass1Game, userIsA)
  const panel = liveGameState({ events: pass1Game?.events ?? [], players: pass1Game?.players ?? [], userIsA })
  return { ...st, myPlayers: panel.myPlayers, foePlayers: panel.foePlayers }
}

// State-optimal call for the coaching-puzzle grade.
export function optimalIglCall(pass1Game, userIsA) {
  const st = readGameState(pass1Game, userIsA)
  const { kd, goldDiff, minute, roleKda } = st
  if (kd <= -3 || goldDiff < -2500) return 'scale' // behind: slow it down, deny the snowball
  if (minute >= 20 && goldDiff > 1500) return 'baron' // ahead late: close with Baron
  const topKda = roleKda['TOP_me'] ?? 0
  if (topKda >= 3 && kd >= 0) return 'split' // fed top: stretch the map
  const midKda = roleKda['MID_me'] ?? 0
  const botKda = (roleKda['BOT_me'] ?? 0) + (roleKda['SUP_me'] ?? 0)
  if (midKda < 0 && botKda >= 0) return 'roam' // mid losing, bot stable: roam support mid
  if (kd >= 3) return 'herald' // ahead early: press with dives
  if (st.myTowers > st.foeTowers && Math.abs(kd) <= 2) return 'group' // even, tower lead: force the 5v5
  return 'dragons' // even: contested neutral game, stack toward soul
}

function rationaleFor(optimalId, st) {
  const lead = Math.abs(st.kd)
  if (optimalId === 'scale') {
    return `You're down ${lead} kills. Stop fighting. Give the drakes, keep your waves out, and let your carries outscale.`
  }
  if (optimalId === 'baron') {
    return `Up ${Math.round(st.goldDiff / 1000)}k at ${st.minute} minutes. Baron is live and you are stronger. End it now before they scale.`
  }
  if (optimalId === 'split') {
    return `Your top laner is fed. They cannot answer the side lane and the 4v4 at the same time. Stretch the map.`
  }
  if (optimalId === 'roam') {
    return `Mid is losing but bot holds. Send support roaming — break mid open and the map follows.`
  }
  if (optimalId === 'herald') {
    return `You're up ${lead} kills. Press it now. Herald into dives before they stabilize and the window closes.`
  }
  if (optimalId === 'group') {
    return `Even kills, but you are up towers. Your 5v5 is stronger — ball up and force the fight.`
  }
  const drakeLine = st.myDrakes + st.foeDrakes > 0
    ? `Dead even at ${st.myDrakes}-${st.foeDrakes} drakes.`
    : `No team has drake control yet.`
  return `${drakeLine} The next dragon timer is the game. Stack it and deny soul.`
}

export function buildIglPrompt(pass1Game, userIsA) {
  const st = readGameState(pass1Game, userIsA)
  const bits = []
  if (st.foeDrakes >= 2) bits.push(`Enemy has taken ${st.foeDrakes} dragons`)
  else if (st.myDrakes >= 2) bits.push(`You hold ${st.myDrakes} dragons`)
  else bits.push('No team has dragon control yet')
  if (st.kd >= 3) bits.push(`your team is up ${st.kd} kills`)
  else if (st.kd <= -3) bits.push(`your team is down ${-st.kd} kills`)
  else bits.push(`kills are even at ${st.myKills}-${st.foeKills}`)
  const td = st.myTowers - st.foeTowers
  if (td > 0) bits.push(`up ${td} tower${td > 1 ? 's' : ''}`)
  else if (td < 0) bits.push(`down ${-td} tower${-td > 1 ? 's' : ''}`)
  const events = pass1Game?.events ?? []
  const lastT = events.length ? Math.round(events[events.length - 1].t || 0) : 0
  const minute = lastT > 0 ? lastT : Math.round((pass1Game?.durationMin || 30) / 2)
  const context = `${bits.join('. ')}. Make the call, coach. Around the ${minute}-minute mark, what's the gameplan?`
  const optimalCallId = optimalIglCall(pass1Game, userIsA)
  const rationale = rationaleFor(optimalCallId, st)
  return { context, options: IGL_CALLS, optimalCallId, rationale }
}

export function iglCallById(id) {
  return CALL_BY_ID[id] ?? null
}

// This is a contextual strength modifier in a two-pass simulation, not an
// event-level counterfactual. The official second pass can differ globally.
export function evaluateIglCall(revealedGame, userIsA, callId) {
  const optimalCallId = optimalIglCall(revealedGame, userIsA)
  const known = Boolean(CALL_BY_ID[callId])
  return { optimalCallId, modifier: !known ? 0 : callId === optimalCallId ? 0.7 : -0.15 }
}
