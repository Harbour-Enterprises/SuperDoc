import { spawn } from 'node:child_process';

const projects = [
  'packages/super-editor/tsconfig.migrated.json',
  'packages/superdoc/tsconfig.json',
  'packages/ai/tsconfig.json',
  'packages/collaboration-yjs/tsconfig.json',
  'shared/common/tsconfig.json',
];

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
    child.on('error', reject);
  });
}

async function main() {
  for (const project of projects) {
    console.log(`\n[type-check] tsc --noEmit -p ${project}`);
    await run('npx', ['tsc', '--noEmit', '-p', project]);
  }
}

main().catch((error) => {
  console.error('\nType checking failed.');
  console.error(error.message || error);
  process.exit(1);
});
