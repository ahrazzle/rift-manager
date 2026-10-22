# LCK Manager (MVP)

> **New here? Read [`HANDOFF.md`](HANDOFF.md)** — overview, current live/staging state, architecture,
> features shipped, and how to continue. Ops runbook: [`docs/DEPLOY-AND-CONTINUE.md`](docs/DEPLOY-AND-CONTINUE.md).

A League of Legends esports **team-management simulation**. You are the head coach/GM of an
LCK team: set your starting roster, pick tactics, train players, and sim a season. No
in-game playing — matches are auto-resolved by a rating + form + tactics model.

## Stack
- React 18 + Vite (pure client-side SPA, no backend)
- State persisted to `localStorage`
- Deployable as a static site (Vercel / Netlify / any static host)

## Run locally
```
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs ./dist
npm run preview  # serve the build
```

## Project layout
- `src/data/lck.js` — teams, rosters, ratings, free agents (EDIT HERE to change the league)
- `src/engine/sim.js` — match simulation engine (pure JS, also runs under node for tests)
- `src/engine/season.js` — schedule (round-robin) generation
- `src/game/useGameState.js` — game state + localStorage persistence
- `src/components/*` — UI views
- `src/App.jsx` — shell, navigation, view routing

## Notes on data
Team names and player names reference the LCK for flavor. All ratings (ovr / mech / macro /
consist / form) are **game-balanced fictional values** for the simulation, not official stats.
Everything lives in `src/data/lck.js` and is easy to edit or replace with real data later.
