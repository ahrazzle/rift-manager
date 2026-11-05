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

## Source and publication

The card, renderer, fonts, tests and static metadata landed through
[PR #14](https://github.com/ahrazzle/rift-manager/pull/14) on November 5, 2026.
[PR #10](https://github.com/ahrazzle/rift-manager/pull/10) is the earlier overlapping
proposal. The canonical page and versioned image URLs in `index.html` use
`https://www.rift.askaconsult.com/` and
`https://www.rift.askaconsult.com/rift-manager-social-v2.png`.

The November 4 publication verification is recorded in
[the historical release receipt](RELEASE-2026-11-03.md). It does not identify the
current published head. Since PR #15, every push to `main` runs tests/build and
publishes to Pages; review release impact before merging changes. Follow the
[current deployment runbook](DEPLOY-AND-CONTINUE.md) for release verification.

## Validation

Run `npm test` and `npm run build`, then
`node test/social-preview.test.mjs dist` to validate built metadata and the static
PNG. The test checks canonical/OG/Twitter consistency, image type and alt text,
versioned URLs, PNG dimensions and decoded size, and byte-for-byte regeneration
from the SVG with bundled fonts. Inspect the card at full size and as a thumbnail
when changing its design.

After publication, verify anonymous root HTML points to the intended image and
that the image URL returns HTTP 200, `image/png`, and the intended 1200×630 bytes.
Reddit controls its cache and card layout; a versioned filename does not guarantee
existing posts will refresh automatically.
