/**
 * Capture first-run walkthrough screenshots for staging proof.
 * Usage: PREVIEW_URL=http://127.0.0.1:4173/ node scripts/tutorial-shots.mjs
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'
import { TUTORIAL_KEY } from '../src/game/tutorial.js'

const baseUrl = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/'
const outDir = '/opt/cursor/artifacts/rift-manager-tutorial'
mkdirSync(outDir, { recursive: true })

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

async function dismissCareerModals(page) {
  await page.locator('.modal-backdrop:not(.guide-backdrop) button').first().click({ timeout: 2000 }).catch(() => {})
  await page.getByRole('button', { name: /^Leave$/i }).click({ timeout: 1500 }).catch(() => {})
}

async function seedHubCompleted(page) {
  await page.evaluate((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        status: 'completed',
        mainStep: 0,
        seen: {
          matchOptions: true,
          igl: false,
          review: false,
          advance: false,
          tactics: false,
          strategy: false,
        },
      }),
    )
  }, TUTORIAL_KEY)
}

async function enterIglDecision(page) {
  await page.getByRole('switch', { name: /IGL/i }).check({ force: true })
  await page.getByRole('button', { name: /Start Career/i }).click()
  await page.getByRole('button', { name: /^Dashboard$/i }).waitFor({ timeout: 20000 })
  await dismissCareerModals(page)
  await page.getByRole('button', { name: /Play Week/i }).click()
  await page.getByRole('button', { name: /Enter the Rift/i }).click()
  await page.getByRole('button', { name: /Jump to call/i }).waitFor({ timeout: 25000 })
  await page.getByRole('button', { name: /Jump to call/i }).click()
  await page.locator('.tutorial-card').waitFor({ timeout: 15000 })
  await page.waitForTimeout(400)
}

async function startCareer(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.evaluate((key) => {
    localStorage.removeItem(key)
    localStorage.removeItem('lck-manager-save-v1')
  }, TUTORIAL_KEY)
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Start Career/i }).click()
  await page.getByRole('button', { name: /^Dashboard$/i }).waitFor({ timeout: 20000 })
  await dismissCareerModals(page)
}

await waitForServer(baseUrl)
const browser = await chromium.launch()

{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  await startCareer(page)
  await page.locator('.tutorial-card').waitFor({ timeout: 15000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${outDir}/hub-tour-desktop-1280.png`, fullPage: false })
  await context.close()
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
  const page = await context.newPage()
  await startCareer(page)
  await page.locator('.tutorial-card').waitFor({ timeout: 15000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${outDir}/hub-tour-mobile-390.png`, fullPage: false })
  await context.close()
}

{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.evaluate((key) => {
    localStorage.removeItem(key)
    localStorage.removeItem('lck-manager-save-v1')
  }, TUTORIAL_KEY)
  await page.reload({ waitUntil: 'networkidle' })
  await seedHubCompleted(page)
  await enterIglDecision(page)
  await page.screenshot({ path: `${outDir}/igl-tip-desktop-1280.png`, fullPage: false })
  await context.close()
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
  const page = await context.newPage()
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.evaluate((key) => {
    localStorage.removeItem(key)
    localStorage.removeItem('lck-manager-save-v1')
  }, TUTORIAL_KEY)
  await page.reload({ waitUntil: 'networkidle' })
  await seedHubCompleted(page)
  await enterIglDecision(page)
  await page.screenshot({ path: `${outDir}/igl-tip-mobile-390.png`, fullPage: false })
  await context.close()
}

{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    recordVideo: { dir: outDir, size: { width: 390, height: 844 } },
  })
  const page = await context.newPage()
  await startCareer(page)
  await page.locator('.tutorial-card').waitFor({ timeout: 15000 })
  const next = page.getByRole('button', { name: /^Next$/i })
  await next.click()
  await next.click()
  await page.locator('[data-tour="tour-prep"]').waitFor({ timeout: 10000 })
  await page.screenshot({ path: `${outDir}/mobile-prep-step-before-next.png`, fullPage: false })
  await next.click()
  await page.locator('[data-tour="tour-lineup-tab"]').waitFor({ timeout: 10000 })
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${outDir}/mobile-lineup-step-after-next.png`, fullPage: false })
  await page.waitForTimeout(400)
  await context.close()
  const video = page.video()
  if (video) {
    await video.saveAs(`${outDir}/mobile-prep-to-lineup-next.webm`)
  }
}

await browser.close()
console.log(`Tutorial screenshots written to ${outDir}`)
