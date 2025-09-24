#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const run = (command, cwd) => {
  execSync(command, { stdio: 'inherit', cwd });
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const superdocDir = path.join(rootDir, 'packages', 'superdoc');

const publishScopedPackage = () => {
  run('npm publish --access public', superdocDir);
};

const publishUnscopedPackage = () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'superdoc-publish-'));
  try {
    const packageJsonPath = path.join(superdocDir, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    if (packageJson.name !== '@harbour-enterprises/superdoc') {
      throw new Error('Unexpected package name for packages/superdoc');
    }

    const unscopedPackageJson = {
      ...packageJson,
      name: 'superdoc',
      publishConfig: {
        ...(packageJson.publishConfig || {}),
        access: 'public'
      },
      readme: 'README.md'
    };

    writeFileSync(path.join(tempDir, 'package.json'), `${JSON.stringify(unscopedPackageJson, null, 2)}\n`);

    const distSource = path.join(superdocDir, 'dist');
    if (!existsSync(distSource)) {
      throw new Error('Missing dist build for superdoc');
    }

    cpSync(distSource, path.join(tempDir, 'dist'), { recursive: true });

    const readmeSource = path.join(superdocDir, 'README.md');
    if (existsSync(readmeSource)) {
      cpSync(readmeSource, path.join(tempDir, 'README.md'));
    }

    run('npm publish --access public', tempDir);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
};

const main = () => {
  try {
    console.log('Building packages...');
    run('npm run build', rootDir);

    console.log('Publishing @harbour-enterprises/superdoc...');
    publishScopedPackage();

    console.log('Publishing superdoc...');
    publishUnscopedPackage();
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
};

main();
