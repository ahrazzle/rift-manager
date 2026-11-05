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

## Published evidence and canonical choice

Anonymous GET of `https://www.rift.askaconsult.com/` returned HTTP 200 with no
redirect, bundle `index-ACNj8abJ.js`, and static metadata pointing to
`https://lolsim.askaconsult.com/og-image.png`. That referenced image returned 200,
`image/png`, 36,420 bytes, 1200×630, and ETag
`7b1bc4abceb66ffc2f83dcd956d8d655`. The same existing image path on the www host
also returned 200. The bare `rift.askaconsult.com` host failed DNS resolution from
this execution environment; no successful canonical redirect was observed.
The new static canonical and OG URL therefore use the verified www root.

The versioned image URL in metadata is a **future deployment target**, not a claim
that the new file is already published. No DNS, redirects, security configuration,
Vercel configuration, deployment, or alias changes are part of this PR.

## Validation

- `npm test`: all 26 suites pass (25 existing release suites plus social preview).
- `npm run build`: passes; existing large-chunk warning remains.
- `node test/social-preview.test.mjs dist`: built HTML metadata and published-path
  PNG pass. Tests check canonical and OG/Twitter consistency, type, alt text,
  versioned URL, PNG signature, IHDR dimensions, decompressed RGBA row size,
  and byte-for-byte reproduction from the SVG and bundled fonts.
- `git diff --check`: passes.
- Visually inspected the actual PNG at 1200×630 and a 360×189 rendition: title is
  readable, strategy artwork remains distinct, no clipped text or elements.
  Small supporting copy is secondary; the title and diagram carry the thumbnail.

## Required release review

This local integration branch is based on released source commit
`d939fe32d7ac0b4d943638208a72079a694227e4` (PR #8). It preserves the existing
release test runner and application source. The parent subsequently verified
main reconciled at `31e9bc5` with the exact same tree as that released source.
The original main-based patch is retained separately for reference; use this
release-based patch for review and integration.

GitHub denied a prior push of `fix/social-preview-v2` with HTTP 403 because the
authenticated user `orda-aska` lacks repository push permission. No retry or
alternate repository publication method was used. This release-based branch,
patch, and source archive remain local deliverables until owner access allows
publication. No PR has been created.

An owner must review the card and later authorize a staging preview, inspect the
new image and metadata there, and separately authorize live release. After that
release, verify the new www image returns 200 with `image/png`, actual 1200×630
bytes, and the final root HTML references it. Reddit controls its cache and card
layout; a new asset filename does not guarantee existing posts will be re-fetched
or updated automatically.
