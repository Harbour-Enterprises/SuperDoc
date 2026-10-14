import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const execFileAsync = promisify(execFile);

async function readRepoFile(relativePath) {
  return readFile(path.join(REPO_ROOT, relativePath), 'utf8');
}

test('canvas system dependency installer guards apt commands with timeout and diagnostics', async () => {
  const content = await readRepoFile('scripts/install-canvas-system-dependencies.sh');

  assert.ok(content.includes("dpkg-query --show --showformat='${db:Status-Status}'"));
  assert.ok(content.includes('Canvas system dependencies are already installed.'));
  assert.ok(content.includes('APT_COMMAND_TIMEOUT:-10m'));
  assert.ok(content.includes('timeout "${apt_timeout}" sudo apt-get'));
  assert.ok(content.includes('Acquire::Retries=3'));
  assert.ok(content.includes('Dpkg::Use-Pty=0'));
  assert.ok(content.includes('timed out after ${apt_timeout}'));
  assert.ok(content.includes('fuser -v /var/lib/dpkg/lock'));
});

for (const scenario of [
  {
    name: 'prefers canonical Blacksmith mirrors without Azure',
    mirrorName: 'blacksmith-ubuntu-mirrors.txt',
    azure: false,
  },
  { name: 'uses HTTPS fallbacks for Blacksmith Azure mirrors', mirrorName: 'blacksmith-ubuntu-mirrors.txt' },
  { name: 'uses HTTPS fallbacks for legacy Azure mirrors', mirrorName: 'apt-mirrors.txt' },
]) {
  test(`canvas dependency installer ${scenario.name}`, async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'canvas-apt-'));
    t.after(() => rm(root, { recursive: true, force: true }));

    const bin = path.join(root, 'bin');
    const mirrorFile = path.join(root, scenario.mirrorName);
    const sourceFile = path.join(root, 'ubuntu.sources');
    const aptLog = path.join(root, 'apt.log');
    await mkdir(bin);
    const originalMirrors = [
      ...(scenario.azure === false ? [] : ['http://azure.archive.ubuntu.com/ubuntu/\tpriority:1']),
      'http://mirrors.edge.kernel.org/ubuntu/\tpriority:2',
      'http://archive.ubuntu.com/ubuntu/\tpriority:3',
      '',
    ].join('\n');
    await writeFile(mirrorFile, originalMirrors);
    await writeFile(sourceFile, `Types: deb\nURIs: mirror+file:${mirrorFile}\nSuites: noble\nComponents: main\n`);
    await writeFile(path.join(bin, 'dpkg-query'), '#!/usr/bin/env bash\nexit 1\n');
    await writeFile(path.join(bin, 'sudo'), '#!/usr/bin/env bash\nexec "$@"\n');
    await writeFile(path.join(bin, 'timeout'), '#!/usr/bin/env bash\nshift\nexec "$@"\n');
    await writeFile(path.join(bin, 'apt-get'), '#!/usr/bin/env bash\nprintf "%s\\n" "$*" >> "$APT_TEST_LOG"\n');
    await Promise.all(['dpkg-query', 'sudo', 'timeout', 'apt-get'].map((name) => chmod(path.join(bin, name), 0o755)));

    const installer = path.join(REPO_ROOT, 'scripts/install-canvas-system-dependencies.sh');
    const env = {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      APT_MIRROR_FILE: '',
      APT_UBUNTU_SOURCES_FILE: sourceFile,
      APT_TEST_LOG: aptLog,
      GITHUB_ACTIONS: 'true',
    };

    await execFileAsync('bash', [installer, '--prepare-mirrors'], { env });
    await assert.rejects(() => access(aptLog), { code: 'ENOENT' });
    await writeFile(mirrorFile, originalMirrors);
    await execFileAsync('bash', [installer], { env });

    const mirrors = await readFile(mirrorFile, 'utf8');
    assert.equal(mirrors.includes('azure.archive.ubuntu.com'), false);
    assert.doesNotMatch(mirrors, /http:\/\//);
    assert.match(mirrors, /https:\/\/mirrors\.edge\.kernel\.org/);
    assert.match(mirrors, /https:\/\/archive\.ubuntu\.com/);

    const aptCommands = await readFile(aptLog, 'utf8');
    assert.match(aptCommands, /update/);
    assert.match(aptCommands, /install .*build-essential/);
    for (const invocation of aptCommands.trim().split('\n')) {
      assert.match(invocation, /Acquire::http::Timeout=30/);
      assert.match(invocation, /Acquire::https::Timeout=30/);
    }
  });
}

