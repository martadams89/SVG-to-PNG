# SVG to PNG Converter

A fast, fully client-side utility to convert SVG images to PNG with custom
scaling and cropping. Drop in an SVG, pick a scale, optionally crop, and
download a rasterised PNG — no upload, no server, everything runs in the browser.

Built with **React 19 + Vite + Tailwind**, and deployed to
**[Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/)**
as a static-assets Worker.

## Run locally

**Prerequisites:** Node.js 20+ (CI uses Node 24).

```bash
npm install
npm run dev      # http://localhost:3000
```

## Scripts

| Script            | Description                                        |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Start the Vite dev server                          |
| `npm run build`   | Production build to `dist/`                         |
| `npm run preview` | Preview the production build locally               |
| `npm run lint`    | Typecheck with `tsc --noEmit`                       |
| `npm test`        | Run the unit tests (Vitest)                         |
| `npm run deploy`  | Build and deploy to Cloudflare Workers (`wrangler`) |

## Deploy to Cloudflare Workers

The app ships as a [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
project. Configuration lives in [`wrangler.jsonc`](wrangler.jsonc): the built
`dist/` directory is served directly, with `not_found_handling` set to
`single-page-application` so client-side routes fall back to `index.html`.

### Option A — deploy from your machine

```bash
npm install
npx wrangler login      # one-time browser auth to your Cloudflare account
npm run deploy          # builds, then `wrangler deploy`
```

### Option B — connect the repo (Workers Builds)

In the Cloudflare dashboard: **Workers & Pages → Create → connect this GitHub
repo**, then set:

- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`

Cloudflare will build and deploy on every push to `main`.

> The Worker name is `svg-to-png` (see `wrangler.jsonc`). Change it there if you
> want a different `*.workers.dev` subdomain or to attach a custom domain.

## Project layout

```
index.html            App entry
src/App.tsx           UI (drop zone, scale/crop controls, canvas render)
src/lib/svg.ts        Pure helpers (dimension parsing, filenames) — unit tested
tests/svg.test.ts     Vitest unit tests
wrangler.jsonc        Cloudflare Workers (static assets) config
```

## Automation

This repo mirrors the CI/CD conventions used across the org:

- **CI** ([`ci.yml`](.github/workflows/ci.yml)) — on every PR and push to `main`:
  typecheck, unit tests, and a production build. This is the required status
  check (`Lint, test & build`) gating merges to `main`.
- **Renovate** ([`renovate.json`](renovate.json)) — dependency updates, grouped
  and scheduled, with **auto-merge once CI is green** (CI is the gate, not
  semver). Runs on a daily schedule via [`renovate.yml`](.github/workflows/renovate.yml).
- **Release Please** ([`release-please.yml`](.github/workflows/release-please.yml)) —
  maintains a versioned release PR from Conventional Commits and enables
  auto-merge on it.
- **Branch protection** — a ruleset on `main` requires PRs and passing CI, and
  blocks branch deletion. Zero required approvals so Renovate/Release-Please can
  auto-merge unattended.

Both Renovate and Release Please authenticate with a `RENOVATE_TOKEN` repository
secret (a GitHub PAT with `repo` + `workflow` scope).
