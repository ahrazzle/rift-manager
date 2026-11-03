import { CHAMP_BY_ID } from '../data/champions.js'
import { champPortrait } from './draft.js'

export const MAP_DISPLAY_KEY = 'rift-manager-map-display-v1'
export const DEFAULT_MAP_DISPLAY = { names: 'players', portraits: 'champions' }
export function mapDisplay(value) {
  return {
    names: ['players', 'champions', 'both', 'hidden'].includes(value?.names) ? value.names : DEFAULT_MAP_DISPLAY.names,
    portraits: ['roles', 'players', 'champions'].includes(value?.portraits) ? value.portraits : DEFAULT_MAP_DISPLAY.portraits,
  }
}
export function readMapDisplay() {
  try { return mapDisplay(JSON.parse(globalThis.localStorage?.getItem(MAP_DISPLAY_KEY) || 'null')) }
  catch { return mapDisplay() }
}
export function writeMapDisplay(value) {
  try { globalThis.localStorage?.setItem(MAP_DISPLAY_KEY, JSON.stringify(mapDisplay(value))) }
  catch { /* Display controls still work when browser storage is unavailable. */ }
}
export function playerIdentity(game, player, display) {
  const champion = CHAMP_BY_ID[game.picks?.[player.side]?.[player.role]]
  const label = display.names === 'hidden' ? ''
    : display.names === 'champions' ? (champion?.name || player.name)
      : display.names === 'both' && champion ? `${player.name} · ${champion.name}` : player.name
  return { label, champion, portrait: display.portraits === 'champions' ? champPortrait(champion) : null,
    initials: player.name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '?' }
}
