/**
 * Debug prep → lineup step at 390px. PREVIEW_URL=... node scripts/tutorial-prep-lineup-debug.mjs
 */
import { chromium } from 'playwright'
import { TUTORIAL_KEY } from '../src/game/tutorial.js'

const baseUrl = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/'

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
const page = await context.newPage()
await page.goto(baseUrl, { waitUntil: 'networkidle' })
await page.evaluate((key) => {
  localStorage.removeItem(key)
  localStorage.removeItem('lck-manager-save-v1')
}, TUTORIAL_KEY)
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('button', { name: /Start Career/i }).click()
await page.getByRole('button', { name: /^Dashboard$/i }).waitFor({ timeout: 20000 })
await page.locator('.modal-backdrop:not(.guide-backdrop) button').first().click({ timeout: 2000 }).catch(() => {})

const next = page.getByRole('button', { name: /^Next$/i })
await next.click()
await next.click()

const before = await page.evaluate(() => {
  const card = document.querySelector('.tutorial-card')
  const prep = document.querySelector('[data-tour="tour-prep"]')
  const tab = document.querySelector('[data-tour="tour-lineup-tab"]')
  const main = document.getElementById('main-content')
  return {
    eyebrow: card?.querySelector('.eyebrow')?.textContent?.trim(),
    scroll: {
      window: window.scrollY,
      doc: document.documentElement.scrollTop,
      body: document.body.scrollTop,
      main: main?.scrollTop,
      shell: document.querySelector('.app.broadcast-shell')?.scrollTop,
    },
    prep: prep?.getBoundingClientRect(),
    tab: tab?.getBoundingClientRect(),
  }
})
console.log('BEFORE NEXT (prep step):', JSON.stringify(before, null, 2))

await next.click()
await page.waitForTimeout(500)

const after = await page.evaluate(() => {
  const card = document.querySelector('.tutorial-card')
  const tab = document.querySelector('[data-tour="tour-lineup-tab"]')
  const r = tab?.getBoundingClientRect()
  const cr = card?.getBoundingClientRect()
  const main = document.getElementById('main-content')
  return {
    eyebrow: card?.querySelector('.eyebrow')?.textContent?.trim(),
    body: card?.querySelector('p:not(.eyebrow)')?.textContent?.slice(0, 60),
    scroll: {
      window: window.scrollY,
      doc: document.documentElement.scrollTop,
      body: document.body.scrollTop,
      main: main?.scrollTop,
      shell: document.querySelector('.app.broadcast-shell')?.scrollTop,
    },
    tab: r ? { top: r.top, bottom: r.bottom, visible: r.bottom > 0 && r.top < innerHeight } : null,
    card: cr ? { top: cr.top, bottom: cr.bottom, visible: cr.bottom > 0 && cr.top < innerHeight } : null,
  }
})
console.log('AFTER NEXT (lineup step):', JSON.stringify(after, null, 2))

await browser.close()
