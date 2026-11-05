/**
 * Measure document scrollWidth on Lineup at 375px (Season + Career).
 * Usage: npm run build && vite preview --port 4173 & node scripts/lineup-scroll-check.mjs
 */
import { chromium } from 'playwright'

const baseUrl = process.env.PREVIEW_URL || 'http://localhost:4173/'
const MAX_SCROLL = Number(process.env.LINEUP_MAX_SCROLL_WIDTH || 541)

async function waitForServer(url, ms = 60000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error(`Server not ready: ${url}`)
}

async function scrollWidthOnLineup(page, startFn) {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(baseUrl)
  await page.evaluate(() => { try { localStorage.clear() } catch { /* noop */ } })
  await page.reload()
  await startFn(page)
  await page.getByRole('button', { name: /^Leave$/i }).click({ timeout: 3000 }).catch(() => {})
  await page.getByRole('navigation').getByRole('button', { name: /^Lineup$/i }).click()
  await page.locator('.plrow').first().waitFor({ timeout: 15000 })
  await page.waitForTimeout(200)
  return page.evaluate(() => document.documentElement.scrollWidth)
}

async function startSeason(page) {
  await page.getByRole('button', { name: /Season/i }).first().click()
  await page.getByRole('button', { name: /Start Season/i }).click()
  await page.getByRole('button', { name: /^Dashboard$/i }).waitFor({ timeout: 15000 })
}

async function startCareer(page) {
  await page.getByRole('button', { name: /Start Career/i }).click()
  await page.getByRole('button', { name: /^Dashboard$/i }).waitFor({ timeout: 15000 })
}

await waitForServer(baseUrl)
const browser = await chromium.launch()
const page = await browser.newPage()
const season = await scrollWidthOnLineup(page, startSeason)
const career = await scrollWidthOnLineup(page, startCareer)
await browser.close()

const results = { viewport: 375, season, career, maxAllowed: MAX_SCROLL }
console.log(JSON.stringify(results, null, 2))
const ok = season <= MAX_SCROLL && career <= MAX_SCROLL
if (!ok) {
  console.error(`FAIL: scrollWidth must be ≤ ${MAX_SCROLL} (season ${season}, career ${career})`)
  process.exit(1)
}
console.log('ok: Lineup scrollWidth within baseline')
