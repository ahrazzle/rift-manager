/** Viewports at or below this width use instant scroll for tour anchors (mobile). */
export const TUTORIAL_MOBILE_MAX_WIDTH = 767

export function tutorialScrollBehavior({ reducedMotion = false, viewportWidth } = {}) {
  if (reducedMotion) return 'auto'
  const w = viewportWidth ?? globalThis.innerWidth ?? 800
  if (w <= TUTORIAL_MOBILE_MAX_WIDTH) return 'auto'
  return 'smooth'
}
