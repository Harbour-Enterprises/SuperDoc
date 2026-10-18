import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { prepareDocumentApi } from '../prepare-document-api.mjs';

const publicRoot = fileURLToPath(new URL('../..', import.meta.url));
const v2Manifest = path.resolve(publicRoot, '../v2/package.json');
function installedCompilerPackage() {
  try {
    return createRequire(path.join(publicRoot, 'package.json')).resolve('typescript/package.json');
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND' || !existsSync(v2Manifest)) throw error;
    return createRequire(v2Manifest).resolve('typescript/package.json');
  }
}
const compilerPackage = installedCompilerPackage();

function fixture(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'sd-document-api-compiler-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'public');
  const api = path.join(root, 'packages/document-api');
  mkdirSync(path.join(api, 'src'), { recursive: true });
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  writeFileSync(path.join(root, 'tsconfig.base.json'), JSON.stringify({ compilerOptions: {
    target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', types: [],
  } }));
  writeFileSync(path.join(api, 'package.json'), JSON.stringify({ type: 'module' }));
  writeFileSync(path.join(api, 'tsconfig.json'), JSON.stringify({
    extends: '../../tsconfig.base.json',
    compilerOptions: { composite: true, declaration: true, rootDir: 'src', outDir: 'dist' },
    include: ['src/**/*.ts'],
  }));
  writeFileSync(path.join(api, 'src/index.ts'), 'export const value: number = 42;\n');
  return { directory, root, api };
}

function installCompiler(root) {
  mkdirSync(path.join(root, 'node_modules'), { recursive: true });
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ private: true, type: 'module',
    devDependencies: { typescript: JSON.parse(readFileSync(compilerPackage, 'utf8')).version } }));
  symlinkSync(path.dirname(compilerPackage), path.join(root, 'node_modules/typescript'), 'dir');
}

test('prepares Document API with the V2 compiler while the public root is uninstalled', async (t) => {
  const { directory, root, api } = fixture(t);
  const compilerRoot = path.join(directory, 'v2');
  installCompiler(compilerRoot);
  assert.equal(existsSync(path.join(root, 'node_modules')), false);
  await prepareDocumentApi({ publicRoot: root, compilerRoot });
  assert.match(readFileSync(path.join(api, 'dist/index.js'), 'utf8'), /export const value = 42;/u);
  assert.match(readFileSync(path.join(api, 'dist/index.d.ts'), 'utf8'), /export declare const value: number;/u);
  assert.equal(existsSync(path.join(root, 'node_modules')), false);
});

test('standalone public compilation retains input and output verification', async (t) => {
  const { directory, root, api } = fixture(t);
  installCompiler(root);
  await prepareDocumentApi({ publicRoot: root });
  const receipt = path.join(api, '.cache/compiled-receipt.json');
  const sealed = readFileSync(receipt, 'utf8');
  const output = path.join(api, 'dist/index.js');
  const compiled = readFileSync(output, 'utf8');
  await prepareDocumentApi({ publicRoot: root });
  assert.equal(readFileSync(receipt, 'utf8'), sealed);
  writeFileSync(output, 'unverified output');
  await prepareDocumentApi({ publicRoot: root });
  assert.equal(readFileSync(output, 'utf8'), compiled);
  writeFileSync(path.join(api, 'src/index.ts'), 'export const value: number = 43;\n');
  await prepareDocumentApi({ publicRoot: root });
  assert.match(readFileSync(output, 'utf8'), /export const value = 43;/u);
  assert.notEqual(JSON.parse(readFileSync(receipt, 'utf8')).key, JSON.parse(sealed).key);
  await assert.rejects(prepareDocumentApi({ publicRoot: root, compilerRoot: path.join(directory, 'missing-owner') }),
    /Cannot find module 'typescript\/package.json'/u);
});
