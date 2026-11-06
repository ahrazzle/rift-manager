// Contact sheet of every known club crest at 24/48/96px on --bg and --s2.
// Usage: node scripts/crest-sheet.mjs [outDir]   (default ~/Work/rift-shots/crests)
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('..', import.meta.url))
const out = process.argv[2] ?? join(homedir(), 'Work/rift-shots/crests')
await mkdir(out, { recursive: true })
const temp = await mkdtemp(join(root, '.crest-sheet-'))
try {
  const entry = join(temp, 'entry.jsx')
  await writeFile(entry, `
    import React from 'react'
    import { renderToStaticMarkup } from 'react-dom/server'
    import TeamCrest from '${join(root, 'src/components/TeamCrest.jsx')}'
    import { KNOWN_CREST_IDS, LCK_TEN_IDS } from '${join(root, 'src/components/teamCrestModel.js')}'
    const row = (id) => renderToStaticMarkup(<span className="cell" title={id}>{[24, 48, 96].map((s) => <TeamCrest key={s} teamId={id} size={s} />)}<i>{id}</i></span>)
    export const all = KNOWN_CREST_IDS.map(row)
    export const ids = KNOWN_CREST_IDS
    export const lck = LCK_TEN_IDS.map(row)
    export const mix = (list) => list.map(row)
  `)
  const bundle = join(temp, 'entry.mjs')
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle, jsx: 'automatic', external: ['react', 'react-dom'], absWorkingDir: root, nodePaths: [join(root, 'node_modules')] })
  const m = await import(pathToFileURL(bundle).href)
  const font = pathToFileURL(join(root, 'public/fonts/barlow-condensed-latin-700-normal.woff2')).href
  const featured = ['LPL:BLG', 'LPL:JDG', 'LPL:TES', 'LEC:G2', 'LEC:FNC', 'LCS:C9', 'LCS:TL', '2015-SKT', 'SKT', 'GE', 'SSB', 'CJ', 'MVO', 'NJS', 'LR', 'LR_NORD', 'LR_5PIGS', 'LR_BARCA', 'LR_IJC'].filter((i) => m.ids.includes(i))
  const page = (title, cells) => `<!doctype html><meta charset=utf-8><style>
    @font-face{font-family:'Barlow Condensed';font-weight:700;src:url('${font}')}
    body{margin:0;background:#0b0f15;color:#9aa6b8;font:12px Inter,Arial,sans-serif}
    h2{margin:16px 20px 6px;font:600 13px Arial;letter-spacing:.08em;text-transform:uppercase}
    .row{display:flex;flex-wrap:wrap;gap:0}
    .panel{padding:14px 20px}
    .cell{display:inline-flex;align-items:center;gap:10px;padding:8px 12px;margin:0 6px 6px 0;width:230px}
    .cell i{font-style:normal;font-size:11px;opacity:.7}
    .cell svg:nth-of-type(1){margin-right:-2px}
  </style>
  <div class=panel style="background:#0b0f15"><h2>${title} on --bg</h2><div class=row>${cells}</div></div>
  <div class=panel style="background:#18202c"><h2>${title} on --s2</h2><div class=row>${cells}</div></div>`
  const browser = await chromium.launch()
  const p = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  const shot = async (name, html) => {
    await p.setContent(html); await p.evaluate(() => document.fonts.ready)
    await p.screenshot({ path: join(out, name), fullPage: true })
    console.log('wrote', join(out, name))
  }
  await shot('crests-featured.png', page('LCK ten + featured clubs', m.lck.join('') + m.mix(featured).join('')))
  await shot('crests-all.png', page(`All ${m.ids.length} known ids`, m.all.join('')))
  await browser.close()
} finally { await rm(temp, { recursive: true, force: true }) }
