import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { test } = process.env.VITEST ? await import('vitest') : require('node:test');

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const checkJsdoc = path.join(scriptRoot, 'check-jsdoc.cjs');
const HEAP_BELOW_WHOLE_PROJECT_CHECK_MB = 1792;

test('the JSDoc check passes under a heap too small for a whole-project type check', { timeout: 300_000 }, () => {
  const result = spawnSync(process.execPath, [`--max-old-space-size=${HEAP_BELOW_WHOLE_PROJECT_CHECK_MB}`, checkJsdoc], {
    cwd: path.resolve(scriptRoot, '..'),
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: `--max-old-space-size=${HEAP_BELOW_WHOLE_PROJECT_CHECK_MB}` },
  });
  const output = `${result.stdout}${result.stderr}`;

  assert.doesNotMatch(output, /heap out of memory|SIGABRT/u);
  assert.equal(result.signal, null, output);
  assert.equal(result.status, 0, output);
  assert.match(output, /CHECKED_FILES clean/u);
});

test('the JSDoc check does not spawn a separate TypeScript process', () => {
  const source = readFileSync(checkJsdoc, 'utf8');

  assert.doesNotMatch(source, /runTypeScript|spawnSync|child_process/u);
  assert.doesNotMatch(source, /node_modules['"], ['"]\.bin['"], ['"]tsc/u);
});
