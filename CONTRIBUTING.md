# Contributing to Rift Manager

Rift Manager is a League of Legends esports management sim. You build a roster,
coach your team, and chase regional and world titles. It runs entirely in the
browser: React 18 and Vite, no backend, no accounts. Saves live in the browser's
local storage.

Play the live game at https://www.rift.askaconsult.com/ and read the
[player guide](docs/GUIDE.md) and [roadmap](docs/roadmap.md) before changing
how the game plays.

## Before you start

- Use [GitHub Discussions](https://github.com/ahrazzle/rift-manager/discussions)
  for open-ended questions, ideas, and feedback that do not need a tracked fix.
  Use [issues](https://github.com/ahrazzle/rift-manager/issues) for bugs,
  concrete feature requests, and work you plan to implement.
- Check the open issues. If one describes your idea or bug, work there instead
  of opening a duplicate.
- For a large change, open an issue first and describe what you want to do.
  A short discussion up front saves a rejected pull request later.
- Small fixes (typos, a broken link, a small bug with a clear fix) can go
  straight to a pull request.

## Set up

Use Node.js 24 and npm, to match the release workflow.

```sh
npm ci
npm run dev
```

Build and preview the production version with:

```sh
npm run build
npm run preview
```

## Making a change

- Fork the repo, then branch from `main`. Name the branch after the change.
- Keep each pull request focused on one thing.
- Follow the patterns already in the code. If the code near your change does
  something a certain way, do it that way.
- Add or update a test when you change behavior. Tests live in `test/` and
  run with `npm test`. A behavior change without a test is likely to be sent
  back.
- Keep old saves loading. Saves live in local storage, and players keep them
  across versions. If you change the save format, add a migration for the old
  one. The suites in `test/` cover save migration and recovery.
- Champion portraits come from Riot's image service with a role-icon fallback.
  Do not point the game at a new image source without saying so in the pull
  request.
- Write game text in plain language. Short sentences, common words, no jargon
  a new player would have to look up.
- If your change affects how the game plays, name the **player decision** and
  the **visible consequence** in the pull request description.
- Prefer no silent failure. When the player cannot act (budget, blocked action,
  invalid choice), the UI should say why.
- Ratings and match history are fictional game values with honesty tags. Do not
  present them as live telemetry or rewrite fixed historical losses.
- Prefer tuning magnitudes and data balance over opaque formula rewrites when
  you can.

## Checks before you submit

Run these two commands and fix anything they report:

```sh
npm test
npm run build
```

Include screenshots for any change you can see: one at desktop width and one
at about mobile width (~390px). If you touch animation, respect reduced motion
(`prefers-reduced-motion`) the way nearby styles already do. In the pull
request, say what changed and how you checked it.

Never commit saves that contain private data, credentials, `.env` files,
build output (`dist/`), or `node_modules/`.

## What happens to your pull request

- Every pull request runs the test suite and a production build. Both must pass.
- A maintainer reviews it. One approval is required, and all review comments
  must be resolved before it merges.
- Merging to `main` publishes the live game, so review happens before the
  merge, not after. Do not merge your own pull request.

## License and assets

This repository currently has no software license. Public source availability
alone does not grant reuse rights. Champion portraits and League of Legends
names belong to Riot Games; they are not original project assets.

## Be kind

Assume good intent, disagree about the work rather than the person, and keep
the tone one you would want to read about your own work.
