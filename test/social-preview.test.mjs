import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { inflateSync } from 'node:zlib'
import { renderSocialCard } from '../scripts/render-social-card.mjs'

// Also validate Vite output: node test/social-preview.test.mjs dist
const directory = process.argv[2] || '.'
const html = await readFile(`${directory}/index.html`, 'utf8')
const tags = [...html.matchAll(/<meta\s+[^>]*>/g)].map(([tag]) => Object.fromEntries(
  [...tag.matchAll(/([\w:]+)="([^"]*)"/g)].map(([, key, value]) => [key, value])))
const value = key => {
  const matching = tags.filter(tag => tag.property === key || tag.name === key)
  assert.equal(matching.length, 1, `exactly one ${key}`)
  return matching[0].content
}
const canonical = 'https://www.rift.askaconsult.com/'
assert.equal([...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].length, 1)
assert.ok(html.includes(`<link rel="canonical" href="${canonical}"`))
assert.equal(value('og:url'), canonical)
assert.equal(value('og:type'), 'website')
assert.equal(value('og:site_name'), 'Rift Manager')
assert.ok(value('description').includes('Rift Manager'))
assert.equal(value('og:title'), value('twitter:title'))
assert.equal(value('og:description'), value('twitter:description'))
assert.equal(value('twitter:card'), 'summary_large_image')
assert.equal(value('og:image'), `${canonical}rift-manager-social-v2.png`)
assert.equal(value('og:image'), value('og:image:secure_url'))
assert.equal(value('og:image'), value('twitter:image'))
assert.equal(value('og:image:type'), 'image/png')
assert.equal(value('og:image:alt'), value('twitter:image:alt'))
assert.ok(value('og:image:alt').includes('three lanes'))
const pngPath = new URL(value('og:image')).pathname
const png = await readFile(`${directory === '.' ? 'public' : directory}${pngPath}`)
assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
assert.equal(png.toString('ascii', 12, 16), 'IHDR')
assert.equal(png.readUInt32BE(16), 1200)
assert.equal(png.readUInt32BE(20), 630)
assert.equal(Number(value('og:image:width')), png.readUInt32BE(16))
assert.equal(Number(value('og:image:height')), png.readUInt32BE(20))
assert.equal(png[24], 8, '8-bit PNG')
assert.equal(png[25], 6, 'RGBA PNG')
const data = []
for (let offset = 8; offset < png.length;) {
  const length = png.readUInt32BE(offset)
  if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT') data.push(png.subarray(offset + 8, offset + 8 + length))
  offset += length + 12
}
assert.equal(inflateSync(Buffer.concat(data)).length, (1200 * 4 + 1) * 630, 'complete decoded pixel rows')
const svg = await readFile('assets/social/rift-manager-social-v2.svg', 'utf8')
assert.deepEqual(png, renderSocialCard(svg), 'committed card matches reproducible SVG and bundled fonts')
assert.ok(!html.includes('lolsim.askaconsult.com'), 'no legacy social asset host')
console.log(`Social metadata, decoded 1200×630 PNG and source reproducibility pass (${directory})`)
