/**
 * Mobile IGL tip after scrolling call list — tip must not cover .igl-call-grid.
 * PREVIEW_URL=... node scripts/tutorial-igl-mobile-shot.mjs
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'
import { TUTORIAL_KEY } from '../src/game/tutorial.js'

const baseUrl = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/'
const outDir = '/opt/cursor/artifacts/rift-manager-tutorial'
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
const page = await context.newPage()
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
await page.evaluate((key) => {
  localStorage.setItem(
    key,
    JSON.stringify({
      version: 1,
      status: 'completed',
      mainStep: 0,
      seen: { matchOptions: true, igl: false, review: false, advance: false, tactics: false, strategy: false },
    }),
  )
  localStorage.removeItem('lck-manager-save-v1')
}, TUTORIAL_KEY)
await page.reload({ waitUntil: 'domcontentloaded' })
await page.getByRole('switch', { name: /IGL/i }).check({ force: true })
await page.getByRole('button', { name: /Start Career/i }).click()
await page.getByRole('button', { name: /^Dashboard$/i }).waitFor({ timeout: 20000 })
await page.evaluate(() => {
  const key = 'lck-manager-save-v1'
  try {
    const state = JSON.parse(localStorage.getItem(key) || 'null')
    if (state?.press) state.press.pending = false
    if (state) localStorage.setItem(key, JSON.stringify(state))
  } catch {
    /* ignore */
  }
})
await page.reload({ waitUntil: 'domcontentloaded' })
await page.getByRole('button', { name: /Play Week/i }).click()
await page.getByRole('button', { name: /Enter the Rift/i }).click()
await page.getByRole('button', { name: /Jump to call/i }).waitFor({ timeout: 25000 })
await page.getByRole('button', { name: /Jump to call/i }).click()
await page.locator('.tutorial-card').waitFor({ timeout: 10000 })
const grid = page.locator('.igl-call-grid')
await grid.evaluate((el) => {
  el.scrollTop = el.scrollHeight
})
await page.waitForTimeout(300)
await page.evaluate(() => {
  window.dispatchEvent(new Event('scroll'))
})
await page.waitForTimeout(200)
const overlap = await page.evaluate(() => {
  const card = document.querySelector('.tutorial-card')
  const gridEl = document.querySelector('.igl-call-grid')
  if (!card || !gridEl) return { ok: false, reason: 'missing nodes' }
  const c = card.getBoundingClientRect()
  const g = gridEl.getBoundingClientRect()
  const intersects =
    c.left < g.right && c.right > g.left && c.top < g.bottom && c.bottom > g.top
  return {
    ok: !intersects,
    cardTop: c.top,
    gridTop: g.top,
    intersects,
  }
})
if (!overlap.ok) {
  console.error('IGL tip overlaps call grid:', overlap)
  process.exitCode = 1
}
await page.screenshot({ path: `${outDir}/igl-tip-mobile-390-scrolled-calls.png`, fullPage: false })
await context.close()
await browser.close()
console.log('IGL mobile proof:', overlap, `→ ${outDir}/igl-tip-mobile-390-scrolled-calls.png`)
