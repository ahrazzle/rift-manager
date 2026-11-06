// Interface preferences that live in this browser only (not in the save).
export const UI_PREFS_KEY = 'rift-manager-ui-v1'
export const DEFAULT_UI_PREFS = { motion: 'system' } // 'system' | 'reduce'

export function normalizeUiPrefs(value) {
  return { motion: value?.motion === 'reduce' ? 'reduce' : 'system' }
}

export function readUiPrefs() {
  try {
    return normalizeUiPrefs(JSON.parse(globalThis.localStorage?.getItem(UI_PREFS_KEY) || 'null'))
  } catch {
    return normalizeUiPrefs(null)
  }
}

export function writeUiPrefs(value) {
  try {
    globalThis.localStorage?.setItem(UI_PREFS_KEY, JSON.stringify(normalizeUiPrefs(value)))
  } catch {
    /* Preferences are optional; the game works without storage. */
  }
}

/** Mirror the motion preference onto <html> so CSS (and portals) can follow it. */
export function applyUiPrefs(prefs) {
  const root = globalThis.document?.documentElement
  if (!root?.classList) return
  root.classList.toggle('motion-reduce', prefs.motion === 'reduce')
}
