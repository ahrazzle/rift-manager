// Production retains its original key; staging can import it but never mutates it.
export const SAVE_KEY = 'lck-manager-save-v1'
export const STAGING_SAVE_KEY = 'lck-manager-staging-save-v1'

export function saveKey(location = globalThis.window?.location) {
  const path = location?.pathname ?? ''
  const host = location?.hostname ?? ''
  return /^\/staging(?:\/|$)/.test(path) || /^lck-manager-staging[^.]*\.vercel\.app$/.test(host)
    ? STAGING_SAVE_KEY : SAVE_KEY
}

export function readSave() {
  const storage = globalThis.localStorage
  if (!storage) throw new Error('Browser storage is unavailable.')
  const key = saveKey()
  const raw = storage.getItem(key)
  // Import on first load only. The hook writes the validated/migrated state to
  // the staging key, so a malformed legacy save is never copied verbatim.
  return raw ?? (key === STAGING_SAVE_KEY ? storage.getItem(SAVE_KEY) : null)
}

export function writeSave(state) {
  const storage = globalThis.localStorage
  if (!storage) throw new Error('Browser storage is unavailable.')
  storage.setItem(saveKey(), JSON.stringify(state))
}
