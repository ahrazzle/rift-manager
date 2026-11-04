# Broadcast Night (design proposal)

Design proposal for a UI/UX overhaul of Rift Manager. Direction **Broadcast Night** was chosen by the design agent (grk-lumen). The user reviewed the screenshots and approved proceeding on 2026-11-03.

Contents: `CRITIQUE.md` (current UI audit), `SPEC.md` (tokens, components, IA, assets, seven-phase migration plan), `prototypes/` (static HTML), `shots/` (1440px and 390px captures, `axe-prototypes.json`), `assets/` (crests, role icons, trophy, map art).

## Directions not chosen

From `prototypes/directions.html`:

- **B · War Room** — warm dark “coach’s notebook” with tactical grid and monospace data; set aside for amber/gold clash, olive/red confusion for deuteranopes, and a sleepy matchday feel.
- **C · Hextech Glass** — glass panels with cyan/violet glow; set aside for contrast under blur/glow, low-end phone cost, and proximity to official game art.

## Top findings (from CRITIQUE.md)

1. Match wins have no dedicated payoff; celebration UI exists but is never shown, and results scroll off-screen behind press flow.
2. Mobile header and tabs consume ~300px before primary actions; live map and lineup require heavy scroll and horizontal pan.
3. Seven flat tabs stay visible (often disabled) during matches; phase chips look like tabs; duplicate playoff views; wrong mode chrome in Gauntlet.
4. Accent red is used for brand, buttons, tabs, links, and draft UI, so side, outcome, and priority are unreadable from color alone.
5. Draft screen hides pick order, side, and clock; nested scroll, modal role pick, and stacked mobile layout slow drafting.
6. Hub buries “Play week” under phase card, marketing copy, and a wall of locked trophies with inverted hierarchy.
7. Press conference is a blocking modal with a dominant “Confident” answer and repeated questions.
8. Low-contrast meta text, weak borders, missing focus styles, small type, and landmark/heading gaps (axe + Lighthouse A11y 87).

## View prototypes

Open the HTML files locally in a browser (network needed once for Google Fonts):

```bash
xdg-open docs/design/broadcast-night/prototypes/hub.html
```

Entry points: `hub.html`, `draft.html`, `match.html` (also `#live`, `#decision`, `#result`), `standings.html`, `directions.html`. Prototype links to each other via relative paths; assets are inlined or embedded (no `../assets/` dependency from `prototypes/`).

## Lighthouse (mobile, Performance / Accessibility / Best Practices / SEO)

| Target | Perf | A11y | Best Pr. | SEO |
|---|---|---|---|---|
| **Before** — live lolsim.askaconsult.com | 98 | 87 | 96 | 100 |
| **Before** — staging (Vercel) | 97 | 87 | 96 | 100 |
| **Before** — local build (`vite preview`) | 99 | 87 | 96 | 91 |
| **After** — prototype hub | 98–99 | 100 | 100 | 100 |
| **After** — prototype draft | 95–100 | 100 | 100 | 100 |
| **After** — prototype match | 99 | 100 | 100 | 100 |
| **After** — prototype standings | 100 | 100 | 100 | 100 |

Raw Lighthouse HTML/JSON reports were omitted from the repo (size). Scores above are summarized from the design agent run.

## Not verified

- Screen readers
- Safari / iOS (`color-mix`, `backdrop-filter`)
- Firefox
- Real devices
- Google Fonts fallback behavior
- Champion “fit” lines and “what changed” values in prototypes (placeholders; must come from game state)

## Next step

Implementation by the build agent, phased per `SPEC.md`.
