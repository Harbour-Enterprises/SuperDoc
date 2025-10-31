# Measurement Engine Test Harness

This standalone Vite app lets you smoke-test Superdoc's measurement engine without keeping the harness inside the monorepo. The harness now consumes the published `superdoc` package directly, so you can move this folder anywhere on your machine and continue to work by linking the library locally.

## Prerequisites

- Node.js 20+
- A locally built copy of the Superdoc package (run `npm run build --workspace=packages/superdoc` inside the monorepo first)

## Setup

1. From the Superdoc package directory, expose the build as a local link:
   ```bash
   # inside packages/superdoc
   npm run build
   npm link
   ```
2. Inside this `test-harness` directory, install dependencies and link Superdoc:
   ```bash
   npm install
   npm link superdoc
   ```

Once linked, you can copy or move the harness directory anywhere and repeat `npm link superdoc` from inside it to point at a different build.

## Local Development

- `npm run dev` – start the harness in Vite dev mode
- `npm run build` – produce a static build in `dist/`
- `npm run preview` – preview the production build locally

## Deploy (optional)

`npm run deploy` triggers `scripts/deploy_gcs.sh`, which builds the app and rsyncs the output to the configured GCS bucket.
