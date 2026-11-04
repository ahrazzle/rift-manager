import fs from 'node:fs'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'

const url = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/'
const outIdx = process.argv.indexOf('--out')
const outFile = outIdx >= 0 ? process.argv[outIdx + 1] : '/tmp/lh-mobile.json'

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox'] })
try {
  const result = await lighthouse(url, {
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
  fs.writeFileSync(outFile, JSON.stringify({ url, scores }, null, 2))
  console.log(JSON.stringify(scores))
} finally {
  await chrome.kill()
}
