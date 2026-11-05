<h1><img src="public/brand/rift-signature.svg" alt="Rift Manager" width="320" height="135" /></h1>

A League of Legends esports management sim by [Aska Digital](https://digital.askaconsult.com/).
Build a roster, prepare your team, make tactical calls, and chase regional and
international titles. Matches simulate themselves; your decisions happen in the
coach’s office, on the draft board, and at key moments in a series.

**[Play the live game](https://www.rift.askaconsult.com/)** ·
**[Staging snapshot](https://lck-manager-staging.vercel.app/)** ·
[How to play](docs/GUIDE.md)

## Current release

**V1 (v1.0.0)** is staged as a [draft release](https://github.com/ahrazzle/rift-manager/releases/tag/v1.0.0).
It includes historical rosters, Draft and IGL add-ons, the illustrated match
broadcast, the tower-and-pennant brand identity, and map presentation controls.
The public www site is served from the repository’s `gh-pages` branch. Vercel
staging remains a separate preview environment. Source changes merged into `main`
automatically trigger the tested Pages build and live publication workflow.
Review release impact before merging.
See the [historical release record](docs/RELEASE-2026-11-03.md) for earlier
source/build verification and the [runbook](docs/DEPLOY-AND-CONTINUE.md) for current publication.

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

Use Node.js 24 and npm to match the release workflow. Clone the repo, create a branch for changes, then run:

```sh
npm ci
npm run dev
```

Build and preview with:

```sh
npm run build
npm run preview
```

Run `npm test` to execute every `test/*.test.mjs` suite. The runner discovers
suites automatically; social-preview source landed through [PR #14](https://github.com/ahrazzle/rift-manager/pull/14).

## How it works

React 18 + Vite, entirely in the browser. Saves use `localStorage`; no account or
backend is required. Staging paths and matching Vercel staging hosts use a separate
save key. Browser storage is origin-specific; changing hostnames does not transfer saves.

- `src/components/` — game screens and controls
- `src/game/` — state, management systems, and progression
- `src/engine/` — match and schedule simulation
- `src/data/` — rosters, ratings, and game content
- `test/` — simulation and gameplay regression suites

Read the [player guide](docs/GUIDE.md), [project handoff](HANDOFF.md),
[changelog](CHANGELOG.md), and [deployment runbook](docs/DEPLOY-AND-CONTINUE.md)
for details. Research notes and older changelog entries describe historical snapshots.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup,
how to propose a change, and what happens to your pull request. Read
[docs/GUIDE.md](docs/GUIDE.md) and [docs/roadmap.md](docs/roadmap.md) for how
the game works and where it is headed. Use
[Discussions](https://github.com/ahrazzle/rift-manager/discussions) for ideas
and questions; use issues for bugs and concrete work.

The short version: fork, branch from `main`, run `npm test` and `npm run
build` before submitting, include desktop and mobile screenshots for UI
changes, and add a regression test for behavior changes. Play-affecting pull
requests should name the player decision and the visible consequence; blocked
actions should explain why in the UI.

The game uses Riot champion imagery and League of Legends names; these are not
original project assets. No software license is currently included in this
repository. Public source availability alone does not grant reuse rights.

---

Made by **[Aska Digital](https://digital.askaconsult.com/)**.
Created by [@ahrazzle](https://github.com/ahrazzle).
