import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { hashSourceInputClosure, hashEngineTree } from './engine-prepared-input.mjs';
import { runBuildCommand } from './build-resources.mjs';
import { createSuperDocArtifactStore } from './superdoc-artifact-store.mjs';

const PUBLIC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function prepareDocumentApi({ publicRoot = PUBLIC_ROOT, compilerRoot = publicRoot } = {}) {
  const root = path.join(publicRoot, 'packages/document-api');
  const lease = createSuperDocArtifactStore({ root: path.join(root, '.cache/compiler-lock'), lockTimeoutMs: 120000 });
  const release = await lease.acquireExclusiveLock();
  try {
    const inputs = [
      'packages/document-api/src', 'packages/document-api/tsconfig.json',
      'tsconfig.json', 'tsconfig.base.json', 'pnpm-lock.yaml', 'packages/document-api/package.json',
      'scripts/prepare-document-api.mjs', 'scripts/engine-prepared-input.mjs',
    ];
    const input = hashSourceInputClosure({ root: publicRoot, inputPaths: inputs }).digest;
    const require = createRequire(path.join(compilerRoot, 'package.json'));
    const compilerPackage = require.resolve('typescript/package.json');
    const { version: typescript, bin } = JSON.parse(readFileSync(compilerPackage, 'utf8'));
    const compiler = path.resolve(path.dirname(compilerPackage), bin.tsc);
    const key = createHash('sha256').update(JSON.stringify({ input, typescript, node: process.version })).digest('hex');
    const receipt = path.join(root, '.cache/compiled-receipt.json');
    try {
      const sealed = JSON.parse(readFileSync(receipt, 'utf8'));
      if (sealed.key === key && hashEngineTree(path.join(root, 'dist')).digest === sealed.output) {
        console.log('[document-api] reusing verified compiled output');
        return;
      }
    } catch { /* Missing or changed output is rebuilt. */ }
    console.log('[document-api] compiling shared runtime and types');
    await runBuildCommand(process.execPath, [compiler, '-b', '--clean', 'packages/document-api'], { cwd: publicRoot });
    await runBuildCommand(process.execPath, [compiler, '-b', 'packages/document-api'], { cwd: publicRoot });
    const finalInput = hashSourceInputClosure({ root: publicRoot, inputPaths: inputs }).digest;
    if (input !== finalInput) throw new Error('Document API inputs changed during compilation');
    mkdirSync(path.dirname(receipt), { recursive: true });
    const temporary = `${receipt}.${process.pid}.tmp`;
    try {
      writeFileSync(temporary, JSON.stringify({ key, output: hashEngineTree(path.join(root, 'dist')).digest }));
      renameSync(temporary, receipt);
    } finally { rmSync(temporary, { force: true }); }
  } finally { await release(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  prepareDocumentApi().catch((error) => { console.error(error); process.exitCode = 1; });
}
