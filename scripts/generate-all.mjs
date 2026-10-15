#!/usr/bin/env node

/**
 * Full generation DAG — produces all derived artifacts from source-of-truth inputs.
 *
 * Phases (run in order; 1-3 are sequential, 4 is independent):
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

import { execFile } from 'node:child_process';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

async function run(command, args) {
  console.log(`  > ${command} ${args.join(' ')}`);
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd: REPO_ROOT,
      env: process.env,
    });
    if (stdout.trim()) console.log(stdout.trim());
    if (stderr.trim()) console.error(stderr.trim());
  } catch (error) {
    if (typeof error?.stdout === 'string' && error.stdout.trim()) {
      console.log(error.stdout.trim());
    }
    if (typeof error?.stderr === 'string' && error.stderr.trim()) {
      console.error(error.stderr.trim());
    }
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
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

  // Phase 1-2: Document API contract outputs
  console.log('\n--- Phase 1: docapi:sync ---');
  await run('pnpm', ['run', 'docapi:sync']);

  // The SDK graph owns contract export, all projections, embeddings, and cleanup.
  // CI checks tracked SDK projections before writing its ignored build inputs.
  console.log('\n--- Phase 2-3: SDK generation ---');
  await run('node', [
    path.join(REPO_ROOT, 'packages/sdk/scripts/sdk-generate.mjs'),
    ...(process.argv.includes('--prepare-ci') ? ['--prepare-ci'] : []),
  ]);

  // Phase 4: @superdoc/fonts derived sources: bundled asset URLs (from the asset dir) plus curatable
  // family names (from font-system offerings). Kept out of the package's build/prepare lifecycle so a
  // standalone install never needs tsx; regenerated here, in the workspace pipeline.
  console.log('\n--- Phase 4: @superdoc/fonts generate ---');
  await run('pnpm', ['--filter', '@superdoc/fonts', 'generate']);

  console.log('\ngenerate:all complete.');
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
