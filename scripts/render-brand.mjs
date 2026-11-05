import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

// Edit the lockup once. Its drawn letterforms and rook supply every cutdown.
export async function renderBrand() {
  const master = await readFile(new URL('../public/brand/rift-manager.svg', import.meta.url), 'utf8')
  const mark = master.match(/<g id="pennant-rook">.*?<\/g>/s)?.[0]
  if (!mark) throw new Error('The primary logo must contain the pennant-rook group')

  const tile = (size, radius, content) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size}" role="img">
  <title>Rift Manager</title>
  <rect width="100%" height="100%" rx="${radius}" fill="#0b1923"/>
  ${content}
</svg>
`
  const signature = tile('256 108', 5, master.replace(/<svg[^>]+>/, '<svg x="16" y="14" width="224" height="80" viewBox="0 0 224 80">'))
  // At 16 px the pole and tower gaps sit on a roughly one-pixel grid.
  const icon = tile('80 80', 13, `<g transform="translate(8 5) scale(.88)">${mark}</g>`)
  // Home screen platforms apply their own mask. Fill the entire square.
  const touch = tile('80 80', 0, `<g transform="translate(11 9) scale(.78)">${mark}</g>`)
  const touchPng = new Resvg(touch, { fitTo: { mode: 'width', value: 180 } }).render().asPng()
  const light = master.replaceAll('#fff3d8', '#0b1923').replaceAll('#ff643d', '#c83e20')
  return new Map([
    ['rift-manager-ink.svg', light],
    ['rift-signature.svg', signature],
    ['rift-mark.svg', icon],
    ['apple-touch-icon.png', touchPng],
  ])
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [name, data] of await renderBrand()) {
    await writeFile(new URL(`../public/brand/${name}`, import.meta.url), data)
  }
}
