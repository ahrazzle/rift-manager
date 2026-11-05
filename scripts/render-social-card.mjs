import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const root = new URL('../', import.meta.url)
export const socialCardVersion = 'v3'
export async function loadSocialCardSource() {
  const [template, brand, arena] = await Promise.all([
    readFile(new URL(`assets/social/rift-manager-social-${socialCardVersion}.svg`, root), 'utf8'),
    readFile(new URL('public/brand/rift-manager.svg', root)),
    readFile(new URL('assets/social/rift-venue.png', root)),
  ])
  return template.replace('{{BRAND}}', `data:image/svg+xml;base64,${brand.toString('base64')}`)
    .replace('{{ARENA}}', `data:image/png;base64,${arena.toString('base64')}`)
}
export function renderSocialCard(svg) {
  return new Resvg(svg, {
    font: { loadSystemFonts: false, fontFiles: [
      fileURLToPath(new URL('assets/social/fonts/BarlowCondensed-Bold.ttf', root)),
      fileURLToPath(new URL('assets/social/fonts/BarlowCondensed-Medium.ttf', root)),
    ] },
  }).render().asPng()
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const png = renderSocialCard(await loadSocialCardSource())
  await writeFile(new URL(`public/rift-manager-social-${socialCardVersion}.png`, root), png)
  console.log(`Rendered 1200×630 social card (${png.length} bytes)`)
}
