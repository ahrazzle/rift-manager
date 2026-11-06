/**
 * Verify the IGL decision dialog: every call reachable (the call list scrolls
 * inside the dialog when it overflows), the last call clickable, play resumes.
 * npm run build && npx vite preview --port 4173
 * PREVIEW_URL=http://localhost:4173/ node scripts/igl-scroll-verify.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { reducer } from '../src/game/useGameState.js'
import { SAVE_KEY } from '../src/game/persistence.js'
import { TUTORIAL_KEY } from '../src/game/tutorial.js'

const baseUrl = process.env.PREVIEW_URL || 'http://localhost:4173/'
const outDir = process.env.OUT_DIR || join(tmpdir(), 'rift-igl-scroll-verify')
mkdirSync(outDir, { recursive: true })

const viewports = [
  { name: '390', width: 390, height: 844, mobile: true },
  { name: '1280', width: 1280, height: 800 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
]

// A Season save that is one click from the first IGL call (no UI walk needed).
function iglSave() {
  let s = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', matchOptions: { igl: true } })
  s = { ...s, press: { ...(s.press || {}), pending: false } }
  s = reducer(s, { type: 'PREVIEW_MATCH', action: { type: 'PLAY_ROUND' } })
  return reducer(s, { type: 'MATCH_START' })
}
const tutorialDone = { version: 1, status: 'skipped', mainStep: 0, seen: { matchOptions: true, igl: true, review: true, advance: true, tactics: true, strategy: true } }

async function enterDecision(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Skip to call/i }).click({ timeout: 20000 })
  await page.getByRole('dialog', { name: /How do we play it/i }).waitFor()
}

const browser = await chromium.launch()
const report = []

for (const vp of viewports) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.mobile })
  await context.addInitScript(([saveKey, save, tutKey, tut]) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.setItem(saveKey, save)
    localStorage.setItem(tutKey, tut)
  }, [SAVE_KEY, JSON.stringify(iglSave()), TUTORIAL_KEY, JSON.stringify(tutorialDone)])
  const page = await context.newPage()
  await enterDecision(page)

  const grid = page.locator('.igl-decision .igl-call-grid')
  const options = page.locator('.igl-call-option')
  const count = await options.count()
  const last = options.nth(count - 1)
  const lastLabel = await last.locator('strong').textContent()
  const firstFocused = await options.first().evaluate((el) => el === document.activeElement)

  await page.screenshot({ path: `${outDir}/${vp.name}-before-scroll.png` })
  const before = await grid.evaluate((el) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    overflowY: getComputedStyle(el).overflowY,
  }))
  await grid.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${outDir}/${vp.name}-after-scroll-bottom.png` })

  const lastVisible = await last.evaluate((el) => {
    const list = el.closest('.igl-call-grid')
    const r = el.getBoundingClientRect()
    const g = list.getBoundingClientRect()
    return r.top >= g.top - 2 && r.bottom <= g.bottom + 2 && r.bottom <= innerHeight
  })

  await last.click()
  await page.waitForFunction(() => !document.querySelector('.igl-decision'), { timeout: 5000 })
  const resumed = !(await page.locator('.igl-decision').count())
  const posted = await page.locator('.feed-pin').count()

  report.push({
    viewport: `${vp.width}x${vp.height}`,
    optionCount: count,
    lastLabel: lastLabel?.trim(),
    overflows: before.scrollHeight > before.clientHeight + 4,
    overflowY: before.overflowY,
    firstOptionFocused: firstFocused,
    lastFullyVisible: lastVisible,
    clickResumed: resumed,
    postedToFeed: posted === 1,
  })
  await context.close()
}

await browser.close()
writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))

const failed = report.some(
  (r) => r.optionCount !== 7 || !r.lastFullyVisible || !r.clickResumed || !r.firstOptionFocused || !r.postedToFeed || r.overflowY !== 'auto',
)
if (failed) process.exit(1)
