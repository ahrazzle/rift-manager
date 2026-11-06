/** Capture mobile prep → lineup proof only. PREVIEW_URL=... node scripts/tutorial-mobile-prep-lineup-shots.mjs */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'
import { TUTORIAL_KEY } from '../src/game/tutorial.js'

const baseUrl = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/'
const outDir = '/opt/cursor/artifacts/rift-manager-tutorial'
mkdirSync(outDir, { recursive: true })

async function dismissCareerModals(page) {
  const press = page.locator('.modal-backdrop').filter({ hasText: /Press Conference/i })
  if (await press.count()) {
    await press.locator('button.tac').first().click({ timeout: 5000 }).catch(async () => {
      await press.getByRole('button', { name: /^Leave$/i }).click({ timeout: 3000 })
    })
  }
  await page.locator('.modal-backdrop:not(.guide-backdrop)').first().waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {})
  await page.locator('.modal-backdrop:not(.guide-backdrop) button').first().click({ timeout: 1500 }).catch(() => {})
}

async function waitTipEyebrowVisible(page, textPattern) {
  const reSource = textPattern instanceof RegExp ? textPattern.source : String(textPattern)
  await page.locator('.tutorial-card').filter({ hasText: textPattern }).waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForFunction((re) => {
    const el = document.querySelector('.tutorial-card')
    if (!el || !new RegExp(re, 'i').test(el.textContent || '')) return false
    const rect = el.getBoundingClientRect()
    return rect.top >= 8 && rect.bottom <= window.innerHeight - 8
  }, reSource)
}

async function waitLineupTabVisible(page) {
  await page.waitForFunction(
    () => {
      const tab = document.querySelector('[data-tour="tour-lineup-tab"]')
      const bar = document.querySelector('.topbar')
      if (!tab || !bar) return false
      const clearance = bar.getBoundingClientRect().bottom + 4
      const r = tab.getBoundingClientRect()
      return r.top >= clearance && r.bottom <= window.innerHeight - 8
    },
    undefined,
    { timeout: 15000 },
  )
}

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  recordVideo: { dir: outDir, size: { width: 390, height: 844 } },
})
const page = await context.newPage()
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
await page.evaluate((key) => {
  localStorage.removeItem(key)
  localStorage.removeItem('lck-manager-save-v1')
}, TUTORIAL_KEY)
await page.reload({ waitUntil: 'domcontentloaded' })
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
await page.getByRole('button', { name: /Play Week/i }).waitFor({ state: 'visible', timeout: 15000 })
await dismissCareerModals(page)
await page.locator('.tutorial-card').waitFor({ timeout: 15000 })
const next = page.getByRole('button', { name: /^Next$/i })
await next.click()
await next.click()
await waitTipEyebrowVisible(page, /3 of 6/)
await page.screenshot({ path: `${outDir}/mobile-prep-step-before-next.png`, fullPage: false })
await next.click()
await waitTipEyebrowVisible(page, /4 of 6/)
await page.locator('.tutorial-card').filter({ hasText: /starter per role/i }).waitFor({ state: 'visible' })
await waitLineupTabVisible(page)
await page.waitForTimeout(150)
await page.screenshot({ path: `${outDir}/mobile-lineup-step-after-next.png`, fullPage: false })
await page.waitForTimeout(500)
const video = page.video()
const videoPath = `${outDir}/mobile-prep-to-lineup-next.webm`
if (video) await video.saveAs(videoPath)
await context.close()
await browser.close()
console.log(`Mobile prep→lineup proof written to ${outDir}`)
