#!/usr/bin/env node
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const commandsDir = path.join(repoRoot, 'packages/super-editor/src/core/commands');

async function loadCoreExports() {
  const indexCandidates = ['index.ts', 'index.js'];
  let indexPath = null;
  for (const candidate of indexCandidates) {
    const maybePath = path.join(commandsDir, candidate);
    try {
      await readFile(maybePath, 'utf8');
      indexPath = maybePath;
      break;
    } catch {
      // keep searching
    }
  }

  if (!indexPath) {
    throw new Error(`No command index file found in ${commandsDir}`);
  }

  const content = await readFile(indexPath, 'utf8');
  const matches = [...content.matchAll(/export \* from '\.\/([a-zA-Z0-9_-]+)\.js';/g)];
  return matches.map(([, name]) => name);
}

async function loadMappedCommands() {
  const mapPath = path.join(commandsDir, 'core-command-map.d.ts');
  const content = await readFile(mapPath, 'utf8');
  const usesDerivedCommandNames = /keyof typeof CoreCommandExports/.test(content);

  if (usesDerivedCommandNames) {
    return { mode: 'derived' };
  }

  const matches = [...content.matchAll(/\|\s'([a-zA-Z0-9_]+)'/g)];
  return { mode: 'manual', mapped: new Set(matches.map(([, name]) => name)) };
}

async function main() {
  try {
    const exportsList = await loadCoreExports();
    const mappedResult = await loadMappedCommands();

    if (mappedResult.mode === 'derived') {
      console.log('[validate-command-types] core command map derived from index exports ✔');
      return;
    }

    const missing = exportsList.filter((name) => !mappedResult.mapped.has(name));

    if (missing.length) {
      console.warn('[validate-command-types] missing type entries:', missing.join(', '));
    } else {
      console.log('[validate-command-types] all core commands mapped ✔');
    }
  } catch (error) {
    console.error('[validate-command-types] failed:', error);
    process.exitCode = 1;
  }
}

main();
