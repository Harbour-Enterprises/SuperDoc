import { readFileSync } from 'node:fs';
import { availableParallelism, totalmem } from 'node:os';
import { spawn } from 'node:child_process';

function read(file) {
  try { return readFileSync(file, 'utf8').trim(); } catch { return ''; }
}

export function parseCpuList(value) {
  if (!value) return [];
  return value.split(',').flatMap((part) => {
    const [first, last = first] = part.split('-').map(Number);
    if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first < 0 || last < first) {
      throw new Error(`Invalid CPU list: ${value}`);
    }
    return Array.from({ length: last - first + 1 }, (_, index) => first + index);
  });
}

export function resolveBuildResources({ cpuMax = read('/sys/fs/cgroup/cpu.max'),
  memoryMax = read('/sys/fs/cgroup/memory.max'),
  status = read('/proc/self/status'), cpus = availableParallelism(), memory = totalmem(),
  jobs = 'auto', sequential = process.env.SUPERDOC_V2_SEQUENTIAL_SURFACES === '1',
} = {}) {
  const allowed = parseCpuList(status.match(/^Cpus_allowed_list:\s*(.+)$/m)?.[1] ?? '');
  const [quota, period] = cpuMax.split(/\s+/).map(Number);
  const cpuCount = Math.max(1, Math.min(cpus, allowed.length || cpus,
    quota > 0 && period > 0 ? Math.floor(quota / period) : cpus));
  const bytes = Number(memoryMax);
  const memoryBytes = Number.isFinite(bytes) && bytes > 0 ? Math.min(bytes, memory) : memory;
  const maximumJobs = Math.max(1, Math.min(cpuCount, Math.floor(memoryBytes / (4 * 1024 ** 3))));
  const requested = jobs === 'auto' ? Math.min(2, maximumJobs) : Number(jobs);
  if (!Number.isSafeInteger(requested) || requested < 1 || requested > 16) {
    throw new Error('--jobs must be auto or an integer from 1 to 16');
  }
  return { cpuCount, memoryBytes, cpuList: allowed.slice(0, cpuCount),
    jobs: sequential ? 1 : Math.min(requested, maximumJobs) };
}

export function runBuildCommand(command, args, { cwd, env = process.env, resources = resolveBuildResources() } = {}) {
  const affinity = process.platform === 'linux' && resources.cpuList.length > 0;
  const executable = affinity ? 'taskset' : command;
  const argv = affinity ? ['-c', resources.cpuList.join(','), command, ...args] : args;
  console.log(`  > ${executable} ${argv.join(' ')}`);
  return new Promise((resolve, reject) => {
    const child = spawn(executable, argv, { cwd, env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('close', (code, signal) => code === 0 ? resolve() :
      reject(new Error(`${command} ${args.join(' ')} failed (${code ?? signal})`)));
  });
}
