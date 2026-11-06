import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

// Audits the draft's quarantine boundary. This is intentionally tied to the
// frozen branch base and should be retired when production integration begins.
const base = 'ec498a29ebc48afd68d3d09d6d28d57c5bfeb2b2'
const changes = execFileSync('git', ['diff', '--name-status', base, '--'], { encoding: 'utf8' }).trim()
for (const row of changes.split('\n').filter(Boolean)) {
  const [status, path] = row.split('\t')
  assert.equal(status, 'A', `Draft must only add new files: ${row}`)
  assert.match(path, /^(src\/game\/backend\/|test\/backend-[^/]+\.test\.mjs$|docs\/backend\/)/)
}
for (const file of readdirSync(new URL('../src/game/backend/', import.meta.url))) {
  if (!file.endsWith('.js')) continue
  const source = readFileSync(new URL(`../src/game/backend/${file}`, import.meta.url), 'utf8')
  assert.doesNotMatch(source, /(?:from\s*|import\s*\()['"](?:react|.*useGameState)/, `${file} must be portable`)
}
console.log('Backend draft boundary passed: additive paths and no production/React imports')
