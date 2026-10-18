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

for (const mode of ['environment', 'argument', 'full-generation']) {
  test(`generation DAG forwards the Rust selection in ${mode} mode`, async (t) => {
    const previousArgs = process.argv;
    const previousSkip = process.env.SUPERDOC_SDK_SKIP_RUST;
    t.after(() => {
      process.argv = previousArgs;
      if (previousSkip === undefined) delete process.env.SUPERDOC_SDK_SKIP_RUST;
      else process.env.SUPERDOC_SDK_SKIP_RUST = previousSkip;
    });
    process.argv = ['node', 'generate-all.mjs', '--prepare-ci', ...(mode === 'argument' ? ['--skip-rust-sdk'] : [])];
    if (mode === 'environment') process.env.SUPERDOC_SDK_SKIP_RUST = '1';
    else delete process.env.SUPERDOC_SDK_SKIP_RUST;
    const invocations = [];
    await runGenerationPhases(async (label, command, args) => invocations.push({ label, command, args }));
    assert.equal(invocations.length, 3);
    const sdk = invocations.find(({ label }) => label.startsWith('SDK'));
    assert.equal(sdk.command, 'node');
    assert.ok(sdk.args[0].endsWith('/packages/sdk/scripts/sdk-generate.mjs'));
    assert.ok(sdk.args.includes('--prepare-ci'));
    assert.equal(sdk.args.includes('--skip-rust-sdk'), mode !== 'full-generation');
  });
}
