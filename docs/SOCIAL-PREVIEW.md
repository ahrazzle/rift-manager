# Social preview — 2026-11-05 brand refresh

The current share card is `public/rift-manager-social-v3.png`, a plain 1200×630
PNG. It pairs the canonical cream tower-R and orange pennant lockup with the
existing painted arena artwork and the line “Build your team. Own the season.”
The arena is illustrative artwork, not a game screenshot.

`assets/social/rift-manager-social-v3.svg` defines the composition. At render
time, `scripts/render-social-card.mjs` embeds the exact
`public/brand/rift-manager.svg` source and `assets/social/rift-venue.png` as data
URLs. There is no separately maintained copy of the logo geometry. The arena PNG
is an offline lossless derivative of `src/assets/rift-venue.webp`, made with
macOS `sips -s format png src/assets/rift-venue.webp --out assets/social/rift-venue.png`;
resvg does not decode WebP. Keep the derivative committed so regeneration has no
platform image decoder dependency.

The small supporting text uses bundled, unmodified Barlow Condensed Bold and
Medium fonts; their SIL OFL license and attribution are in
`assets/social/fonts/OFL.txt`. The custom logo letters are SVG paths. The renderer
uses a locked resvg version, bundled fonts, and disabled system font loading.
No network requests or runtime image service are involved.

Run `npm ci && npm run social:render` to regenerate the PNG. The canonical page
and OG/Twitter image metadata use `https://www.rift.askaconsult.com/` and the new
cache-busted `https://www.rift.askaconsult.com/rift-manager-social-v3.png` URL.
The existing v2 SVG and PNG remain available for historical links and cached
previews. Public assets also remain available on a static hosting subpath because
Vite copies `public/` verbatim; canonical share metadata deliberately uses the
production domain.

Run `npm test`, `npm run build`, and
`node test/social-preview.test.mjs dist` before publication. The social test
checks canonical and OG/Twitter consistency, unique metadata, type, alt text,
versioned URLs, full decoded PNG dimensions, and byte-for-byte regeneration from
the current logo, artwork, SVG template, and bundled fonts. Inspect the card at
full size and as a thumbnail after design changes.

This source update does not establish publication. Follow
[the deployment runbook](DEPLOY-AND-CONTINUE.md), then check anonymous root HTML
and the new image URL for HTTP 200, `image/png`, and the intended 1200×630 bytes.
Reddit controls its cache and card layout; a new filename does not guarantee
existing posts refresh automatically. Historical publication evidence remains in
[the release receipt](RELEASE-2026-11-03.md).
