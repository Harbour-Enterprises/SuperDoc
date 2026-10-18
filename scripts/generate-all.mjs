#!/usr/bin/env node

/**
 * Full generation DAG — produces all derived artifacts from source-of-truth inputs.
 *
 * Phases (after cleanup: 1, 2-3, and 4 run concurrently; 3 requires 2):
 *   1. docapi:sync             → packages/document-api/generated/**
 *   2. cli:export-sdk-contract → apps/cli/generated/sdk-contract.json
 *   3. sdk codegen             → generated clients, tool catalogs, and native-binary embeddings
 *   4. @superdoc/fonts generate → packages/fonts/src/{asset-urls,bundled-families}.ts (from font-system)
 *
 * Before generation, gitignored output directories are cleaned to prevent stale file accumulation.
 *
 * Documentation is not generated here. The documentation site owns its own
 * reference and regenerates it during dev, build, test, and typecheck.
 */

import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

async function run(label, command, args) {
  const started = performance.now();
  console.log(`\n[generate] ${label}: starting\n  > ${command} ${args.join(' ')}`);
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: REPO_ROOT, env: process.env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('close', (code, signal) => code === 0 ? resolve() :
      reject(new Error(`${label} failed (${code ?? signal})`)));
  });
  console.log(`[generate] ${label}: complete in ${((performance.now() - started) / 1000).toFixed(1)}s`);
}

export async function runGenerationPhases(runPhase = run) {
  const results = await Promise.allSettled([
    runPhase('Document API outputs', 'pnpm', ['run', 'docapi:sync']),
    runPhase('SDK contract then codegen', 'node', [
      path.join(REPO_ROOT, 'packages/sdk/scripts/sdk-generate.mjs'),
      ...(process.argv.includes('--prepare-ci') ? ['--prepare-ci'] : []),
      ...(process.argv.includes('--skip-rust-sdk') || process.env.SUPERDOC_SDK_SKIP_RUST === '1' ? ['--skip-rust-sdk'] : []),
    ]),
    runPhase('Font sources', 'pnpm', ['--filter', '@superdoc/fonts', 'generate']),
  ]);
  const errors = results.filter((result) => result.status === 'rejected').map((result) => result.reason);
  if (errors.length) throw new AggregateError(errors, errors.map((error) => error.message).join('\n'));
}

async function clean() {
  console.log('Cleaning gitignored generated output directories...');
  await Promise.all([
    rm(path.join(REPO_ROOT, 'packages/document-api/generated'), { recursive: true, force: true }),
    rm(path.join(REPO_ROOT, 'apps/cli/generated'), { recursive: true, force: true }),
  ]);
}

async function main() {
  console.log('generate:all — producing all derived artifacts...\n');

  // Clean stale outputs
  await clean();

  await runGenerationPhases();

  console.log('\ngenerate:all complete.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
