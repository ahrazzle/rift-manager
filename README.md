# Rift Manager

A League of Legends esports management sim by [Aska Digital](https://digital.askaconsult.com/).
Build a roster, prepare your team, make tactical calls, and chase regional and
international titles. Matches simulate themselves; your decisions happen in the
coach’s office, on the draft board, and at key moments in a series.

**[Play the live game](https://www.rift.askaconsult.com/)** ·
**[Staging snapshot](https://lck-manager-staging.vercel.app/)** ·
[How to play](docs/GUIDE.md)

## Current release

The latest released game includes historical rosters, Draft and IGL add-ons,
and map presentation controls. The public www site is served from the repository’s
`gh-pages` branch. Vercel staging remains a separate preview environment. Source
changes on `main` and the published Pages build are reviewed separately.
See the [release record](docs/RELEASE-2026-11-03.md) for the tested source and build.

Features include:

- **Season, Career, Scenario, and Gauntlet:** manage a split, build a club across
  seasons, relive story campaigns, or survive five escalating series.
- **Historical rosters:** choose years from 2013–2026 across LCK, LPL, LEC, and LCS.
- **Draft and IGL add-ons:** pick and ban before games, then make macro calls at
  tactical pauses. Use either add-on or both together.
- **Animated Rift map:** watch players and objectives move through an illustrative
  match timeline, including playoffs, MSI, and Worlds. Choose player/champion
  labels and role icons, player initials, or drafted champion portraits.
- **Preparation and reviews:** coach players each week and use post-match reviews
  to plan the next matchup.

Player ratings are fictional, balanced game values. Historical rosters have
uncertainty and league formats are simplified. Map movement illustrates simulated
events; it is not live League telemetry.

## Run locally

Use Node.js 22 or newer and npm. Clone the repo and stay on `main`, then run:

```sh
npm ci
npm run dev
```

Build and preview with:

```sh
npm run build
npm run preview
```

Run `npm test` to execute every `test/*.test.mjs` suite. The game release has
25 suites; the social-preview source reconciliation in PR #10 adds a 26th.

## How it works

React 18 + Vite, entirely in the browser. Saves use `localStorage`; no account or
backend is required. Staging uses a separate save key from production.

- `src/components/` — game screens and controls
- `src/game/` — state, management systems, and progression
- `src/engine/` — match and schedule simulation
- `src/data/` — rosters, ratings, and game content
- `test/` — simulation and gameplay regression suites

Read the [player guide](docs/GUIDE.md), [project handoff](HANDOFF.md),
[changelog](CHANGELOG.md), and [deployment runbook](docs/DEPLOY-AND-CONTINUE.md)
for details. Research notes and older changelog entries describe historical snapshots.

## Contributing

Open an issue with reproduction steps, expected behavior, and browser/device
information, or propose a focused pull request against `main`. Run `npm test` and
`npm run build` before submitting. Include screenshots for UI changes and a
regression test for behavior changes. Never commit saves containing private data,
credentials, `.env` files, build output, or `node_modules`.

The game uses Riot champion imagery and League of Legends names; these are not
original project assets. No software license is currently included in this
repository. Public source availability alone does not grant reuse rights.

---

Made by **[Aska Digital](https://digital.askaconsult.com/)**.
Created by [@ahrazzle](https://github.com/ahrazzle).