for (const scenario of [
  { name: 'uses only configured Ubuntu sources on GitHub runners', github: 'true', sources: true, scoped: true },
  { name: 'preserves source selection outside GitHub Actions', github: 'false', sources: true, scoped: false },
  {
    name: 'preserves source selection when Ubuntu sources are unavailable',
    github: 'true',
    sources: false,
    scoped: false,
  },
]) {
  test(`canvas dependency installer ${scenario.name}`, async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'canvas-sources-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const bin = path.join(root, 'bin');
    const sourceFile = path.join(root, 'ubuntu.sources');
    const aptLog = path.join(root, 'apt.log');
    const source =
      'Types: deb\nURIs: https://archive.ubuntu.com/ubuntu/\nSuites: noble\nComponents: main universe\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n';
    await mkdir(bin);
    if (scenario.sources) await writeFile(sourceFile, source);
    const commands = {
      'dpkg-query': 'exit 1',
      sudo: 'exec "$@"',
      timeout: 'shift; exec "$@"',
      'apt-get': 'printf "%s\\n" "$*" >> "$APT_TEST_LOG"',
    };
    await Promise.all(
      Object.entries(commands).map(async ([name, command]) => {
        const file = path.join(bin, name);
        await writeFile(file, `#!/usr/bin/env bash\n${command}\n`);
        await chmod(file, 0o755);
      }),
    );

    await execFileAsync('bash', [path.join(REPO_ROOT, 'scripts/install-canvas-system-dependencies.sh')], {
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        GITHUB_ACTIONS: scenario.github,
        APT_MIRROR_FILE: path.join(root, 'no-mirrors'),
        APT_UBUNTU_SOURCES_FILE: sourceFile,
        APT_TEST_LOG: aptLog,
      },
    });

    const invocations = (await readFile(aptLog, 'utf8')).trim().split('\n');
    assert.equal(invocations.length, 2, 'update and install both execute');
    for (const invocation of invocations) {
      assert.equal(invocation.includes(`Dir::Etc::sourcelist=${sourceFile}`), scenario.scoped);
      assert.equal(invocation.includes('Dir::Etc::sourceparts=-'), scenario.scoped);
      assert.doesNotMatch(invocation, /AllowUnauthenticated|AllowInsecure|Trusted=yes/i);
    }
    assert.match(invocations[0], /update$/);
    assert.match(invocations[1], /install .*libcairo2-dev/);
    if (scenario.sources) assert.equal(await readFile(sourceFile, 'utf8'), source);
  });
}

async function runMirrorSelection(t, { mirrors, unavailable = [], stalled = [], github = 'true', prepare = false }) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'canvas-mirror-selection-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const bin = path.join(root, 'bin');
  const mirrorFile = path.join(root, 'mirrors.txt');
  const sourceFile = path.join(root, 'ubuntu.sources');
  const aptLog = path.join(root, 'apt.jsonl');
  const timeoutLog = path.join(root, 'timeout.log');
  await mkdir(bin);
  await writeFile(mirrorFile, mirrors);
  await writeFile(
    sourceFile,
    `Types: deb\nURIs: mirror+file:${mirrorFile}\nSuites: noble noble-updates\nComponents: main universe\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n`,
  );
  const selector = path.join(root, 'apt-model.mjs');
  await writeFile(
    selector,
    `
    import { readFileSync, appendFileSync } from 'node:fs';
    const args = process.argv.slice(2);
    const command = args.includes('update') ? 'update' : 'install';
    const candidates = readFileSync(process.env.APT_TEST_MIRRORS, 'utf8')
      .split('\\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const [uri, ...metadata] = line.split(/\\s+/);
        const priority = metadata.find((item) => item.startsWith('priority:'));
        return { uri, priority: priority ? Number(priority.slice(9)) : Infinity };
      }).sort((a, b) => a.priority - b.priority);
    const unavailable = JSON.parse(process.env.APT_TEST_UNAVAILABLE);
    const stalled = JSON.parse(process.env.APT_TEST_STALLED);
    for (const { uri } of candidates) {
      appendFileSync(process.env.APT_TEST_LOG, JSON.stringify({ command, uri, args }) + '\\n');
      if (unavailable.some((host) => uri.includes(host))) continue;
      // A responding mirror never reaches fallback before the command budget expires.
      if (stalled.some((host) => uri.includes(host))) process.exit(124);
      process.exit(0);
    }
    process.exit(100);
  `,
  );
  const commands = {
    'dpkg-query': 'exit 1',
    sudo: 'exec "$@"',
    timeout: 'printf "%s\\n" "$1" >> "$APT_TEST_TIMEOUT_LOG"; shift; exec "$@"',
    'apt-get': 'exec "$APT_TEST_NODE" "$APT_TEST_SELECTOR" "$@"',
    date: 'exit 0',
    ps: 'exit 0',
    fuser: 'exit 0',
    df: 'exit 0',
  };
  await Promise.all(
    Object.entries(commands).map(async ([name, command]) => {
      const file = path.join(bin, name);
      await writeFile(file, `#!/usr/bin/env bash\n${command}\n`);
      await chmod(file, 0o755);
    }),
  );
  let result;
  try {
    result = await execFileAsync(
      'bash',
      [
        path.join(REPO_ROOT, 'scripts/install-canvas-system-dependencies.sh'),
        ...(prepare ? ['--prepare-mirrors'] : []),
      ],
      {
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          GITHUB_ACTIONS: github,
          APT_MIRROR_FILE: '',
          APT_UBUNTU_SOURCES_FILE: sourceFile,
          APT_COMMAND_TIMEOUT: '10m',
          APT_TEST_NODE: process.execPath,
          APT_TEST_SELECTOR: selector,
          APT_TEST_MIRRORS: mirrorFile,
          APT_TEST_LOG: aptLog,
          APT_TEST_TIMEOUT_LOG: timeoutLog,
          APT_TEST_UNAVAILABLE: JSON.stringify(unavailable),
          APT_TEST_STALLED: JSON.stringify(stalled),
        },
      },
    );
    result.code = 0;
  } catch (error) {
    result = error;
  }
  return {
    ...result,
    mirrors: await readFile(mirrorFile, 'utf8'),
    sources: await readFile(sourceFile, 'utf8'),
    invocations: await readFile(aptLog, 'utf8').catch(() => ''),
    budgets: await readFile(timeoutLog, 'utf8').catch(() => ''),
  };
}

