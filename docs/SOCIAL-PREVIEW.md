# Social preview review — 2026-11-03

## Deliverable

`public/rift-manager-social-v2.png` is a 1200×630 PNG (137,504 bytes), rendered
from `assets/social/rift-manager-social-v2.svg`. It uses an original three-lane
strategy schematic, two teams, and five role slots, alongside a large two-line
Rift Manager title. It is an illustration, not a game screenshot. No Riot logos,
champion portraits, player photos, or third-party game art are included.

Typography uses bundled, unmodified Barlow Condensed Bold and Medium fonts from
Google Fonts (`ofl/barlowcondensed`); their SIL OFL license and attribution are in
`assets/social/fonts/OFL.txt`. The renderer uses only these bundled fonts and a
locked resvg version, with system font loading disabled.

Regenerate with `npm ci && npm run social:render`. The PNG is committed so crawlers
receive a static image without requiring JavaScript, browser fonts, or a runtime
image service. Keep it versioned; use a new filename on future design changes.

## Current live evidence — 2026-11-04 UTC

The card is now live at `https://www.rift.askaconsult.com/rift-manager-social-v2.png`.
Anonymous retrieval returned the exact committed 137,504-byte PNG, SHA-256
`6ccef7c5944a278b8f0419f053434a4d7361622136fdcb3eb314d9568ca0ec58`.
The root HTML is byte-identical to `index.html` on `gh-pages` at
`a4b6a1fc64b651a652bb83e63369f7900c7cf864`. It includes the www canonical URL,
static OG/Twitter metadata, and the versioned PNG URL. The Pages branch includes
`CNAME` for `www.rift.askaconsult.com`; that deployment configuration is not copied
into this source PR or modified by this reconciliation.

PR #10 reconciles the already-live social-card source into `main`. Main at
`1f20838` includes the Broadcast Night design proposal from PR #11; the PR branch
incorporates that current main without changing its design files or roadmap.
The application JS/CSS remain `index-ACNj8abJ.js` and `index-BRJkIznf.css`.

## Validation

- `npm test`: all 26 suites pass (25 existing release suites plus social preview).
- `npm run build`: passes; the existing large-chunk warning remains.
- `node test/social-preview.test.mjs dist`: checks built HTML metadata and PNG.
  Tests verify canonical and OG/Twitter consistency, type, alt text, versioned
  URL, PNG signature, IHDR dimensions, decompressed RGBA row size, and
  byte-for-byte reproduction from the SVG and bundled fonts.
- Original card review inspected the actual PNG at 1200×630 and 360×189. This
  reconciliation does not alter the card or claim new visual playtesting.
- The upstream font license is preserved verbatim, including its trailing space.

## Review boundary

Independent review of the current PR head is required before merge. The source
reconciliation does not deploy, alter the Pages branch, change DNS or security
settings, grant a project license, or change game behavior. Bundled font licensing
is distinct from rights to external League of Legends/Riot imagery used elsewhere
in the game; this original social card contains none of that imagery.

Historical staging and publication restrictions in the earlier version of this
note have been superseded by the published PR and verified live release above.
Reddit controls its own cache and card layout; neither a versioned image nor this
source reconciliation guarantees that an existing post will refresh its preview.
