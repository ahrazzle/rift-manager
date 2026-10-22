import { champsForRole } from '../data/champions.js'

export function comfortChamps(player) {
  const pool = champsForRole(player.role)
  if (!pool.length) return []
  let h = 2166136261
  const s = String(player.id || player.name || '?')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return [...new Set([0, 1, 2].map((k) => pool[(h >>> (k * 7)) % pool.length].id))]
}
