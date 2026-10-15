import type { SuperDocDocument } from '../../../packages/sdk/langs/node/dist/index.js';

declare const document: SuperDocDocument;
const target = { kind: 'block', nodeType: 'paragraph', nodeId: 'paragraph-1' } as const;
const retained = await document.selection.extractOoxml({
  at: {
    kind: 'selection',
    start: { kind: 'nodeEdge', node: target, edge: 'before' },
    end: { kind: 'nodeEdge', node: target, edge: 'after' },
  },
  retain: true,
});
retained.snapshotId satisfies string | undefined;
const receipt: Awaited<ReturnType<SuperDocDocument['replace']>> = await document.replace({
  target,
  snapshotId: retained.snapshotId!,
  replaceMode: 'contents',
  expectedSnapshotId: 'current-paragraph-snapshot',
  changeMode: 'direct',
});
receipt.success satisfies boolean;
(await document.selection.releaseSnapshot({ snapshotId: retained.snapshotId! })).released satisfies boolean;

// @ts-expect-error Native mutation fields belong to SDK params, not transport options.
await document.replace({ target, snapshotId: 'original' }, { replaceMode: 'contents' });
// @ts-expect-error The replacement mode is a string, not a numeric transport flag.
await document.replace({ target, text: 'Changed', replaceMode: 17 });
