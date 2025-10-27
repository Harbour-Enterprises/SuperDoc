#!/usr/bin/env node
/*
 * Runs Vitest coverage across the whole monorepo via Vitest workspace.
 * Usage: npm run test:cov -- [alias|path/glob or flags]
 *
 * Notes:
 * - Aggregates coverage for super-editor, superdoc, and measurement-engine.
 * - Accepts any Vitest CLI flags and test path globs relative to repo root.
 */
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const repoRoot = process.cwd();

const vitestBin = path.resolve(
  repoRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'vitest.cmd' : 'vitest'
);

// Pass through any user-provided arguments unchanged aside from known aliases
let userArgs = process.argv.slice(2);

const TARGET_ALIASES = {
  'measurement-engine': {
    extraArgs: [
      '--config',
      path.resolve(repoRoot, 'packages', 'measurement-engine', 'engine', 'vitest.config.mjs'),
      '--root',
      path.resolve(repoRoot, 'packages', 'measurement-engine', 'engine'),
    ],
    coverageDir: 'coverage/measurement-engine',
  },
};

const aliasNames = new Set(Object.keys(TARGET_ALIASES));

let targetAlias = null;
if (userArgs.length > 0) {
  const firstArg = userArgs[0];
  if (!firstArg.startsWith('-') && aliasNames.has(firstArg)) {
    targetAlias = firstArg;
    userArgs = userArgs.slice(1);
  }
}

// Default coverage opts suitable for the whole monorepo
const coverageExcludePatterns = [
  '**/dist/**',
  '**/examples/**',
  '**/*.d.ts',
  '**/*.test.*',
  '**/*.spec.*',
  '**/vite.config.*',
  '**/index.js',
  '**/types.js',
  '**/main.js',
  '**/migration_after_0_4_14.js',
];

const coverageDir = targetAlias ? TARGET_ALIASES[targetAlias].coverageDir : 'coverage';

const coverageArgs = [
  '--coverage',
  '--coverage.provider=v8',
  '--coverage.reporter=text',
  '--coverage.reporter=lcov',
  '--coverage.reporter=html',
  '--coverage.reporter=json-summary',
  `--coverage.reportsDirectory=${coverageDir}`,
  ...coverageExcludePatterns.map((pattern) => `--coverage.exclude=${pattern}`),
];

const vitestArgs = ['run', ...coverageArgs];

if (targetAlias) {
  const { extraArgs = [] } = TARGET_ALIASES[targetAlias];
  vitestArgs.push(...extraArgs);
}

vitestArgs.push(...userArgs);

const child = spawn(vitestBin, vitestArgs, {
  stdio: 'inherit',
  env: process.env,
});

child.on('close', (code) => {
  try {
    if (code === 0) {
      const summaryPath = path.join(repoRoot, coverageDir, 'coverage-summary.json');
      if (fs.existsSync(summaryPath)) {
        const raw = fs.readFileSync(summaryPath, 'utf8');
        const data = JSON.parse(raw);

        const normalize = (p) => p.replaceAll('\\\\', '/');

        const packages = [
          {
            name: 'super-editor',
            label: 'super-editor package',
            absPrefix: normalize(path.join(repoRoot, 'packages', 'super-editor')) + '/',
            relSegment: '/packages/super-editor/',
            relPrefix: 'packages/super-editor/',
          },
          {
            name: 'superdoc',
            label: 'superdoc package',
            absPrefix: normalize(path.join(repoRoot, 'packages', 'superdoc')) + '/',
            relSegment: '/packages/superdoc/',
            relPrefix: 'packages/superdoc/',
          },
          {
            name: 'measurement-engine',
            label: 'measurement-engine package',
            absPrefix: normalize(path.join(repoRoot, 'packages', 'measurement-engine', 'engine')) + '/',
            relSegment: '/packages/measurement-engine/engine/',
            relPrefix: 'packages/measurement-engine/engine/',
          },
        ];

        const packagesToReport = targetAlias
          ? packages.filter((pkg) => pkg.name === targetAlias)
          : packages;

        function getTotals(obj) {
          const s = obj.statements || { total: 0, covered: 0 };
          const f = obj.functions || { total: 0, covered: 0 };
          const l = obj.lines || { total: 0, covered: 0 };
          return {
            statements: { total: s.total || 0, covered: s.covered || 0 },
            functions: { total: f.total || 0, covered: f.covered || 0 },
            lines: { total: l.total || 0, covered: l.covered || 0 },
          };
        }

        function pct(covered, total) {
          if (!total || total === 0) return 0;
          return (covered / total) * 100;
        }

        function aggForPackage({ absPrefix, relSegment, relPrefix }) {
          const preAbs = normalize(absPrefix);
          const seg = normalize(relSegment);
          const preRel = normalize(relPrefix);
          let sTot = 0;
          let sCov = 0;
          let fTot = 0;
          let fCov = 0;
          let lTot = 0;
          let lCov = 0;
          for (const [file, obj] of Object.entries(data)) {
            if (file === 'total') continue;
            const fp = normalize(file);
            const isMatch =
              fp.startsWith(preAbs) || fp.includes(seg) || fp.startsWith(preRel);
            if (!isMatch) continue;
            const t = getTotals(obj);
            sTot += t.statements.total;
            sCov += t.statements.covered;
            fTot += t.functions.total;
            fCov += t.functions.covered;
            lTot += t.lines.total;
            lCov += t.lines.covered;
          }
          return {
            statements: pct(sCov, sTot),
            functions: pct(fCov, fTot),
            lines: pct(lCov, lTot),
          };
        }

        const globalTotals = (() => {
          const t = getTotals(data.total || {});
          return {
            statements: pct(t.statements.covered, t.statements.total),
            functions: pct(t.functions.covered, t.functions.total),
            lines: pct(t.lines.covered, t.lines.total),
          };
        })();

        const fmt = (n) => `${n.toFixed(1)} %`;

        if (!targetAlias) {
          console.log('\nGlobal repo test coverage:');
          console.log(`📄 Statements: ${fmt(globalTotals.statements)}`);
          console.log(`🔧 Functions: ${fmt(globalTotals.functions)}`);
          console.log(`📏 Lines: ${fmt(globalTotals.lines)}`);
        }

        for (const pkg of packagesToReport) {
          const stats = aggForPackage(pkg);
          console.log(`\n${pkg.label}:`);
          console.log(`▌📄 Statements: ${fmt(stats.statements)}`);
          console.log(`▌🔧 Functions: ${fmt(stats.functions)}`);
          console.log(`▌📏 Lines: ${fmt(stats.lines)}`);
        }
      }
    }
  } catch {}
  process.exit(code);
});
