import { useState } from 'react'
import { CHAMP_BY_ID } from '../../data/champions.js'
import { champPortrait } from '../../game/draft.js'
import { cx } from './cx.js'

/** Stable hue (0–359) from a champion id, so a glyph keeps its colour everywhere. */
export function glyphHue(id) {
  let h = 0
  for (const ch of String(id ?? '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % 360
}

/** Two-letter monogram from the display name ("K'Sante" -> "Ks", "Dr. Mundo" -> "Dr"). */
export function glyphMonogram(name) {
  const letters = String(name ?? '').replace(/[^A-Za-z]/g, '')
  if (!letters) return '?'
  return letters.charAt(0).toUpperCase() + letters.charAt(1).toLowerCase()
}

/**
 * ChampGlyph: original monogram tile (no game art). The fallback whenever a
 * portrait is missing or fails to load. Decorative: the champion's name is
 * always printed or announced next to it.
 */
export function ChampGlyph({ champId, size, className }) {
  const champ = CHAMP_BY_ID[champId]
  const style = { '--h': glyphHue(champId) }
  if (size) {
    style.width = size
    style.height = size
    style['--gfs'] = `${Math.max(9, Math.round(size * 0.36))}px`
  }
  return (
    <span className={cx('champ-glyph', className)} style={style} aria-hidden="true" data-glyph={champId}>
      <span>{glyphMonogram(champ?.name ?? champId)}</span>
    </span>
  )
}

/**
 * ChampArt: the champion portrait (Data Dragon, all 173 champions) with
 * ChampGlyph as the fallback on a missing file or a load error.
 */
export function ChampArt({ champId, size, className }) {
  // Remember which id failed, so a slot that later shows another champion retries.
  const [failedId, setFailedId] = useState(null)
  const url = champPortrait(champId)
  if (!url || failedId === champId) return <ChampGlyph champId={champId} size={size} className={className} />
  const style = size ? { width: size, height: size } : undefined
  return (
    <img
      className={cx('champ-art', className)}
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
      draggable="false"
      style={style}
      onError={() => setFailedId(champId)}
    />
  )
}
