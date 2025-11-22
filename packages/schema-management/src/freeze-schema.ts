#!/usr/bin/env node
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'vite';
import vue from '@vitejs/plugin-vue';

type ManifestEntry = {
  version: string;
  entry: string;
  builtAt: string;
  sourceCommit?: string | null;
  hash?: string;
  path: string;
};

type Manifest = {
  versions: Record<string, ManifestEntry>;
};

type PackageJson = {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  version?: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..', '..');
const versionsRoot = path.join(packageRoot, 'versions');
const superEditorRoot = path.resolve(packageRoot, '..', 'super-editor');
const starterEntry = path.join(packageRoot, 'src', 'frozen-starter-entry.ts');

const superEditorPkg = await readJson<PackageJson>(path.join(superEditorRoot, 'package.json'));
const superdocPkg = await readJson<PackageJson>(path.resolve(superEditorRoot, '..', 'superdoc', 'package.json'));

async function main() {
  const version = parseVersion(process.argv.slice(2));
  const force = process.argv.includes('--force');

  if (!version) {
    console.error('Usage: npm run freeze -- --version <semver>');
    process.exit(1);
  }

  if (!(await pathExists(starterEntry))) {
    console.error(`Starter entry not found at ${starterEntry}`);
    process.exit(1);
  }

  await fs.mkdir(versionsRoot, { recursive: true });

  const manifestPath = path.join(versionsRoot, 'schemas.json');
  const manifest = (await pathExists(manifestPath))
    ? await readJson<Manifest>(manifestPath)
    : { versions: {} };

  await assertManifestInSync(manifest);

  if (manifest?.versions?.[version]) {
    if (!force) {
      console.error(`Version ${version} already exists in schemas manifest. Use --force to overwrite.`);
      process.exit(1);
    }
    console.warn(`Overwriting existing version ${version} due to --force flag.`);
  }

  const versionDir = path.join(versionsRoot, version);

  if (await pathExists(versionDir)) {
    if (!force) {
      console.error(`Version directory already exists at ${versionDir}. Aborting to avoid overwriting.`);
      process.exit(1);
    }
    console.warn(`Overwriting existing directory ${versionDir} due to --force flag.`);
    await fs.rm(versionDir, { recursive: true, force: true });
  }

  try {
    await fs.mkdir(versionDir, { recursive: false });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      console.error(`Version directory already exists at ${versionDir}. Aborting to avoid overwriting.`);
      process.exit(1);
    }
    throw error;
  }

  const alias = buildAliasMap(superEditorRoot);
  const external = collectExternals(superEditorPkg);

  console.log(`Freezing schema from ${starterEntry}`);
  console.log(`- Target version: ${version}`);
  console.log(`- Output: ${versionDir}`);

  await build({
    configFile: false,
    root: superEditorRoot,
    plugins: [vue()],
    resolve: {
      alias,
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    },
    define: {
      __APP_VERSION__: JSON.stringify(superdocPkg.version),
    },
    build: {
      lib: {
        entry: starterEntry,
        formats: ['es'],
        fileName: () => 'schema.js',
        name: 'super_editor_schema',
      },
      outDir: versionDir,
      emptyOutDir: false,
      target: 'es2020',
      sourcemap: false,
      minify: false,
      cssCodeSplit: false,
      rollupOptions: {
        external,
        output: {
          inlineDynamicImports: true,
          exports: 'named',
        },
      },
    },
  });

  const entryPath = path.join(versionDir, 'schema.js');
  if (!(await pathExists(entryPath))) {
    console.error(`Build did not emit expected schema.js at ${entryPath}`);
    process.exit(1);
  }

  const hash = await hashFile(entryPath);
  const metadata: ManifestEntry = {
    version,
    entry: 'schema.js',
    builtAt: new Date().toISOString(),
    sourceCommit: readGitCommit(superEditorRoot),
    hash,
    path: `./${version}/schema.js`,
  };

  await fs.writeFile(path.join(versionDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

  const updatedManifest: Manifest = {
    versions: {
      ...(manifest.versions || {}),
      [version]: metadata,
    },
  };

  await fs.writeFile(manifestPath, JSON.stringify(updatedManifest, null, 2));

  console.log(`Schema ${version} frozen successfully.`);
}

function parseVersion(args: string[]): string | null {
  let version: string | null = null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--version=')) {
      version = arg.split('=')[1];
    } else if (arg === '--version') {
      const next = args[i + 1];
      if (next && !next.startsWith('--')) version = next;
    } else if (!arg.startsWith('--')) {
      version = arg;
    }
  }

  if (version && !/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+].+)?$/.test(version)) {
    console.error(`Invalid version "${version}". Expected semver format (e.g., 0.1.0 or 0.1.0-beta.1).`);
    process.exit(1);
  }

  return version;
}

function assertPathInsideRepo(targetPath: string) {
  const normalizedTarget = path.resolve(targetPath);
  if (!normalizedTarget.startsWith(repoRoot)) {
    throw new Error(`Refusing to operate outside repo root: ${normalizedTarget}`);
  }
}

function buildAliasMap(root: string) {
  return {
    '@superdoc/common': path.resolve(root, '..', '..', 'shared', 'common'),
    '@': path.resolve(root, 'src'),
    '@core': path.resolve(root, 'src', 'core'),
    '@extensions': path.resolve(root, 'src', 'extensions'),
    '@features': path.resolve(root, 'src', 'features'),
    '@components': path.resolve(root, 'src', 'components'),
    '@helpers': path.resolve(root, 'src', 'core', 'helpers'),
    '@packages': path.resolve(root, '..'),
    '@converter': path.resolve(root, 'src', 'core', 'super-converter'),
    '@tests': path.resolve(root, 'src', 'tests'),
    '@translator': path.resolve(root, 'src', 'core', 'super-converter', 'v3', 'node-translator', 'index.js'),
    '@preset-geometry': path.resolve(root, '..', 'preset-geometry', 'index.js'),
  };
}

function collectExternals(pkgJson: PackageJson) {
  const deps = Object.keys(pkgJson.dependencies || {});
  const peers = Object.keys(pkgJson.peerDependencies || {});
  return Array.from(new Set([...deps, ...peers]));
}

async function readJson<T>(filePath: string): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    if (!content.trim()) {
      throw new Error('Empty JSON file');
    }
    return JSON.parse(content) as T;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read JSON from ${filePath}: ${detail}`);
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function hashFile(filePath: string): Promise<string> {
  const data = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function assertManifestInSync(manifest: Manifest) {
  const existingDirs = await fs.readdir(versionsRoot, { withFileTypes: true });
  const versionDirs = existingDirs.filter((e) => e.isDirectory()).map((e) => e.name);
  const manifestVersions = Object.keys(manifest.versions || {});

  const missingDirs = manifestVersions.filter((v) => !versionDirs.includes(v));
  const orphanDirs = versionDirs.filter((v) => !manifestVersions.includes(v));

  if (missingDirs.length || orphanDirs.length) {
    const missingLabel = missingDirs.length ? missingDirs.join(', ') : 'none';
    const orphanLabel = orphanDirs.length ? orphanDirs.join(', ') : 'none';
    throw new Error(
      `Schema manifest and versions folder are out of sync. Missing dirs: ${missingLabel}; orphan dirs: ${orphanLabel}`,
    );
  }
}

function readGitCommit(cwd: string): string | null {
  assertPathInsideRepo(cwd);

  try {
    return execSync('git rev-parse HEAD', {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

await main();
