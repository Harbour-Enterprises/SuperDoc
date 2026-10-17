import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCpuList, resolveBuildResources } from '../build-resources.mjs';

test('resource budgets use cgroup quotas and memory rather than host totals', () => {
  const resources = resolveBuildResources({ cpuMax: '400000 100000', memoryMax: String(8 * 1024 ** 3),
    status: 'Cpus_allowed_list:\t8-55', cpus: 48, memory: 384 * 1024 ** 3, sequential: false });
  assert.deepEqual(resources.cpuList, [8, 9, 10, 11]);
  assert.equal(resources.cpuCount, 4);
  assert.equal(resources.jobs, 2);
  assert.equal(resources.memoryBytes, 8 * 1024 ** 3);
  assert.equal(resolveBuildResources({ cpuMax: '100000 100000', memoryMax: 'max', cpus: 48, jobs: '16' }).jobs, 1);
});

test('sequential override and small memory restrict concurrent build jobs', () => {
  assert.equal(resolveBuildResources({ sequential: true, jobs: '4' }).jobs, 1);
  assert.equal(resolveBuildResources({ memoryMax: String(6 * 1024 ** 3), sequential: false }).jobs, 1);
  assert.deepEqual(parseCpuList('1-3,8,10-11'), [1, 2, 3, 8, 10, 11]);
  assert.throws(() => parseCpuList('2-1'), /Invalid CPU/);
  assert.throws(() => resolveBuildResources({ jobs: '0' }), /--jobs/);
});
