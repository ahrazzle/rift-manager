# Rift Manager

A League of Legends esports management simulation: build your roster, prepare your
five, make tactical calls, and chase regional and international titles.

Play [staging](https://lck-manager-staging.vercel.app/) or read the
[guide](docs/GUIDE.md). Project context: [HANDOFF.md](HANDOFF.md).

## Run and verify

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

React 18 + Vite, entirely client-side. Four story modes: Season, Career, Scenario
and Gauntlet. Draft and IGL are optional match add-ons; Show simulation enables
an animated map with moving player and objective icons in any story mode. Rosters span 2013–2026 across LCK, LPL, LEC and LCS.
Historical careers create alternate timelines. Ratings are fictional and formats
are simplified; these are not official esports statistics.

Season and Career include weekly preparation and post-match coaching reviews.
Choose add-ons when starting a story or before each match, including playoffs,
MSI and Worlds. IGL always uses the map and pauses for your macro call.
Progress saves locally in your browser. Staging has a separate save from live.

Deploy from a clean commit with `bash scripts/deploy-staging.sh`, then follow the
[deployment verification steps](docs/DEPLOY-AND-CONTINUE.md). The script is pinned
to the staging project and deploys from a git-free copy.
