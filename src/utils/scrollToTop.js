/** Scroll window and primary content regions back to the top after navigation. */
export function scrollContentToTop() {
  if (typeof window === 'undefined') return
  const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'auto'
  if (typeof window.scrollTo === 'function') {
    window.scrollTo({ top: 0, left: 0, behavior })
  }
  if (typeof document === 'undefined') return
  if (document.documentElement) document.documentElement.scrollTop = 0
  if (document.body) document.body.scrollTop = 0
  const main = document.getElementById?.('main-content')
  if (main) main.scrollTop = 0
  const shell = document.querySelector?.('.app.broadcast-shell')
  if (shell) shell.scrollTop = 0
  document.querySelectorAll?.('.guide-body, .guide-modal').forEach((el) => {
    el.scrollTop = 0
  })
}
