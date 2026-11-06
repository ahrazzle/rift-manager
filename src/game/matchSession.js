import { simulateSeries, simulateSingleGame } from '../engine/sim.js'
import {
  createDraft, applyBan, applyPick, applyFlex, applyFlexReserved, assignFlex,
  swapPicks, movePick, flexIntoFilledRole,
  currentStep, aiDraftMove, scoreComp, PERSONALITY_IDS, draftReadyToPlay,
  repairEnemyFlexMatching,
} from './draft.js'
import { buildIglPrompt, evaluateIglCall, iglCallById } from './igl.js'
import { comfortChamps } from './comfort.js'
import { mulberry32 } from './random.js'

export const MATCH_OPTIONS = { draft: false, igl: false, showSimulation: false }
export function matchOptions(value = {}) {
  return Object.fromEntries(Object.keys(MATCH_OPTIONS).map((key) => [key, value?.[key] === true]))
}

/** All champion ids locked in this draft (committed + flex), for Fearless */
export function draftChampIdsForFearless(draft) {
  const ids = []
  for (const side of ['BLUE', 'RED']) {
    for (const cid of Object.values(draft.picks[side] ?? {})) ids.push(cid)
    for (const e of draft.flex?.[side] ?? []) ids.push(e.champId)
  }
  return [...new Set(ids)]
}

export function mergeFearlessAfterDraft(session, draft) {
  if (!session.fearlessActive || !draft?.done || !draftReadyToPlay(draft)) return session
  const add = draftChampIdsForFearless(draft)
  return { ...session, fearlessUsed: [...new Set([...(session.fearlessUsed ?? []), ...add])] }
}

export function createMatchSession(context, options) {
  const opts = matchOptions(options)
  return { version: 1, stage: 'setup', context, options: opts,
    aWins: 0, bWins: 0, games: [], logs: [], current: null, draft: null,
    aiPersonality: PERSONALITY_IDS[context.seed % PERSONALITY_IDS.length],
    fearlessUsed: [],
    fearlessActive: !!(opts.draft && context.fearlessDraft),
  }
}

export function gameExtra(session) {
  const { context: c, draft } = session
  const extra = { ...c.extra, gameIndex: session.games.length + 1,
    deciding: session.aWins === 1 && session.bWins === 1,
    previousWinner: session.games.at(-1)?.winner }
  if (draft?.done && draftReadyToPlay(draft)) {
    const homeBlue = session.games.length % 2 === 0
    const aPicks = draft.picks[homeBlue ? 'BLUE' : 'RED']
    const bPicks = draft.picks[homeBlue ? 'RED' : 'BLUE']
    const comfort = (lineup, picks) => Math.min(0.45,
      Object.entries(picks).filter(([role, champ]) => lineup[role] && comfortChamps(lineup[role]).includes(champ)).length * 0.15)
    extra.aBonus = (extra.aBonus || 0) + scoreComp(aPicks).bonus + comfort(c.homeLineup, aPicks)
    extra.bBonus = (extra.bBonus || 0) + scoreComp(bPicks).bonus + comfort(c.awayLineup, bPicks)
    extra.picks = { A: aPicks, B: bPicks }
  }
  return extra
}

function single(session, extra, seed) {
  const c = session.context
  return simulateSingleGame(c.homeLineup, c.homeTactic, c.awayLineup, c.awayTactic,
    mulberry32(seed), c.homeName, c.awayName, extra)
}

function mergeReveals(previous, incoming) {
  if (!incoming) return previous
  if (!previous) return incoming
  const next = structuredClone(incoming)
  for (const side of ['A', 'B']) for (const [role, player] of Object.entries(next[side] || {})) {
    player.traits = (player.traits || []).map((t) => ({ ...t,
      revealed: t.revealed || previous[side]?.[role]?.traits?.some((old) => old.id === t.id && old.revealed) }))
  }
  return next
}

