/**
 * Capture match sim layout screenshots at common viewports.
 * Usage: PREVIEW_URL=http://127.0.0.1:4173/ node scripts/match-layout-shots.mjs
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const baseUrl = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/'
const outDir = '/opt/cursor/artifacts/match-layout-verify'
mkdirSync(outDir, { recursive: true })

const viewports = [
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
]

async function waitForServer(url, ms = 60000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error(`Server not ready: ${url}`)
}

async function dismissOverlays(page) {
  await page.getByRole('button', { name: /^Leave$/i }).click({ timeout: 1500 }).catch(() => {})
  await page.getByRole('button', { name: /Close/i }).click({ timeout: 1500 }).catch(() => {})
}

async function enterIglMatch(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /One full split/i }).click()
  await page.locator('#season-year-select').selectOption({ index: 0 }).catch(async () => {
    await page.locator('.year-select').first().selectOption({ index: 0 })
  })
  const iglSwitch = page.getByRole('switch', { name: /IGL/i })
  await iglSwitch.check({ force: true })
  await page.getByRole('button', { name: /Start Season/i }).click()
  await page.getByRole('button', { name: /^Dashboard$/i }).waitFor({ timeout: 20000 })
  await dismissOverlays(page)
  await page.getByRole('button', { name: /Play Week/i }).click()
  await page.getByRole('button', { name: /Enter the Rift/i }).click()
  await page.getByRole('button', { name: /Jump to call/i }).waitFor({ timeout: 20000 })
}

await waitForServer(baseUrl)
const browser = await chromium.launch()

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    deviceScaleFactor: vp.isMobile ? 3 : 1,
  })
  const page = await context.newPage()
  await enterIglMatch(page)
  await page.screenshot({ path: `${outDir}/${vp.name}-live.png`, fullPage: false })
  await page.getByRole('button', { name: /Jump to call/i }).click()
  await page.getByRole('heading', { name: /The map is yours/i }).waitFor({ timeout: 10000 })
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${outDir}/${vp.name}-decision.png`, fullPage: false })
  await context.close()
}

await browser.close()
console.log(`Screenshots written to ${outDir}`)
