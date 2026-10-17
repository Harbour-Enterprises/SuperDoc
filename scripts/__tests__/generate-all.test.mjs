import assert from 'node:assert/strict';
import test from 'node:test';
import { runGenerationPhases } from '../generate-all.mjs';

test('independent phases start together and failure waits for all writers', async () => {
  const started = [];
  const release = [];
  const result = runGenerationPhases((label) => {
    started.push(label);
    return new Promise((resolve, reject) => release.push(label.startsWith('SDK') ? () => reject(new Error('contract drift')) : resolve));
  });
  assert.equal(started.length, 3);
  let finished = false;
  const observed = result.catch((error) => { finished = true; throw error; });
  release[1]();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(finished, false);
  release[0](); release[2]();
  await assert.rejects(observed, /contract drift/);
});
