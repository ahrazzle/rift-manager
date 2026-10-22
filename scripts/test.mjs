import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const suites = readdirSync(new URL('../test/', import.meta.url)).filter((name) => name.endsWith('.test.mjs')).sort()
let failed = 0
for (const name of suites) {
  const run = spawnSync(process.execPath, [fileURLToPath(new URL(`../test/${name}`, import.meta.url))], { encoding: 'utf8', cwd: fileURLToPath(new URL('..', import.meta.url)) })
  const ok = run.status === 0
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`)
  if (!ok) {
    failed++
    console.error(run.error?.message ?? '')
    console.error(run.stdout, run.stderr)
  }
}
console.log(`\n${suites.length - failed}/${suites.length} suites passed`)
process.exitCode = failed ? 1 : 0
