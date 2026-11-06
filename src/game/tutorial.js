export const TUTORIAL_KEY = 'rift-manager-tutorial-v1'

export const DEFAULT_SEEN = {
  matchOptions: false,
  igl: false,
  review: false,
  advance: false,
  tactics: false,
  strategy: false,
}

export const END_CARD_COPY =
  'That’s the loop: prepare, decide, watch, adjust. Open Guide anytime. Replay this walkthrough from Guide when you want a refresher.'

const STEP_COPY = {
  matchOptions:
    'Draft, IGL, and Show simulation are optional. IGL pauses the map once per game for your macro call — a strong pick on your first run if you want coaching on the map. Defaults are off. Turn on what you want before you start.',
  board:
    'The board sets your job and tracks confidence out of 100. Hit zero in Career and you are sacked. Budget pays signing fees. Both live in Club.',
  matchup:
    'Each week shows your next series and an estimated win chance. Treat the percent as a forecast, not a promise.',
  prep:
    'Coach’s office is optional prep. Each session lists its exact form and match bonus. Form carries; matchup prep expires after this series.',
  lineup:
    'Team › Lineup: set one starter per role. Form rises and falls with results. Rotate cold starters.',
  market:
    'Team › Market holds free agents. Fees come from your budget; unaffordable deals stay disabled. A signing becomes that role’s starter.',
  squad:
    'Team › Squad holds trades and your head coach. Career free agents still sign from offseason and academy flows. Check the Guide for the full front office.',
  playWeek:
    'When you are ready, Play Week. You decide the plan; the sim resolves the series. Then read the result and adjust next week.',
  tactics:
    'Tactics set style and phase for the whole series. Early and Late counter each other; Balanced is the safe default.',
  strategy:
    'Strategy is an optional gameplan. Stacked bonuses clamp; you can leave everything on default.',
  igl:
    'One call per game. Pick a macro read from the events you already saw. A good fit gives a small strength bonus; a poor fit a small penalty. Play continues. It does not rewrite what you watched.',
  review:
    'The review room counts recorded dragons, towers, and barons, then suggests a prep focus. Use Plan next week to carry that into Coach’s office.',
  advance:
    'Advance Season closes the Career split: players age and change OVR, contracts move, the off-season report lists what changed, and the free-agent market refreshes for signing. Season mode has no annual growth tick.',
}

const HUB_KEYS = {
  career: ['board', 'matchup', 'prep', 'lineup', 'squad', 'playWeek'],
  season: ['board', 'matchup', 'prep', 'lineup', 'market', 'playWeek'],
}

// Nav anchors live in the shell (components/shell): lineup, market and squad
// point at the Team destination (rail on desktop, tabbar on mobile); the board
// step points at the topbar board chip on desktop and the Club tab on mobile.
// Tactics/Strategy tips point at the Team page's segment tabs.
const ANCHORS = {
  matchOptions: 'tour-match-options',
  board: 'tour-board',
  matchup: 'tour-matchup',
  prep: 'tour-prep',
  lineup: 'tour-team-nav',
  market: 'tour-team-nav',
  squad: 'tour-team-nav',
  playWeek: 'tour-play-week',
  tactics: 'tour-tactics-tab',
  strategy: 'tour-strategy-tab',
  igl: 'tour-igl-decision',
  review: 'tour-review',
  advance: 'tour-advance-season',
}

/** @param {'career'|'season'} mode */
export function hubStepKeys(mode) {
  return HUB_KEYS[mode] ? [...HUB_KEYS[mode]] : []
}

export function hubStepsForMode(mode) {
  return hubStepKeys(mode).map((key) => ({
    key,
    anchor: ANCHORS[key],
    copy: STEP_COPY[key],
    ensureTab:
      key === 'playWeek' ? 'dashboard' : null,
  }))
}

export function contextualTipDef(id) {
  if (!STEP_COPY[id]) return null
  return { id, anchor: ANCHORS[id], copy: STEP_COPY[id], seenKey: id === 'matchOptions' ? 'matchOptions' : id }
}

export function normalizeTutorial(value) {
  const seen = { ...DEFAULT_SEEN }
  if (value?.seen && typeof value.seen === 'object') {
    for (const k of Object.keys(DEFAULT_SEEN)) {
      if (typeof value.seen[k] === 'boolean') seen[k] = value.seen[k]
    }
  }
  const status = ['pending', 'completed', 'skipped'].includes(value?.status) ? value.status : 'pending'
  const mainStep = Number.isFinite(value?.mainStep) && value.mainStep >= 0 ? Math.floor(value.mainStep) : 0
  return { version: 1, status, mainStep, seen }
}

export function readTutorial() {
  try {
    return normalizeTutorial(JSON.parse(globalThis.localStorage?.getItem(TUTORIAL_KEY) || 'null'))
  } catch {
    return normalizeTutorial(null)
  }
}

export function writeTutorial(value) {
  try {
    globalThis.localStorage?.setItem(TUTORIAL_KEY, JSON.stringify(normalizeTutorial(value)))
  } catch {
    /* Tutorial prefs are optional UX; game still works without storage. */
  }
}

export function replayTutorialState() {
  return normalizeTutorial({ status: 'pending', mainStep: 0, seen: { ...DEFAULT_SEEN } })
}

export function allowsAutoTips(tutorial) {
  return tutorial.status === 'pending' || tutorial.status === 'completed'
}

export function shouldRunHubTour(state, tutorial) {
  if (tutorial.status !== 'pending') return false
  if (state.matchSession) return false
  if (!state.teamId) return false
  const mode = state.mode
  if (mode === 'campaign' || mode === 'gauntlet') return false
  return mode === 'career' || mode === 'season'
}

export function hubModesForState(state) {
  if (state.mode === 'career') return 'career'
  if (state.mode === 'season') return 'season'
  return null
}

export function shouldShowAdvanceTip(state, tutorial) {
  if (!allowsAutoTips(tutorial) || tutorial.seen.advance) return false
  if (state.mode !== 'career') return false
  if (state.matchSession) return false
  if (!state.finished) return false
  return !!(state.career && state.career.status === 'active')
}

export function markSeen(tutorial, key) {
  if (!(key in DEFAULT_SEEN)) return tutorial
  return normalizeTutorial({ ...tutorial, seen: { ...tutorial.seen, [key]: true } })
}
