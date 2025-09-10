# Repository Guidelines

## Project Structure & Module Organization

- Monorepo using npm workspaces: `packages/*`, `shared/*`.
- Primary packages: `packages/superdoc` (Vue app + build) and `packages/super-editor` (editor core + utilities).
- Tests live near source (e.g., `src/**/*.test.js`) and under `src/tests/`.
- Built artifacts go to `dist/` (do not edit). Documentation lives in `docs/`. Examples are under `examples/`.

## Build, Test, and Development Commands

- Run both packages locally: `npm run dev` (opens playgrounds as configured).
- Package dev servers: `npm run dev --workspace=packages/superdoc` and `npm run dev --workspace=packages/super-editor`.
- Build all: `npm run build` (runs editor build, then superdoc). Clean: `npm run clean:packages`.
- Tests (Vitest): root super‑editor tests `npm test`; coverage `npm run test:cov`. Superdoc tests: `npm run test --workspace=packages/superdoc`.
- Lint/format: `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check`.

## Coding Style & Naming Conventions

- Use Prettier and ESLint. Defaults: 2‑space indent, semicolons, single quotes, `printWidth=120`.
- File naming: composables/stores in kebab‑case (e.g., `use-high-contrast-mode.js`, `superdoc-store.js`); core classes in PascalCase (e.g., `Editor.js`, `DocxZipper.js`).
- Avoid changes in `dist/`, `examples/`, and generated/vendor files ignored by ESLint.

## Testing Guidelines

- Framework: Vitest (+ Vue Test Utils where relevant).
- Name tests `*.test.js`; place adjacent to code or under `src/tests/`.
- Aim to cover critical parsing, schema, and UI-state logic; run `npm run test:cov` before PRs when touching editor core.

## Commit & Pull Request Guidelines

- Conventional Commits enforced via commitlint/husky (e.g., `feat:`, `fix:`, `docs:`, `refactor:`, `test:`).
- PRs should include: clear description, linked issue, steps to verify, and screenshots/GIFs for UI changes.
- Ensure `npm run build`, `npm run lint:fix`, and tests pass locally. Draft PRs welcome for early feedback.
- Releases are automated with semantic‑release; avoid manual version bumps in package files.

## Security & Configuration Tips

- Do not commit secrets; repo includes `.gitleaks.toml`. Respect `SECURITY.md`.
- Keep changes scoped to a workspace; when in doubt, build both packages to verify integration.
