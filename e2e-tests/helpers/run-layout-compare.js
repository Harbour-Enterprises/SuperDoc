import { spawnSync } from 'child_process';
import path from 'path';

const args = process.argv.slice(2);
const fileArg = args.find((arg) => !arg.startsWith('-'));
const playwrightArgs = args.filter((arg) => arg !== fileArg);

const env = {
  ...process.env,
  LAYOUT_COMPARE: '1',
  ...(fileArg ? { VISUAL_FILE: path.normalize(fileArg) } : {}),
};

const result = spawnSync('npx', ['playwright', 'test', 'tests/visuals/layout-compare.spec.js', ...playwrightArgs], {
  stdio: 'inherit',
  env,
});

if (result.error) {
  if (result.error.code === 'ENOENT') {
    console.error('Error: npx command not found. Please ensure Node.js and npm are installed.');
    process.exit(1);
  }
  console.error('Error executing npx:', result.error.message);
  process.exit(1);
}

if (result.signal) {
  console.error(`Process terminated by signal: ${result.signal}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
