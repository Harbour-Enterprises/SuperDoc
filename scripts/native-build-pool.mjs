import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

export async function mapNativeBuilds(targets, build, jobs = 1) {
  assert.ok(Number.isInteger(jobs) && jobs >= 1 && jobs <= 2,
    'Native build concurrency must be one or two');
  const results = new Array(targets.length);
  let next = 0;
  let failed = false;
  let failure;
  await Promise.all(Array.from({ length: Math.min(jobs, targets.length) }, async () => {
    while (!failed && next < targets.length) {
      const index = next++;
      try { results[index] = await build(targets[index]); }
      catch (error) { if (!failed) { failed = true; failure = error; } }
    }
  }));
  if (failed) throw failure;
  return results;
}

export function runNativeCompiler(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('close', (code, signal) => code === 0 ? resolve() :
      reject(new Error(`${command} failed: ${signal ?? code}`)));
  });
}
