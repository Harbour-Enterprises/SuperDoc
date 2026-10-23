import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { SuperDocClient } from '@superdoc/sdk';
import { saveTrackedComparison } from './tracked-workflow.ts';

const args = process.argv.slice(2);
const directStyles = args[3] === '--direct-styles';
if (args.length < 3 || args.length > 4 || (args.length === 4 && !directStyles)) {
  throw new Error('Usage: pnpm start:tracked <base.docx> <target.docx> <output.docx> [--direct-styles]');
}
const [basePath, targetPath, outPath] = args.map((value) => path.resolve(value));
await mkdir(path.dirname(outPath), { recursive: true });
if (directStyles) {
  console.log('Direct style adoption enabled: rejecting body revisions will keep the adopted styles.');
}

const client = new SuperDocClient({ user: { name: 'Comparison example' } });
try {
  const target = await client.open({ doc: targetPath });
  const targetSnapshot = await target.diff.capture({});
  await target.close({ discard: true });
  const base = await client.open({ doc: basePath });
  const receipt = await saveTrackedComparison(
    base,
    targetSnapshot,
    outPath,
    directStyles ? { styleChangeMode: 'direct' } : undefined,
  );
  console.log(JSON.stringify({
    output: outPath,
    appliedOperations: receipt.appliedOperations,
    operationReceipts: receipt.operationReceipts,
    styleChanges: receipt.styleChanges ?? null,
    diagnostics: receipt.diagnostics,
  }, null, 2));
  await base.close({ discard: true });
} finally {
  await client.dispose();
}
