# Source recovery — 2026-10-22

The GitHub repository now separates the deployed production source from staging.
This recovery does not deploy or promote either Vercel project.

## Production baseline

Commit `770368e` on `main` imports all 66 original source files from the active
production deployment `dpl_3LykpPfQmxMzbV3YPVCwwrzZUmUn` in the `lck-manager`
project (`prj_2qbmbEiltHWRih3MkCFpenMmuVjb`), team `a-4677s-projects`.
Each file's SHA-1 matches Vercel's file inventory.

`npm ci --ignore-scripts`, all 11 existing Node test suites, and `npm run build`
passed. Generated JS and CSS byte-match https://lolsim.askaconsult.com/:

| Production asset | SHA-256 |
| --- | --- |
| `index-vxW5Ypw7.js` | `f2806c5c96129df9408608c1aa7463ade4736feeacf8911bd39e19c6528cc751` |
| `index-DWNpP5vs.css` | `3aa1695def24075dceb500dcf6ed72a6a50f0ca37c33843996819bb3d2470be5` |

## Staging update

Branch `update/staging` imports the 129 files from the owner's
[Drive vault](https://drive.google.com/drive/folders/1-SHUV7zfFa2465XtQrW_apwnb8ki60G8).
The vault contains staging, not the older production release. Downloads used raw
files and all sizes matched Drive metadata. Application source was not rewritten.

`npm ci --ignore-scripts`, `npm test` (24/24 suites), and `npm run build` passed.
Generated assets byte-match https://lck-manager-staging.vercel.app/:

| Staging asset | SHA-256 |
| --- | --- |
| `index-CCpH5lbW.js` | `a57d415d1d37e2bb50a9eeb38445fc5bfb58e21c0a1d76d6da8bf288ae0a51fd` |
| `index-PQUylMsM.css` | `8c0b0235e3b3dd76d01537fdcc47e4ce4f7796c9530982019f02b7ae2f5a6d72` |

The lazy `html2canvas.esm-CBrSDip1.js` chunk also byte-matches staging. These
checks establish source/build equivalence; they do not add new browser playtesting.

## Documentation and deployment

The original handoff, changelog and deployment runbook are preserved. Their old
machine paths, local Git commit IDs, and statements about having no GitHub remote
are historical. The repository is now https://github.com/ahrazzle/rift-manager.

Keep production and staging release decisions separate. Neither Vercel project
was connected to this GitHub repository during recovery. The legacy `deploy.sh`
uses whichever project is locally linked; use the pinned staging script and
existing deployment runbook for staging work. Merging the source PR does not
itself promote a Vercel deployment.
