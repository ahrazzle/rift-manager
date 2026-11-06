/** Viewports at or below this width use instant scroll for tour anchors (mobile). */
export const TUTORIAL_MOBILE_MAX_WIDTH = 767

/** Hub tour steps that target season nav tab buttons (may be scrolled off-screen on mobile). */
export const TAB_TOUR_ANCHORS = new Set([
  'tour-lineup-tab',
  'tour-market-tab',
  'tour-squad-tab',
  'tour-tactics-tab',
  'tour-strategy-tab',
])

export function tutorialScrollBehavior({ reducedMotion = false, viewportWidth } = {}) {
  if (reducedMotion) return 'auto'
  const w = viewportWidth ?? globalThis.innerWidth ?? 800
  if (w <= TUTORIAL_MOBILE_MAX_WIDTH) return 'auto'
  return 'smooth'
}

export function tutorialScrollBlock(anchor, viewportWidth) {
  const w = viewportWidth ?? globalThis.innerWidth ?? 800
  if (anchor && TAB_TOUR_ANCHORS.has(anchor) && w <= TUTORIAL_MOBILE_MAX_WIDTH) return 'center'
  return 'nearest'
}

export function readStickyTopInset() {
  if (typeof globalThis.document?.querySelector !== 'function') return 76
  const bar = globalThis.document.querySelector('.topbar')
  if (!bar) return 76
  return Math.ceil(bar.getBoundingClientRect().height) + 12
}

/** Step-change only — nudge window scroll so anchor sits below sticky topbar. */
export function nudgeAnchorBelowTopbar(el, behavior = 'auto') {
  if (!el?.getBoundingClientRect || typeof globalThis.window?.scrollBy !== 'function') return
  const clearance = readStickyTopInset()
  const rect = el.getBoundingClientRect()
  const vh = globalThis.innerHeight ?? 800
  let delta = 0
  if (rect.top < clearance) delta = rect.top - clearance
  else if (rect.bottom > vh - 12) delta = rect.bottom - vh + 12
  if (delta !== 0) globalThis.window.scrollBy({ top: delta, left: 0, behavior })
}

/** Step-change only — never call from scroll/resize listeners. */
export function scrollTourAnchorIntoView(el, anchor, { reducedMotion = false, viewportWidth } = {}) {
  if (!el?.scrollIntoView) return
  const w = viewportWidth ?? globalThis.innerWidth ?? 800
  const behavior = tutorialScrollBehavior({ reducedMotion, viewportWidth: w })
  el.scrollIntoView({
    block: tutorialScrollBlock(anchor, w),
    inline: 'nearest',
    behavior,
  })
  if (anchor && TAB_TOUR_ANCHORS.has(anchor) && w <= TUTORIAL_MOBILE_MAX_WIDTH) {
    nudgeAnchorBelowTopbar(el, behavior)
  }
}
