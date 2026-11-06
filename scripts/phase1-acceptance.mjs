/**
 * Phase 1 acceptance: screenshots, axe, scrollWidth, optional Lighthouse JSON.
 * Usage: node scripts/phase1-acceptance.mjs --tag before|after [--lighthouse]
 * Expects `npm run preview` already listening on 4173 (or pass PREVIEW_URL).
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'

const root = fileURLToPath(new URL('..', import.meta.url))
const tag = process.argv.includes('--tag')
  ? process.argv[process.argv.indexOf('--tag') + 1]
  : 'after'
const runLh = process.argv.includes('--lighthouse')
const outDir = `/opt/cursor/artifacts/broadcast-p1-${tag}`
mkdirSync(outDir, { recursive: true })

const baseUrl = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/'

async function waitForServer(url, ms = 60000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Server not ready: ${url}`)
}

async function dismissOverlays(page) {
  await page.getByRole('button', { name: /^Leave$/i }).click({ timeout: 1500 }).catch(() => {})
}

async function startSeason(page) {
  await page.getByRole('button', { name: /^Season$/i }).click()
  await page.locator('#season-year-select').selectOption({ index: 0 }).catch(async () => {
    await page.locator('.year-select').first().selectOption({ index: 0 })
  })
  await page.getByRole('button', { name: /Start Season/i }).click()
  await page.getByRole('button', { name: /^Dashboard$/i }).waitFor({ timeout: 15000 })
  await dismissOverlays(page)
}

async function hubDashboard(page) {
  await startSeason(page)
}

async function coachesOffice(page) {
  await startSeason(page)
  await page.locator('#weekly-preparation').scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
}

const screens = [
  { name: 'new-game', path: './', setup: null },
  { name: 'hub-dashboard', path: './', setup: hubDashboard },
  { name: 'coaches-office', path: './', setup: coachesOffice },
  {
    name: 'standings',
    path: './',
    setup: async (page) => {
      await startSeason(page)
      await dismissOverlays(page)
      await page.getByRole('button', { name: /^Standings$/i }).click()
      await page.waitForTimeout(400)
    },
  },
  {
    name: 'draft-entry',
    path: './',
    setup: async (page) => {
      await startSeason(page)
      await page.getByRole('button', { name: /Play Week/i }).click()
      await page.waitForTimeout(800)
    },
  },
  {
    name: 'match-setup',
    path: './',
    setup: async (page) => {
      await startSeason(page)
      await page.getByRole('button', { name: /Play Week/i }).click()
      await page.waitForTimeout(800)
      await page.getByRole('button', { name: /Enter draft|Start draft|Begin draft|Continue to draft/i }).click({ timeout: 12000 }).catch(() => {})
      await page.waitForTimeout(600)
    },
  },
]

const axePages = [
  { name: 'hub', setup: hubDashboard },
  { name: 'new-game', setup: null },
  {
    name: 'standings',
    setup: async (page) => {
      await startSeason(page)
      await dismissOverlays(page)
      await page.getByRole('button', { name: /^Standings$/i }).click()
    },
  },
  { name: 'coaches-office', setup: coachesOffice },
]

async function main() {
  await waitForServer(baseUrl)
  const browser = await chromium.launch()
  const axeResults = []
  const scrollChecks = []

  for (const width of [1440, 390]) {
    for (const screen of screens) {
      const context = await browser.newContext({
        viewport: { width, height: width === 390 ? 844 : 900 },
      })
      await context.addInitScript(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      const page = await context.newPage()
      await page.goto(new URL(screen.path, baseUrl).href, { waitUntil: 'networkidle' })
      if (screen.setup) {
        try {
          await screen.setup(page)
        } catch (e) {
          console.warn(`Setup failed for ${screen.name} @${width}:`, e.message)
        }
      }
      const shotViewport = path.join(outDir, `${screen.name}-${width}.png`)
      const shotFull = path.join(outDir, `${screen.name}-${width}-full.png`)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(150)
      await page.screenshot({ path: shotViewport, fullPage: false })
      await page.screenshot({ path: shotFull, fullPage: true })
      const sw = await page.evaluate(() => document.documentElement.scrollWidth)
      scrollChecks.push({ screen: screen.name, width, scrollWidth: sw, ok: sw === width })
      await context.close()
    }
  }

  for (const axePage of axePages) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await context.addInitScript(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    const page = await context.newPage()
    await page.goto(baseUrl, { waitUntil: 'networkidle' })
    if (axePage.setup) {
      try {
        await axePage.setup(page)
      } catch (e) {
        console.warn(`Axe setup failed for ${axePage.name}:`, e.message)
      }
    }
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
      .analyze()
    axeResults.push({
      page: axePage.name,
      violations: results.violations.length,
      ids: results.violations.map((v) => v.id),
    })
    await context.close()
  }

  await browser.close()

  writeFileSync(path.join(outDir, 'scroll-width.json'), JSON.stringify(scrollChecks, null, 2))
  writeFileSync(path.join(outDir, 'axe-summary.json'), JSON.stringify(axeResults, null, 2))

  if (runLh) {
    const lh = spawnSync(
      process.execPath,
      [
        path.join(root, 'scripts/run-lighthouse-hub.mjs'),
        '--out',
        path.join(outDir, 'lighthouse-mobile-hub.json'),
      ],
      { encoding: 'utf8', env: { ...process.env, PREVIEW_URL: baseUrl } },
    )
    if (lh.status !== 0) console.error(lh.stderr || lh.stdout)
  }

  console.log(JSON.stringify({ tag, outDir, scrollChecks, axeResults }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