for (const azure of [true, false]) {
  test(`canvas dependency installer avoids a responding slow kernel mirror${azure ? ' after Azure bypass' : ' without Azure'}`, async (t) => {
    const result = await runMirrorSelection(t, {
      mirrors: [
        ...(azure ? ['http://azure.archive.ubuntu.com/ubuntu/\tpriority:1'] : []),
        'http://mirrors.edge.kernel.org/ubuntu/\tpriority:2',
        'http://archive.ubuntu.com/ubuntu/\tpriority:3',
        '',
      ].join('\n'),
      stalled: ['mirrors.edge.kernel.org'],
    });
    assert.equal(result.code, 0, result.stdout);
    const calls = result.invocations.trim().split('\n').map(JSON.parse);
    assert.deepEqual(
      calls.map(({ command }) => command),
      ['update', 'install'],
    );
    assert.ok(calls.every(({ uri }) => uri === 'https://archive.ubuntu.com/ubuntu/'));
    assert.equal(result.budgets, '10m\n10m\n');
    assert.ok(calls[1].args.includes('libcairo2-dev'));
    assert.match(result.mirrors, /https:\/\/mirrors\.edge\.kernel\.org\/ubuntu\//);
  });
}

test('canvas dependency installer retains kernel fallback when the canonical archive fails', async (t) => {
  const result = await runMirrorSelection(t, {
    mirrors: 'http://mirrors.edge.kernel.org/ubuntu/\tpriority:1\nhttp://archive.ubuntu.com/ubuntu/\tpriority:3\n',
    unavailable: ['archive.ubuntu.com'],
  });
  assert.equal(result.code, 0, result.stdout);
  const calls = result.invocations.trim().split('\n').map(JSON.parse);
  assert.deepEqual(
    calls.map(({ uri }) => uri),
    [
      'https://archive.ubuntu.com/ubuntu/',
      'https://mirrors.edge.kernel.org/ubuntu/',
      'https://archive.ubuntu.com/ubuntu/',
      'https://mirrors.edge.kernel.org/ubuntu/',
    ],
  );
});

test('canvas dependency installer preserves the command budget when every mirror responds too slowly', async (t) => {
  const result = await runMirrorSelection(t, {
    mirrors: 'http://mirrors.edge.kernel.org/ubuntu/\tpriority:2\nhttp://archive.ubuntu.com/ubuntu/\tpriority:3\n',
    stalled: ['archive.ubuntu.com', 'mirrors.edge.kernel.org'],
  });
  assert.equal(result.code, 124);
  assert.match(result.stdout, /apt-get update timed out after 10m/);
  assert.equal(result.budgets, '10m\n');
  assert.deepEqual(
    result.invocations
      .trim()
      .split('\n')
      .map(JSON.parse)
      .map(({ command }) => command),
    ['update'],
  );
});

test('canvas dependency mirror preparation preserves independent entries and selection restrictions', async (t) => {
  const independent = '# keep this mirror annotation\nhttps://mirror.example.test/ubuntu/\tpriority:7 arch:arm64\n';
  const mirrors =
    independent +
    'http://mirrors.edge.kernel.org/ubuntu/\tpriority:0 arch:amd64 type:deb\n' +
    'http://archive.ubuntu.com/ubuntu/\tpriority:3 arch:amd64 type:index\n' +
    'https://security.ubuntu.com/ubuntu/\tsuite:noble-security\n';
  const first = await runMirrorSelection(t, { mirrors, prepare: true });
  assert.equal(first.code, 0);
  assert.ok(first.mirrors.startsWith(independent));
  assert.match(first.mirrors, /https:\/\/mirrors\.edge\.kernel\.org\/ubuntu\/\tpriority:2 arch:amd64 type:deb/);
  assert.match(first.mirrors, /https:\/\/archive\.ubuntu\.com\/ubuntu\/\tpriority:1 arch:amd64 type:index/);
  assert.match(first.mirrors, /https:\/\/security\.ubuntu\.com\/ubuntu\/\tsuite:noble-security priority:1/);
  assert.equal(first.invocations, '');
  const second = await runMirrorSelection(t, { mirrors: first.mirrors, prepare: true });
  assert.equal(second.code, 0);
  assert.equal(second.mirrors, first.mirrors, 'preparation is idempotent');
  const outside = await runMirrorSelection(t, { mirrors, github: 'false', prepare: true });
  assert.equal(outside.mirrors, mirrors);
});
