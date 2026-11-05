import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { renderBrand } from '../scripts/render-brand.mjs'

for (const [name, rendered] of await renderBrand()) {
  const asset = await readFile(new URL(`../public/brand/${name}`, import.meta.url))
  assert.deepEqual(asset, Buffer.from(rendered), `Regenerate ${name} with npm run brand:render`)
}

const apple = await readFile(new URL('../public/brand/apple-touch-icon.png', import.meta.url))
assert.equal(apple.readUInt32BE(16), 180)
assert.equal(apple.readUInt32BE(20), 180)
