/**
 * Verify desktop IGL call list scroll + last option click.
 * PREVIEW_URL=http://127.0.0.1:4173/ node scripts/igl-scroll-verify.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const baseUrl = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/'
const outDir = '/opt/cursor/artifacts/igl-scroll-verify'
mkdirSync(outDir, { recursive: true })

const viewports = [
  { name: '1280', width: 1280, height: 800 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
]

async function enterDecision(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /One full split/i }).click()
  await page.getByRole('switch', { name: /IGL/i }).check({ force: true })
  await page.getByRole('button', { name: /Start Season/i }).click()
  await page.getByRole('button', { name: /^Dashboard$/i }).waitFor({ timeout: 20000 })
  await page.getByRole('button', { name: /^Leave$/i }).click({ timeout: 1500 }).catch(() => {})
  await page.getByRole('button', { name: /Play Week/i }).click()
  await page.getByRole('button', { name: /Enter the Rift/i }).click()
  await page.getByRole('button', { name: /Jump to call/i }).waitFor({ timeout: 20000 })
  await page.getByRole('button', { name: /Jump to call/i }).click()
  await page.getByRole('heading', { name: /The map is yours/i }).waitFor()
}

const browser = await chromium.launch()
const report = []

for (const vp of viewports) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
  const page = await context.newPage()
  await enterDecision(page)

  const grid = page.locator('.rift-coaching .igl-call-grid')
  const options = page.locator('.igl-call-option')
  const count = await options.count()
  const last = options.nth(count - 1)
  const lastLabel = await last.locator('strong').textContent()

  await page.screenshot({ path: `${outDir}/${vp.name}-before-scroll.png` })

  const before = await grid.evaluate((el) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    scrollTop: el.scrollTop,
    overflowY: getComputedStyle(el).overflowY,
  }))

  await grid.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await page.waitForTimeout(300)

  await page.screenshot({ path: `${outDir}/${vp.name}-after-scroll-bottom.png` })

  const afterScroll = await grid.evaluate((el) => el.scrollTop)
  const lastVisible = await last.evaluate((el) => {
    const list = el.closest('.igl-call-grid')
    const r = el.getBoundingClientRect()
    const g = list.getBoundingClientRect()
    return r.top >= g.top - 2 && r.bottom <= g.bottom + 2
  })

  await last.click()
  await page.waitForFunction(() => !document.querySelector('.igl-decision'), { timeout: 5000 })
  const resumed = !(await page.locator('.igl-decision').count())

  report.push({
    viewport: `${vp.width}x${vp.height}`,
    optionCount: count,
    lastLabel: lastLabel?.trim(),
    scrollable: before.scrollHeight > before.clientHeight + 4,
    overflowY: before.overflowY,
    scrollTopAfter: afterScroll,
    lastFullyVisible: lastVisible,
    clickResumed: resumed,
  })

  await context.close()
}

await browser.close()
writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))

const failed = report.some(
  (r) => !r.scrollable || !r.lastFullyVisible || !r.clickResumed || r.overflowY !== 'auto',
)
if (failed) process.exit(1)
