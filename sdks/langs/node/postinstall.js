/**
 * Postinstall script
 * Downloads Chromium if not already present
 */

import { execSync } from 'child_process';
import { platform, arch, env } from 'process';

const SKIP_DOWNLOAD = env.SUPERDOC_BROWSER_DOWNLOAD === '0' || env.SUPERDOC_CHROMIUM_PATH;

console.log('SuperDoc SDK postinstall...');

if (SKIP_DOWNLOAD) {
  console.log('Skipping Chromium download (SUPERDOC_BROWSER_DOWNLOAD=0 or SUPERDOC_CHROMIUM_PATH is set)');
  process.exit(0);
}

try {
  console.log('Downloading Chromium via playwright-core...');
  console.log(`Platform: ${platform}, Arch: ${arch}`);

  // Use npx to run playwright install
  execSync('npx playwright-core install chromium', {
    stdio: 'inherit',
    env: process.env,
  });

  console.log('Chromium downloaded successfully');
  console.log('\nSuperDoc SDK is ready to use!');
  console.log('\nQuick start:');
  console.log('  import { init } from "@superdoc-dev/superdoc-sdk";');
  console.log('  const sdk = await init();');
  console.log('  const editor = await sdk.getEditor(docxBuffer);');
  console.log('  const json = await editor.getJSON();');
  console.log('  await sdk.close();');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Failed to download Chromium:', message);
  console.error('\nYou can:');
  console.error('1. Retry installation: npm install');
  console.error('2. Skip download and provide custom path: SUPERDOC_CHROMIUM_PATH=/path/to/chromium npm install');
  console.error('3. Skip download entirely: SUPERDOC_BROWSER_DOWNLOAD=0 npm install');
  process.exit(1);
}
