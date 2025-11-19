import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import process from 'node:process';

const require = createRequire(import.meta.url);

const rollupPackageJsonPath = (() => {
  try {
    return require.resolve('rollup/package.json', { paths: [process.cwd()] });
  } catch {
    return null;
  }
})();

if (!rollupPackageJsonPath) {
  console.log('Rollup is not installed; skipping native binary install.');
  process.exit(0);
}

const rollupVersion = JSON.parse(readFileSync(rollupPackageJsonPath, 'utf8')).version;

const isMusl = () => {
  try {
    return !process.report?.getReport().header.glibcVersionRuntime;
  } catch {
    return false;
  }
};

const bindings = {
  android: {
    arm: { base: 'android-arm-eabi' },
    arm64: { base: 'android-arm64' }
  },
  darwin: {
    arm64: { base: 'darwin-arm64' },
    x64: { base: 'darwin-x64' }
  },
  freebsd: {
    arm64: { base: 'freebsd-arm64' },
    x64: { base: 'freebsd-x64' }
  },
  linux: {
    arm: { base: 'linux-arm-gnueabihf', musl: 'linux-arm-musleabihf' },
    arm64: { base: 'linux-arm64-gnu', musl: 'linux-arm64-musl' },
    loong64: { base: 'linux-loong64-gnu' },
    ppc64: { base: 'linux-ppc64-gnu' },
    riscv64: { base: 'linux-riscv64-gnu', musl: 'linux-riscv64-musl' },
    s390x: { base: 'linux-s390x-gnu' },
    x64: { base: 'linux-x64-gnu', musl: 'linux-x64-musl' }
  },
  openharmony: {
    arm64: { base: 'openharmony-arm64' }
  },
  win32: {
    arm64: { base: 'win32-arm64-msvc' },
    ia32: { base: 'win32-ia32-msvc' },
    x64: { base: 'win32-x64-gnu', msvc: 'win32-x64-msvc' }
  }
}[process.platform];

const binding = bindings?.[process.arch];

if (!binding) {
  console.log(`No Rollup native binary mapping for ${process.platform}/${process.arch}; skipping.`);
  process.exit(0);
}

const target = (() => {
  if (process.platform === 'linux') {
    return isMusl() && binding.musl ? binding.musl : binding.base;
  }
  if (process.platform === 'win32' && binding.msvc) {
    return binding.msvc;
  }
  return binding.base;
})();

const packageName = `@rollup/rollup-${target}`;
const packageJsonPath = join(dirname(rollupPackageJsonPath), '..', '@rollup', `rollup-${target}`, 'package.json');

if (existsSync(packageJsonPath)) {
  console.log(`Rollup native binary already present (${packageName}).`);
  process.exit(0);
}

console.log(`Installing Rollup native binary ${packageName}@${rollupVersion}...`);
execSync(`npm install --no-save --no-package-lock ${packageName}@${rollupVersion}`, {
  stdio: 'inherit'
});
