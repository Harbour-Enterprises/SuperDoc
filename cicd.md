# CI/CD Pipeline Documentation

> Comprehensive guide to SuperDoc's continuous integration and deployment workflows.
> For contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Overview

SuperDoc implements a dual-track release strategy with fully automated versioning:

- **@next channel**: Pre-release versions from `main` branch
- **@latest channel**: Stable versions from `release/**` branches

All releases are automated through semantic-release based on conventional commits.

## Workflow Architecture

<img width="1238" height="1180" alt="image" src="https://github.com/user-attachments/assets/4f5635ef-abbb-4db8-90be-833f39eae41d" />

## GitHub Actions Workflows

### Core Workflows

#### 1. PR Validation (`pr-validation.yml`)

**Triggers**: All pull requests to `main` or `release/**`

**Checks**:

- Conventional commit validation
- Code formatting (Prettier)
- Linting (ESLint)
- Unit tests
- Visual regression tests
- E2E tests (main branch only)

**Required to pass before merge**.

#### 2. Release Next (`release-next.yml`)

**Triggers**:

- Push to `main` (paths: `packages/**`, excluding markdown)
- Manual workflow dispatch

**Process**:

1. Run full test suite including E2E
2. Build packages
3. Semantic-release publishes to npm @next
4. Version format: `X.Y.Z-next.N`

#### 3. Release Stable (`release-stable.yml`)

**Triggers**:

- Push to `release/**` branches
- Manual workflow dispatch

**Process**:

1. Run full test suite including E2E
2. Build packages
3. Semantic-release publishes to npm @latest
4. Creates GitHub release with changelog

#### 4. Create Release Branch (`create-release.yml`)

**Trigger**: Manual workflow dispatch

**Input**: Version number (e.g., `0.21`, `1.0`)

**Actions**:

- Creates `release/vX.Y` branch from main
- Triggers immediate stable release
- Switches npm @latest tag to new version

#### 5. Sync Patches (`sync-patches.yml`)

**Triggers**: Fix commits or release commits to `release/**`

**Actions**:

- Automatically creates PR from release branch to main
- Labels with `patch-sync` and `automerge`
- Ensures hotfixes flow back to development

### Support Workflows

#### 6. Test Suite (`test-suite.yml`)

**Type**: Reusable workflow

**Components**:

- Code quality checks (format, lint)
- Unit tests (Vitest)
- Visual regression tests (Playwright)
- E2E tests (external service)

**Configurable inputs**:

- `run-visual`: Enable visual tests
- `run-e2e`: Enable E2E tests
- `update-screenshots`: Update visual baselines

#### 7. Visual Tests (`test-example-apps.yml`)

**Triggers**:

- PR/Push with changes to `examples/**` or `packages/**/src/**`
- Manual dispatch for screenshot updates

**Features**:

- Path filtering for efficiency
- Screenshot comparison
- Artifact upload on failures
- Automated PR creation for updates

#### 8. Trigger Docs Update (`trigger-docs-update.yml`)

**Triggers**:

- Release published event
- Manual workflow dispatch

**Action**: Notifies documentation repository to update

## Release Strategy

### Version Progression

```
main (1.0.0-next.1) → create release/v1.0 → 1.0.0 (@latest)
         ↓                                      ↓
    1.1.0-next.0                          hotfix: 1.0.1
         ↓                                      ↓
    continues...                         auto-sync to main
```

### Semantic Versioning

Version bumps are automatic based on commit messages:

| Commit Prefix                  | Version Change | Example                    | Result        |
| ------------------------------ | -------------- | -------------------------- | ------------- |
| `fix:`                         | Patch          | `fix: resolve memory leak` | 1.2.3 → 1.2.4 |
| `feat:`                        | Minor          | `feat: add PDF export`     | 1.2.3 → 1.3.0 |
| `feat!:` or `BREAKING CHANGE:` | Major          | `feat!: new API format`    | 1.2.3 → 2.0.0 |
| `chore:`, `docs:`, `style:`    | None           | `docs: update README`      | No change     |

### NPM Distribution Tags

- **@next**: Latest pre-release from main branch
  - Install: `npm install @harbour-enterprises/superdoc@next`
  - Format: `X.Y.Z-next.N`
- **@latest**: Current stable release
  - Install: `npm install @harbour-enterprises/superdoc`
  - Format: `X.Y.Z`

## Configuration Files

### `.releaserc.json`

```json
{
  "branches": [
    {
      "name": "main",
      "prerelease": "next",
      "channel": "next"
    },
    {
      "name": "release/v+([0-9]).+([0-9])",
      "channel": "latest",
      "range": "${name.replace(/^release\\/v/, '')}.x"
    }
  ]
}
```

### `commitlint.config.mjs`

```javascript
export default {
  extends: ['@commitlint/config-conventional'],
};
```

## Workflow Scenarios

### Scenario 1: Feature Development

1. Developer creates feature branch from main
2. Opens PR → triggers validation workflow
3. All checks pass → merge to main
4. Automatic @next release (e.g., `1.1.0-next.1`)

### Scenario 2: Creating Stable Release

1. Trigger "Create Release Branch" workflow
2. Input version: `1.1`
3. Creates `release/v1.1` branch
4. Automatically publishes `1.1.0` as @latest

### Scenario 3: Hotfix to Production

1. Checkout `release/v1.1` branch
2. Commit fix: `fix: resolve critical bug`
3. Push → automatically releases `1.1.1`
4. Auto-creates PR to sync fix back to main

### Scenario 4: Breaking Change

1. Commit to main: `feat!: redesign plugin API`
2. Merges → releases `2.0.0-next.0`
3. Later create `release/v2.0` for stable

## Branch Protection Rules

### Main Branch

- Require pull request before merging
- Require status checks to pass
- Require branches to be up to date
- Require conversation resolution
- No force pushes
- No deletions

### Release Branches (`release/**`)

- Require pull request (except for maintainers)
- Allow maintainer direct commits for hotfixes
- Require status checks
- No force pushes
- No deletions

## Monitoring & Debugging

### Check Release Status

```bash
# View latest releases
npm view @harbour-enterprises/superdoc versions --json

# Check current tags
npm view @harbour-enterprises/superdoc dist-tags

# Dry run to preview release
npx semantic-release --dry-run --no-ci
```

### Common Issues

**Release not triggering:**

- Check commit message format
- Verify branch configuration in `.releaserc.json`
- Ensure GitHub Actions secrets are configured

**Version not incrementing correctly:**

- Review commit types since last release
- Check for `[skip ci]` in commit messages
- Verify semantic-release plugins are loaded

**Tests failing on release:**

- Visual tests may need screenshot updates
- Check for flaky E2E tests
- Verify all dependencies are installed

## Performance Optimizations

- **Path filtering**: Workflows only run when relevant files change
- **Concurrency groups**: Prevent duplicate workflow runs
- **Parallel jobs**: Tests run simultaneously where possible
- **Caching**: Dependencies cached between runs
- **Conditional E2E**: Only for main branch PRs

---

For contribution guidelines and development setup, see [CONTRIBUTING.md](CONTRIBUTING.md).  
For questions about CI/CD, reach out on [Discord](https://discord.gg/wjMccuygvy) or [GitHub Discussions](https://github.com/Harbour-Enterprises/SuperDoc/discussions).
