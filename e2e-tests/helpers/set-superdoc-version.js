import { readFile, writeFile, access, copyFile, readdir, unlink } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const VUE_TPL_DIR = path.join(ROOT, 'templates', 'vue');
const VUE_PKG_JSON = path.join(VUE_TPL_DIR, 'package.json');
const DEP_NAME = 'superdoc';
const DEP_MODULE_SEGMENTS = DEP_NAME.startsWith('@') ? DEP_NAME.split('/') : [DEP_NAME];

/**
 * Spawn a child process and inherit stdio.
 * @param {string} cmd - Command to run (e.g., "npm").
 * @param {string[]} args - Arguments (e.g., ["install"]).
 * @param {import('child_process').SpawnOptions} [opts] - Spawn options.
 * @returns {Promise<void>} Resolves on exit code 0, rejects otherwise.
 */
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

/**
 * Spawn a child process and capture stdout/stderr.
 * @param {string} cmd - Command to run.
 * @param {string[]} args - Arguments.
 * @param {import('child_process').SpawnOptions} [opts] - Spawn options.
 * @returns {Promise<string>} Resolves with trimmed stdout on success, rejects with error on failure.
 */
function runCapture(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('exit', (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(`${cmd} ${args.join(' ')} failed: ${err || out}`));
    });
    child.on('error', reject);
  });
}

/**
 * Check if a file or directory exists.
 * @param {string} p - Path to check.
 * @returns {Promise<boolean>} True if path exists, false otherwise.
 */
async function fileExists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Locate the installed package.json for DEP_NAME, accounting for npm hoisting.
 * @returns {Promise<{ path: string, pkg: any } | null>}
 */
async function findInstalledPackageJson() {
  const relativePkgPath = path.join('node_modules', ...DEP_MODULE_SEGMENTS, 'package.json');
  const candidates = [path.join(VUE_TPL_DIR, relativePkgPath), path.join(ROOT, relativePkgPath)];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      const raw = await readFile(candidate, 'utf8');
      return { path: candidate, pkg: JSON.parse(raw) };
    }
  }

  return null;
}

/**
 * Update Superdoc dependency in `templates/vue/package.json` and install it.
 * - spec === 'local': pack sibling superdoc and install from local tarball.
 * - spec starts with file/path: install from provided tarball path.
 * - otherwise: treat as version/range and set directly.
 * @param {string} spec - 'local' | version/range | file/path spec.
 * @param {{ build?: boolean, buildLocal?: boolean, packLocal?: boolean, _localTarName?: string }} options
 */
async function setVersion(spec, options) {
  // Load templates/vue/package.json
  const pkgRaw = await readFile(VUE_PKG_JSON, 'utf8');
  const pkg = JSON.parse(pkgRaw);

  if (!pkg.dependencies || !(DEP_NAME in pkg.dependencies)) {
    throw new Error(`Dependency ${DEP_NAME} not found in ${VUE_PKG_JSON}`);
  }

  if (spec === 'local') {
    // Monorepo package path: ../../superdoc/packages/superdoc
    const siblingPkg = path.resolve(ROOT, '..', 'superdoc', 'packages', 'superdoc');
    const siblingPkgJson = path.join(siblingPkg, 'package.json');
    if (!(await fileExists(siblingPkgJson))) {
      throw new Error(`Expected package at ${siblingPkg} with a package.json`);
    }

    // Read version from sibling package.json
    const siblingPkgData = JSON.parse(await readFile(siblingPkgJson, 'utf8'));
    const siblingVersion = siblingPkgData.version || '0.0.0-local';

    // Determine git SHA for uniqueness
    let sha = '';
    try {
      const repoRoot = path.resolve(ROOT, '..', 'superdoc');
      sha = await runCapture('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot });
    } catch {
      sha = String(Date.now());
    }

    // Clean old local tarballs to avoid clutter
    try {
      const entries = await readdir(VUE_TPL_DIR);
      await Promise.all(
        entries
          .filter((f) => f.startsWith('superdoc-local') && f.endsWith('.tgz'))
          .map((f) => unlink(path.join(VUE_TPL_DIR, f)).catch(() => {})),
      );
    } catch {}

    // Always pack the local package and copy the tarball into templates/vue with unique name
    console.log('Packing local superdoc package ...');
    const tarName = await runCapture('npm', ['pack', '--silent'], { cwd: siblingPkg });
    const tarPath = path.join(siblingPkg, tarName);
    const localTarBase = `superdoc-local-${siblingVersion}-${sha}.tgz`;
    const localTar = path.join(VUE_TPL_DIR, localTarBase);
    await copyFile(tarPath, localTar);
    const fileSpec = `file:./${localTarBase}`;
    pkg.dependencies[DEP_NAME] = fileSpec;
    console.log(`Set ${DEP_NAME} to local tarball ${fileSpec}`);
    // Record for later logging
    options._localTarName = localTarBase;
  } else if (spec.startsWith('file:') || spec.startsWith('.') || spec.startsWith('..') || spec.startsWith('/')) {
    // Allow explicit file/path spec
    const fileSpec = spec.startsWith('file:') ? spec : `file:${spec}`;
    pkg.dependencies[DEP_NAME] = fileSpec;
    console.log(`Set ${DEP_NAME} to explicit file path ${fileSpec}`);
  } else {
    // Treat as version/range like 0.17.2 or ^0.17.2 or next tag
    pkg.dependencies[DEP_NAME] = spec;
    console.log(`Set ${DEP_NAME} to version ${spec}`);
  }

  await writeFile(VUE_PKG_JSON, JSON.stringify(pkg, null, 2) + '\n');

  // Install in the workspace
  console.log('Installing dependencies in templates/vue ...');
  const installArgs = ['install', '--workspace', 'templates/vue'];
  if (spec === 'local') installArgs.push('--force');
  await run('npm', installArgs, { cwd: ROOT });

  // Report installed version
  try {
    const installedInfo = await findInstalledPackageJson();
    if (!installedInfo) {
      throw new Error(`package not found in expected locations`);
    }
    const installed = installedInfo.pkg;
    if (spec === 'local' && options._localTarName) {
      console.log(`Installed local ${DEP_NAME} (pkg version ${installed.version}, source ${options._localTarName})`);
    } else {
      console.log(`Installed ${DEP_NAME} version: ${installed.version}`);
    }
  } catch (e) {
    console.warn('Could not determine installed version:', e.message);
  }

  if (options.build) {
    console.log('Building templates/vue ...');
    await run('npm', ['run', 'build', '--workspace', 'templates/vue'], { cwd: ROOT });
  }
}

/**
 * CLI entrypoint. Parses args and delegates to setVersion.
 * Supported flags: --build (builds templates/vue after install). Other parsed
 * flags are currently no-ops kept for compatibility.
 * Exits with code 1 on invalid usage or unhandled errors.
 */
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      'Usage: node helpers/set-superdoc-version.js <local|version|file:path> [--build] [--build-local] [--pack-local]',
    );
    process.exit(1);
  }
  const options = { build: false, buildLocal: false, packLocal: false };
  const filtered = [];
  for (const a of args) {
    if (a === '--build') options.build = true;
    else if (a === '--build-local') options.buildLocal = true;
    else if (a === '--pack-local') options.packLocal = true;
    else filtered.push(a);
  }

  const spec = filtered[0];
  await setVersion(spec, options);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
