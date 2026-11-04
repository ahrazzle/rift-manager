/**
 * Mobile Lighthouse with Hub/Dashboard state (preview on 4173).
 * Uses Playwright over CDP to seed a season save, then runs Lighthouse on the same Chrome.
 */
import fs from 'node:fs'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import { chromium } from 'playwright'

const baseUrl = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/'
const outIdx = process.argv.indexOf('--out')
const outFile = outIdx >= 0 ? process.argv[outIdx + 1] : '/tmp/lh-hub.json'

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox'] })
try {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`)
  const context = browser.contexts()[0] ?? await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = context.pages()[0] ?? await context.newPage()
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /⚡ Season/i }).click()
  await page.locator('#season-year-select').selectOption({ index: 0 })
  await page.getByRole('button', { name: /Start Season/i }).click()
  await page.getByRole('button', { name: /^Dashboard$/i }).waitFor({ timeout: 15000 })
  await page.getByRole('button', { name: /^Leave$/i }).click({ timeout: 1500 }).catch(() => {})

  const result = await lighthouse(page.url(), {
    port: chrome.port,
    output: 'json',
    logLevel: 'error',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    emulatedFormFactor: 'mobile',
  })
  const lhr = result.lhr
  const scores = {
    performance: lhr.categories.performance.score,
    accessibility: lhr.categories.accessibility.score,
    bestPractices: lhr.categories['best-practices'].score,
    seo: lhr.categories.seo.score,
  }
  fs.writeFileSync(outFile, JSON.stringify({ url: page.url(), hubSeeded: true, scores }, null, 2))
  console.log(JSON.stringify(scores))
  await browser.close()
} finally {
  await chrome.kill()
}
