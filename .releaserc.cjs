/* eslint-env node */

const branch = process.env.GITHUB_REF_NAME || process.env.CI_COMMIT_BRANCH

const config = {
  branches: [
    {
      name: 'stable',
      channel: 'latest', // Only stable gets @latest
    },
    {
      name: 'main',
      prerelease: 'next',
      channel: 'next',
    },
    // Maintenance branches - channel transforms to lts/X.Y format
    {
      name: '+([0-9])?(.{+([0-9]),x}).x',
      channel: 'lts/${name.replace(/\\.x$/g, "")}' // 0.29.x → lts/0.29
    },
  ],
  tagFormat: 'v${version}',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    // NPM plugin MUST come before git plugin - ADD pkgRoot HERE!
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
        pkgRoot: 'packages/superdoc'
      }
    ],
    './scripts/publish-superdoc.cjs'
  ],
}

// Only add changelog and git plugins for non-prerelease branches
const isPrerelease = config.branches.some(
  (b) => typeof b === 'object' && b.name === branch && b.prerelease
)

if (!isPrerelease) {
  // Add changelog BEFORE git
  config.plugins.push([
    '@semantic-release/changelog',
    {
      changelogFile: 'packages/superdoc/CHANGELOG.md'  // Also specify where changelog goes
    }
  ])

  // Git plugin comes AFTER npm and changelog
  config.plugins.push([
    '@semantic-release/git',
    {
      assets: [
        'packages/superdoc/CHANGELOG.md',
        'packages/superdoc/package.json'  // Update paths to point to actual package
      ],
      message:
        'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
    },
  ])
}

// GitHub plugin comes last
config.plugins.push('@semantic-release/github')

module.exports = config
