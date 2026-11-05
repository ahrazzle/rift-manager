import assert from 'node:assert/strict'
import { scrollContentToTop } from '../src/utils/scrollToTop.js'

const scrollCalls = []
globalThis.window = {
  scrollTo: (opts) => scrollCalls.push(['window', opts]),
  matchMedia: () => ({ matches: false }),
}
globalThis.document = {
  documentElement: { scrollTop: 99 },
  body: { scrollTop: 88 },
  getElementById: (id) => (id === 'main-content' ? { scrollTop: 77 } : null),
  querySelector: (sel) => (sel === '.app.broadcast-shell' ? { scrollTop: 66 } : null),
  querySelectorAll: () => [{ scrollTop: 55 }],
}

scrollContentToTop()
assert.equal(document.documentElement.scrollTop, 0)
assert.equal(document.body.scrollTop, 0)
assert.deepEqual(scrollCalls[0], ['window', { top: 0, left: 0, behavior: 'auto' }])
console.log('scrollContentToTop resets window and scroll containers')
