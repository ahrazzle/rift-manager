import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const root = new URL('../', import.meta.url)
const source = new URL('assets/social/rift-manager-social-v2.svg', root)
export function renderSocialCard(svg) {
  return new Resvg(svg, {
    font: { loadSystemFonts: false, fontFiles: [
      fileURLToPath(new URL('assets/social/fonts/BarlowCondensed-Bold.ttf', root)),
      fileURLToPath(new URL('assets/social/fonts/BarlowCondensed-Medium.ttf', root)),
    ] },
  }).render().asPng()
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const png = renderSocialCard(await readFile(source, 'utf8'))
  await writeFile(new URL('public/rift-manager-social-v2.png', root), png)
  console.log(`Rendered 1200×630 social card (${png.length} bytes)`)
}