export function startSessionGame(session) {
  const draftIncomplete = session.options.draft && (!session.draft?.done || !draftReadyToPlay(session.draft))
  if (draftIncomplete) {
    const homeBlue = session.games.length % 2 === 0
    const userHome = session.context.userSide !== 'away'
    const userSide = homeBlue === userHome ? 'BLUE' : 'RED'
    const fearlessIds = session.fearlessActive ? (session.fearlessUsed ?? []) : []
    return { ...session, stage: 'draft', current: null,
      draft: session.draft ?? createDraft(userSide, { fearlessIds }) }
  }
  const seed = (session.context.seed + session.games.length * 2654435761) >>> 0
  const extra = gameExtra(session)
  const output = single(session, extra, seed)
  const game = { ...output.game, picks: extra.picks ?? null, blueSide: session.games.length % 2 === 0 ? 'A' : 'B' }
  const decisionAt = Math.max(10, Math.min(24, Math.round(game.durationMin * 0.55)))
  const revealed = { ...game, events: game.events.filter((e) => e.t <= decisionAt) }
  return { ...session, stage: session.options.igl || session.options.showSimulation ? 'map' : 'game',
    snapshots: mergeReveals(session.snapshots, output.lineups),
    current: { game, seed, extra, decisionAt, cursor: 0, callId: null,
      prompt: session.options.igl ? buildIglPrompt(revealed, session.context.userSide !== 'away') : null,
      log: output.log || [] } }
}

export function startMatchSession(session) {
  if (session.stage !== 'setup') return session
  // Watching alone never changes the underlying resolver or RNG stream.
  if (!session.options.draft && !session.options.igl) {
    const c = session.context
    const output = c.needWins === 1
      ? single(session, { ...c.extra, gameIndex: 1 }, c.seed)
      : simulateSeries(c.homeLineup, c.homeTactic, c.awayLineup, c.awayTactic,
        mulberry32(c.seed), c.homeName, c.awayName, c.extra)
    const result = c.needWins === 1 ? { winner: output.game.winner, aWins: Number(output.aWon),
      bWins: Number(!output.aWon), games: [output.game], log: output.log, lineups: output.lineups } : output
    if (!session.options.showSimulation) return { ...session, stage: 'complete', games: result.games,
      aWins: result.aWins, bWins: result.bWins, logs: result.log, snapshots: result.lineups }
    return { ...session, stage: 'map', automatic: result,
      current: { game: result.games[0], cursor: 0, callId: null } }
  }
  return startSessionGame(session)
}

export function changeSessionDraft(session, action) {
  if (session.stage !== 'draft' || !session.draft) return session
  const dr = session.draft

  if (action.type === 'MATCH_DRAFT_ASSIGN_FLEX') {
    try {
      const draft = assignFlex(dr, dr.userSide, action.champId, action.role)
      return mergeFearlessAfterDraft({ ...session, draft }, draft)
    } catch { return session }
  }

  if (action.type === 'MATCH_DRAFT_REARRANGE') {
    if (dr.userSide !== action.side) return session
    try {
      let draft = dr
      if (action.op === 'swap') draft = swapPicks(dr, action.side, action.roleA, action.roleB)
      else if (action.op === 'move') draft = movePick(dr, action.side, action.fromRole, action.toRole)
      else if (action.op === 'flexIntoFilled') draft = flexIntoFilledRole(dr, action.side, action.flexChampId, action.targetRole)
      else return session
      draft = repairEnemyFlexMatching(draft, mulberry32(session.context.seed + 77))
      return mergeFearlessAfterDraft({ ...session, draft }, draft)
    } catch { return session }
  }

  if (dr.done) return session

  const step = currentStep(dr)
  if (!step) return session
  const isUser = step.side === dr.userSide
  let move = action
  if (action.type === 'MATCH_DRAFT_AI') {
    if (isUser) return session
    move = aiDraftMove(dr, mulberry32(session.context.seed + dr.step + session.games.length * 101), session.aiPersonality)
  } else if (!isUser) return session
  try {
    const isBan = action.type === 'MATCH_DRAFT_AI' ? move.type === 'ban' : action.type === 'MATCH_DRAFT_BAN'
    if (isBan) {
      const draft = applyBan(dr, move.champId)
      return mergeFearlessAfterDraft({ ...session, draft }, draft)
    }
    if (action.type === 'MATCH_DRAFT_AI' && move.flex) {
      const draft = applyFlexReserved(dr, move.champId, move.role)
      return mergeFearlessAfterDraft({ ...session, draft }, draft)
    }
    if (action.type === 'MATCH_DRAFT_FLEX') {
      const draft = applyFlex(dr, move.champId)
      return mergeFearlessAfterDraft({ ...session, draft }, draft)
    }
    const draft = repairEnemyFlexMatching(
      applyPick(dr, move.champId, move.role),
      mulberry32(session.context.seed + 77),
    )
    return mergeFearlessAfterDraft({ ...session, draft }, draft)
  } catch { return session }
}

