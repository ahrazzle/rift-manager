// In-memory handoff between the Hub and the Result stage.
//
// App swaps the Hub for MatchExperience while a series is open, so the Hub
// unmounts and remounts around every match. Anything that has to survive that
// lives here, outside React: never in the save, gone on reload.
//
//  - Achievement baseline: which achievements the player has already been
//    shown, so an unlock is announced once (on the Result stage, or as a Hub
//    toast) instead of being absorbed into a fresh mount's baseline.
//  - Prep intent: the review room's "Plan next week" focus, picked up by the
//    Hub's Coach's office card when it mounts.
import { achievements } from '../../game/hype.js'

const memory = { key: null, seen: null, prepFocus: null }

function keyOf(state) {
  return [state?.teamId, state?.mode, state?.managerName ?? '', state?.seasonYear ?? ''].join('|')
}

/**
 * Achievements unlocked since the player last saw the list. The first call for
 * a save only records the baseline and returns [] (no toasts for history).
 */
export function takeNewAchievements(state, gamesByRound = null) {
  if (!state?.teamId) return []
  const list = achievements(state, gamesByRound)
  const now = list.filter((a) => a.unlocked).map((a) => a.id)
  const key = keyOf(state)
  if (memory.key !== key || !memory.seen) {
    memory.key = key
    memory.seen = new Set(now)
    return []
  }
  const fresh = list.filter((a) => a.unlocked && !memory.seen.has(a.id))
  for (const id of now) memory.seen.add(id)
  return fresh
}

export function setPrepIntent(focus) {
  memory.prepFocus = focus ?? null
}

export function takePrepIntent() {
  const f = memory.prepFocus
  memory.prepFocus = null
  return f
}

/** Test helper. */
export function resetHubMemory() {
  memory.key = null
  memory.seen = null
  memory.prepFocus = null
}
