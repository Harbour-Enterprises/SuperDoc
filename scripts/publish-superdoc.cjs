#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const superdocDir = path.join(rootDir, 'packages', 'superdoc');
const packageJsonPath = path.join(superdocDir, 'package.json');
const defaultRegistry = process.env.NPM_CONFIG_REGISTRY || 'https://registry.npmjs.org';

const run = (command, args, cwd) => {
  execFileSync(command, args, { stdio: 'inherit', cwd });
};

const isVersionPublished = (packageName, version) => {
  try {
    execFileSync(
      'npm',
      ['view', `${packageName}@${version}`, 'version', '--registry', defaultRegistry],
      { stdio: 'pipe' }
    );
    return true;
  } catch (error) {
    // npm returns exit code 1 when a version is not found
    if (error.status === 1) {
      return false;
    }
    throw error;
  }
};

const ensurePackageJson = () => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  if (packageJson.name !== 'superdoc') {
    throw new Error('Unexpected package name for packages/superdoc');
  }
  return packageJson;
};

const ensureDist = () => {
  const distPath = path.join(superdocDir, 'dist');
  if (!existsSync(distPath)) {
    throw new Error('Missing dist build for superdoc');
  }
};

const publishScopedMirror = (packageJson, distTag, logger = console) => {
  const scopedName = '@harbour-enterprises/superdoc';

  if (isVersionPublished(scopedName, packageJson.version)) {
    logger.log(`${scopedName}@${packageJson.version} already published, ensuring dist-tag "${distTag}" and skipping.`);
    run('npm', ['dist-tag', 'add', `${scopedName}@${packageJson.version}`, distTag], rootDir);
    return;
  }

  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'superdoc-publish-'));
  try {
    const scopedPackageJson = {
      ...packageJson,
      name: scopedName,
      publishConfig: {
        ...(packageJson.publishConfig || {}),
        access: 'public'
      },
      readme: 'README.md'
    };

    writeFileSync(path.join(tempDir, 'package.json'), `${JSON.stringify(scopedPackageJson, null, 2)}\n`);

    const distSource = path.join(superdocDir, 'dist');
    cpSync(distSource, path.join(tempDir, 'dist'), { recursive: true });

    const readmeSource = path.join(superdocDir, 'README.md');
    if (existsSync(readmeSource)) {
      cpSync(readmeSource, path.join(tempDir, 'README.md'));
    }

    logger.log(`Publishing @harbour-enterprises/superdoc with dist-tag "${distTag}"...`);
    run('npm', ['publish', '--access', 'public', '--tag', distTag], tempDir);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
};

const publishPackages = ({
  distTag = 'latest',
  publishUnscoped = true,
  build = true,
  logger = console
} = {}) => {
  if (build) {
    logger.log('Building packages...');
    run('npm', ['run', 'build'], rootDir);
  }

  const packageJson = ensurePackageJson();
  ensureDist();

  if (publishUnscoped) {
    if (isVersionPublished(packageJson.name, packageJson.version)) {
      logger.log(`superdoc@${packageJson.version} already published, ensuring dist-tag "${distTag}" and skipping.`);
      run('npm', ['dist-tag', 'add', `${packageJson.name}@${packageJson.version}`, distTag], rootDir);
    } else {
      logger.log(`Publishing superdoc with dist-tag "${distTag}"...`);
      run('npm', ['publish', '--access', 'public', '--tag', distTag], superdocDir);
    }
  }

  publishScopedMirror(packageJson, distTag, logger);
};

const parseArgs = (argv) => {
  let distTag;
  let skipUnscoped = false;
  let skipBuild = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dist-tag') {
      distTag = argv[index + 1];
      index += 1;
    } else if (arg === '--skip-unscoped') {
      skipUnscoped = true;
    } else if (arg === '--skip-build') {
      skipBuild = true;
    }
  }

  const envTag = process.env.RELEASE_DIST_TAG;
  const resolvedTag = distTag || envTag || 'latest';

  return {
    distTag: resolvedTag,
    publishUnscoped: !skipUnscoped && process.env.SKIP_UNSCOPED_PUBLISH !== 'true',
    build: !skipBuild && process.env.SKIP_BUILD !== 'true'
  };
};

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    publishPackages(options);
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}

module.exports = {
  publish: async (pluginConfig, context) => {
    const { nextRelease, logger = console } = context;
    const distTag = (nextRelease && nextRelease.channel) || 'latest';

    publishPackages({
      distTag,
      publishUnscoped: true,
      build: true,
      logger
    });
  },
  publishPackages
};
