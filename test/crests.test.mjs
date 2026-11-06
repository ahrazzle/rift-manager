// Club crests: every known id renders without throwing, with a stable colour and motif.
// Run: node test/crests.test.mjs
import { mkdtemp, rm } from 'node:fs/promises'
import { build } from 'esbuild'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { fileURLToPath } from 'node:url'
import { fitMonogram, monogramLimit, crestSpec, shieldColors, contrast, KNOWN_CREST_IDS, LCK_TEN_IDS, MOTIFS } from '../src/components/teamCrestModel.js'

let failures = 0
const check = (c, m) => { if (!c) { console.error('FAIL:', m); failures++ } else console.log('ok  :', m) }
const root = fileURLToPath(new URL('..', import.meta.url))
const temp = await mkdtemp(new URL('./.crests-', import.meta.url).pathname)
try {
  const out = `${temp}/TeamCrest.mjs`
  await build({ entryPoints: [`${root}src/components/TeamCrest.jsx`], bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', external: ['react'] })
  const { default: TeamCrest } = await import(out)
  const html = (props) => renderToStaticMarkup(React.createElement(TeamCrest, props))

  check(KNOWN_CREST_IDS.length > 150, `registry covers ${KNOWN_CREST_IDS.length} ids`)
  for (const id of ['LR', 'LR_NORD', 'LPL:BLG', 'LEC:G2', 'LCS:C9']) check(KNOWN_CREST_IDS.includes(id), `${id} known`)
  let bad = 0
  const WHITE = [255, 255, 255]
  for (const id of [...KNOWN_CREST_IDS, ...LCK_TEN_IDS]) {
    const a = crestSpec(id), b = crestSpec(id)
    let out1
    try { out1 = html({ teamId: id, size: 24 }) } catch { bad++; continue }
    const rgb = [1, 3, 5].map((i) => parseInt(a.fill.slice(i, i + 2), 16))
    if (JSON.stringify(a) !== JSON.stringify(b) || !out1.includes('<svg') || !a.monogram || contrast(WHITE, rgb) < 3) bad++
    if (a.motif && !MOTIFS.includes(a.motif)) bad++
  }
  check(bad === 0, 'every known id renders, is deterministic, and keeps white-monogram contrast >= 3')
  check(LCK_TEN_IDS.every((id) => crestSpec(id).curated && crestSpec(id).motif === null), 'LCK ten are curated, no motif')
  check(crestSpec('LPL:BLG').monogram === 'BLG' && crestSpec('LR_NORD').monogram === 'NORD', 'monogram from short / id')
  check(new Set(KNOWN_CREST_IDS.map((i) => crestSpec(i).motif)).size >= 4, 'motifs are spread across clubs')
  check(['GEN', 'NORD', '5P1T', 'BRO', 'KDF', 'DK', 'T1'].map((m) => fitMonogram(m, 24)).join() === 'GE,NO,5P,BR,KD,DK,T1', 'monogram <=28px is at most 2 chars')
  check(fitMonogram('NORD', 36) === 'NOR' && fitMonogram('NORD', 48) === 'NORD' && monogramLimit(28) === 2 && monogramLimit(29) === 3 && monogramLimit(40) === 3 && monogramLimit(41) === 4, 'size tiers 28/40/48')
  check([undefined, null, '', '  ', 42, {}].every((v) => { try { return fitMonogram(v, 24).length >= 1 && fitMonogram(v, NaN).length >= 1 } catch { return false } }), 'fitMonogram never empty or throwing')
  check(crestSpec('LPL:JDG', { size: 24 }).motif === null && crestSpec('LPL:JDG', { size: 28 }).motif === null && crestSpec('LPL:JDG', { size: 48 }).motif !== null, 'no motif at <=28px')
  check(crestSpec('LR_NORD', { size: 24 }).monogram === 'NO' && html({ teamId: 'LR_NORD', size: 24 }).includes('>NO<'), 'small render uses the short monogram')
  for (const bogus of [undefined, null, '', 'ZZZ-FUTURE', 'x:y_z', 42, {}]) {
    let ok = true
    try { html({ teamId: bogus, size: 24 }); html({ name: bogus }) } catch { ok = false }
    check(ok, `unknown id ${JSON.stringify(bogus)} never throws`)
  }
  check(crestSpec('DK').rim !== crestSpec('DK').fill && contrast(rgbOf(shieldColors('#002fa7').rim), [11, 15, 21]) > 3, 'dark club (DK) gets a rim that separates from --bg')
  const decorative = html({ teamId: 'T1' }), named = html({ teamId: 'T1', label: 'T1' })
  check(decorative.includes('aria-hidden="true"') && !decorative.includes('role="img"'), 'decorative by default')
  check(named.includes('role="img"') && named.includes('aria-label="T1"') && !named.includes('aria-hidden'), 'label gives an accessible name')
  check(html({ teamId: 'T1', size: 30, className: 'x' }).includes('width="30"') && html({ teamId: 'T1', className: 'x' }).includes('team-crest x'), 'size and className still work')
  check(html({ teamId: 'ZZ', color: '#ff00aa', short: 'abc' }).includes('>ABC<'), 'color/short overrides')
} finally { await rm(temp, { recursive: true, force: true }) }
function rgbOf(h) { return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) }
process.exitCode = failures ? 1 : 0
