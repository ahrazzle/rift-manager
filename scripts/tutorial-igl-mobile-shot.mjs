/**
 * IGL walkthrough tip over the decision dialog: it must never cover
 * .igl-call-grid (390 bottom sheet and 1440 centred dialog), must stay on
 * screen, and the calls must stay clickable under it.
 * PREVIEW_URL=http://localhost:4173/ node scripts/tutorial-igl-mobile-shot.mjs
 */
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { reducer } from '../src/game/useGameState.js'
import { SAVE_KEY } from '../src/game/persistence.js'
import { TUTORIAL_KEY } from '../src/game/tutorial.js'

const baseUrl = process.env.PREVIEW_URL || 'http://localhost:4173/'
const outDir = process.env.OUT_DIR || join(tmpdir(), 'rift-manager-tutorial')
mkdirSync(outDir, { recursive: true })

function iglSave() {
  let s = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', matchOptions: { igl: true } })
  s = { ...s, press: { ...(s.press || {}), pending: false } }
  s = reducer(s, { type: 'PREVIEW_MATCH', action: { type: 'PLAY_ROUND' } })
  return reducer(s, { type: 'MATCH_START' })
}
const tutorial = { version: 1, status: 'completed', mainStep: 0, seen: { matchOptions: true, igl: false, review: false, advance: false, tactics: false, strategy: false } }

const browser = await chromium.launch()
const results = []
for (const vp of [{ width: 390, height: 844, isMobile: true }, { width: 1440, height: 900 }]) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile })
  await context.addInitScript(([saveKey, save, tutKey, tut]) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.setItem(saveKey, save)
    localStorage.setItem(tutKey, tut)
  }, [SAVE_KEY, JSON.stringify(iglSave()), TUTORIAL_KEY, JSON.stringify(tutorial)])
  const page = await context.newPage()
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Skip to call/i }).click({ timeout: 25000 })
  await page.locator('.tutorial-card').waitFor({ timeout: 10000 })
  const grid = page.locator('.igl-call-grid')
  await grid.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await page.waitForTimeout(300)
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')))
  await page.waitForTimeout(200)
  const check = await page.evaluate(() => {
    const card = document.querySelector('.tutorial-card')
    const gridEl = document.querySelector('.igl-call-grid')
    if (!card || !gridEl) return { ok: false, reason: 'missing nodes' }
    const c = card.getBoundingClientRect()
    const g = gridEl.getBoundingClientRect()
    const intersects = c.left < g.right && c.right > g.left && c.top < g.bottom && c.bottom > g.top
    const onScreen = c.top >= 0 && c.left >= 0 && c.bottom <= innerHeight && c.right <= innerWidth
    // The topmost element at the centre of the first visible call must be the call itself.
    const opt = [...gridEl.querySelectorAll('.igl-call-option')].find((o) => {
      const r = o.getBoundingClientRect()
      return r.top >= g.top && r.bottom <= g.bottom
    })
    const r = opt?.getBoundingClientRect()
    const hit = r && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    const clickable = !!hit && opt.contains(hit)
    return { ok: !intersects && onScreen && clickable, intersects, onScreen, clickable, cardTop: c.top, gridTop: g.top }
  })
  const shot = `${outDir}/igl-tip-${vp.width}-scrolled-calls.png`
  await page.screenshot({ path: shot })
  results.push({ viewport: vp.width, ...check, shot })
  await context.close()
}
await browser.close()
console.log(JSON.stringify(results, null, 2))
if (results.some((r) => !r.ok)) process.exitCode = 1
