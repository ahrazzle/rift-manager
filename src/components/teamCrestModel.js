// Club crest model: pure, deterministic, no DOM. TeamCrest.jsx draws what this describes.
// Every club is the same shield + monogram. The ten current LCK clubs use curated
// colours and no motif (the Broadcast Night marks); every other club takes its colour
// from teamMeta (or today's hashed palette) and a small motif picked from its id.
import { SEASONS, SEASON_ORDER } from '../data/seasons.js'
import { CAMPAIGNS } from '../data/campaigns.js'

export const MOTIFS = ['band', 'stripes', 'chevron', 'tower', 'canton']

// Curated current-LCK set (colour and monogram from the Broadcast Night crest assets).
const LCK_TEN = {
  T1: '#e2012d', GEN: '#aa8a00', HLE: '#ff7a00', DK: '#002fa7', KT: '#ff0000',
  DRX: '#1f4fff', KDF: '#00b3a4', FOX: '#22c55e', BRO: '#7a00ff', NS: '#d6001c',
}
export const LCK_TEN_IDS = Object.keys(LCK_TEN)

// Same hashed palette the old fallback used, so an unknown club keeps its colour.
const FALLBACK_COLORS = ['#97bdff', '#6acdbc', '#c8a1f5', '#feb487', '#a9d77c', '#ec93aa']

const hex = (c) => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(c || '').trim())
  if (!m) return null
  const h = m[1].length === 3 ? [...m[1]].map((x) => x + x).join('') : m[1]
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const mix = (rgb, to, t) => rgb.map((v, i) => v + (to[i] - v) * t)

const WHITE = [255, 255, 255]
const BLACK = [0, 0, 0]
export const SURFACE_BG = [11, 15, 21] // --bg, #0b0f15
const MIN_TEXT_CONTRAST = 3.6 // monogram is large bold text; 3:1 is the floor, this leaves margin

// Darken the club colour until the white monogram holds contrast; return the shield fill
// and a lightened rim so a dark club (DK #002fa7) still separates from --bg.
export function shieldColors(color) {
  let fill = hex(color) ?? hex(FALLBACK_COLORS[0])
  for (let i = 0; i < 40 && contrast(WHITE, fill) < MIN_TEXT_CONTRAST; i++) fill = mix(fill, BLACK, 0.04)
  const rim = contrast(fill, SURFACE_BG) < 4 ? mix(fill, WHITE, 0.55) : mix(fill, WHITE, 0.3)
  return { fill: toHex(fill), rim: toHex(rim) }
}

const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
const sum = (s) => Array.from(s).reduce((n, c) => n + c.charCodeAt(0), 0)

// teamMeta-like registry (id -> {short,color,name}) from every season and campaign extra.
// First sighting wins, present-day datasets first, so an id resolves the same way each run.
const META = new Map()
function addMeta(t) { if (t?.id && !META.has(t.id)) META.set(t.id, { short: t.short, color: t.color, name: t.name }) }
for (const sid of SEASON_ORDER) for (const t of SEASONS[sid]?.teams ?? []) addMeta(t)
for (const sid of Object.keys(SEASONS)) for (const t of SEASONS[sid].teams) addMeta(t) // legacy ids outside SEASON_ORDER
for (const c of CAMPAIGNS) for (const t of c.extraTeams ?? []) addMeta(t)
export const KNOWN_CREST_IDS = [...META.keys()]

function monogramFor(id, name) {
  const tail = id.includes(':') ? id.split(':').pop() : id
  const clean = (tail.includes('_') ? tail.split('_').slice(1).join('') : tail).replace(/[^A-Za-z0-9]/g, '')
  if (clean) return clean.slice(0, 4).toUpperCase()
  const words = String(name || '').match(/[A-Za-z0-9]+/g)
  return words ? words.map((w) => w[0]).join('').slice(0, 3).toUpperCase() : '?'
}

// crestSpec(teamId, { name, short, color }): never throws; unknown ids get the fallback.
export function crestSpec(teamId, { name, short, color } = {}) {
  const id = String(teamId ?? name ?? '')
  const key = id.toUpperCase()
  const meta = META.get(id) ?? {}
  const curated = Object.hasOwn(LCK_TEN, key) ? key : null
  const baseColor = curated ? LCK_TEN[curated] : color ?? meta.color ?? FALLBACK_COLORS[sum(key) % FALLBACK_COLORS.length]
  const mono = curated ?? String(short ?? meta.short ?? monogramFor(id, name ?? meta.name)).replace(/\s+/g, '').slice(0, 4).toUpperCase()
  const { fill, rim } = shieldColors(baseColor)
  return {
    id, curated: !!curated, monogram: mono || '?', fill, rim,
    motif: curated ? null : MOTIFS[hash(key) % MOTIFS.length],
  }
}
