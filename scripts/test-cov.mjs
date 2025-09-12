#!/usr/bin/env node
/*
 * Runs Vitest coverage for super-editor, allowing repo-root paths.
 * Usage: npm run test:cov -- [path/glob or flags]
 */
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const repoRoot = process.cwd();
const superEditorRoot = path.resolve(repoRoot, 'packages/super-editor');

// Normalize backslashes to forward slashes for globs/posix joins
function normalizePath(p) {
  return p.replaceAll('\\', '/');
}

// Normalize path args to be relative to super-editor root when applicable
function normalizeArg(arg) {
  if (!arg || arg.startsWith('-')) return arg; // flags

  // If the arg explicitly includes the super-editor workspace path, strip it
  const marker = `packages${path.sep}super-editor${path.sep}`;
  const idx = arg.indexOf(marker);
  if (idx !== -1) {
    return arg.slice(idx + marker.length);
  }

  // Try to resolve to an absolute path and see if it's inside super-editor
  try {
    const abs = path.isAbsolute(arg) ? arg : path.resolve(repoRoot, arg);
    const absReal = fs.existsSync(abs) ? fs.realpathSync(abs) : abs;
    if (absReal.startsWith(superEditorRoot + path.sep)) {
      return path.relative(superEditorRoot, absReal) || '.';
    }
  } catch (_) {
    // fall through and return as-is
  }

  return arg; // leave globs/other paths as-is
}

const rawArgs = process.argv.slice(2);
const userArgs = rawArgs.map(normalizeArg);

// Detects if the user has provided a coverage include argument.
// Matches any of the following forms:
// - --coverage.include=foo,bar
// - --coverage= ... (user supplies a full coverage config, so don't inject includes)
// - --coverage.<anything-with-include>= ... (e.g., --coverage.reporter.include=...)
function isCoverageIncludeArg(arg) {
  return (
    arg.startsWith('--coverage.include=') ||
    arg.startsWith('--coverage=') ||
    (arg.startsWith('--coverage.') && arg.includes('include') && arg.includes('='))
  );
}

// Derive coverage include globs from path-like args unless user already set one
const hasUserCoverageInclude = rawArgs.some(isCoverageIncludeArg);
const pathLike = userArgs.filter((a) => a && !a.startsWith('-'));
let coverageIncludeArg = [];
if (!hasUserCoverageInclude && pathLike.length > 0) {
  const patterns = [];
  for (const p of pathLike) {
    const abs = path.resolve(superEditorRoot, p);
    if (fs.existsSync(abs)) {
      try {
        const stat = fs.statSync(abs);
        if (stat.isDirectory()) {
          patterns.push(path.posix.join(normalizePath(p), '**', '*'));
        } else {
          patterns.push(normalizePath(p));
        }
      } catch (_) {
        patterns.push(normalizePath(p));
      }
    } else {
      // treat as glob relative to root
      patterns.push(normalizePath(p));
    }
  }
  if (patterns.length) {
    coverageIncludeArg = [
      `--coverage.include=${patterns.join(',')}`,
      // Provide some sane defaults to avoid noisy reports
      `--coverage.exclude=dist/**,**/*.d.ts,**/*.test.*,**/*.spec.*,vite.config.*`
    ];
  }
}

const vitestBin = path.resolve(
  repoRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'vitest.cmd' : 'vitest'
);

const vitestArgs = [
  'run',
  '--coverage',
  '--root',
  path.relative(repoRoot, superEditorRoot),
  ...coverageIncludeArg,
  ...userArgs,
];

const child = spawn(vitestBin, vitestArgs, {
  stdio: 'inherit',
  env: process.env,
});

child.on('close', (code) => {
  process.exit(code);
});