export function goldAt(game, minute) {
  const points = game.goldTimeline || []
  if (!points.length) return 0
  let last = points[0]
  for (const point of points.slice(1)) {
    if (point.t >= minute) {
      const ratio = Math.max(0, Math.min(1, (minute - last.t) / (point.t - last.t || 1)))
      return last.diff + (point.diff - last.diff) * ratio
    }
    last = point
  }
  return last.diff
}

// The visible prefix is authoritative. A call generates only the unseen
// continuation; displayed history and its gold boundary can never be rewritten.
export function continueFromCheckpoint(before, candidate, checkpoint) {
  const durationMin = Math.max(checkpoint + 2, candidate.durationMin)
  const delta = goldAt(before, checkpoint) - goldAt(candidate, checkpoint)
  const goldTimeline = [
    ...before.goldTimeline.filter((p) => p.t < checkpoint),
    { t: checkpoint, diff: goldAt(before, checkpoint) },
    ...candidate.goldTimeline.filter((p) => p.t > checkpoint).map((p) => ({ ...p,
      diff: p.diff + delta * (1 - (p.t - checkpoint) / (durationMin - checkpoint)) })),
  ]
  if (goldTimeline.at(-1)?.t < durationMin) goldTimeline.push({ t: durationMin, diff: candidate.winner === 'A' ? 5000 : -5000 })
  const events = [...before.events.filter((e) => e.t <= checkpoint), ...candidate.events.filter((e) => e.t > checkpoint)]
  // Per-player combat totals come from this one canonical timeline, so the map,
  // scoreboard, final detail and replay all describe the same events.
  const players = candidate.players.map((p) => {
    const kills = events.filter((e) => e.type === 'kill' && e.side === p.side && e.killer === p.name).length
    const deaths = events.filter((e) => e.type === 'kill' && e.side !== p.side && e.victim === p.name).length
    const total = events.filter((e) => e.type === 'kill' && e.side === p.side).length
    return { ...p, kills, deaths, assists: 0, kp: total ? kills / total : 0 }
  })
  return { ...candidate, durationMin, goldTimeline, events, players,
    killsA: players.filter((p) => p.side === 'A').reduce((n, p) => n + p.kills, 0),
    killsB: players.filter((p) => p.side === 'B').reduce((n, p) => n + p.kills, 0) }
}

export function makeSessionCall(session, callId) {
  if (session.stage !== 'decision' || !session.options.igl || session.current.callId || !iglCallById(callId)) return session
  const cur = session.current
  const userA = session.context.userSide !== 'away'
  const revealed = { ...cur.game, events: cur.game.events.filter((e) => e.t <= cur.decisionAt) }
  const evaluation = evaluateIglCall(revealed, userA, callId)
  const bonusKey = userA ? 'aBonus' : 'bBonus'
  const output = single(session, { ...cur.extra, [bonusKey]: (cur.extra[bonusKey] || 0) + evaluation.modifier }, cur.seed)
  const game = { ...continueFromCheckpoint(cur.game, output.game, cur.decisionAt),
    picks: cur.game.picks, blueSide: cur.game.blueSide, coachingCall: { id: callId, at: cur.decisionAt, side: userA ? 'A' : 'B', modifier: evaluation.modifier } }
  return { ...session, stage: 'map', current: { ...cur, game, callId, evaluation, cursor: cur.decisionAt },
    snapshots: mergeReveals(session.snapshots, output.lineups) }
}

export function finishSessionGame(session) {
  if (!['map', 'game'].includes(session.stage) || !session.current || (session.options.igl && !session.current.callId)) return session
  const game = session.current.game
  const aWins = session.aWins + Number(game.winner === 'A')
  const bWins = session.bWins + Number(game.winner === 'B')
  const complete = Math.max(aWins, bWins) >= session.context.needWins
  return { ...session, stage: complete ? 'complete' : 'between', aWins, bWins,
    games: [...session.games, game],
    snapshots: session.automatic?.lineups ?? session.snapshots,
    logs: [...session.logs, ...(session.current.log || []), `Game ${game.game}: ${game.winner === 'A' ? session.context.homeName : session.context.awayName} wins.`] }
}

export function nextSessionGame(session) {
  if (session.stage !== 'between') return session
  if (session.automatic) return { ...session, stage: 'map', current: { game: session.automatic.games[session.games.length], cursor: 0, callId: null } }
  return startSessionGame({ ...session, draft: null, current: null })
}

export function sessionResult(session) {
  return { winner: session.aWins > session.bWins ? 'A' : 'B', aWins: session.aWins, bWins: session.bWins,
    games: session.games, log: session.logs, lineups: session.snapshots }
}
