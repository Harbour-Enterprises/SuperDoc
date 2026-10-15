import { createSuperDocClient } from '../../../packages/sdk/langs/node/dist/index.js';

const client = createSuperDocClient({ runtime: 'v2' });
const document = await client.open({
  collaboration: { providerType: 'y-websocket', url: 'wss://collaboration.example', params: { room: 'quick' } },
});
await document.lists.create({
  mode: 'empty',
  at: { kind: 'block', nodeType: 'paragraph', nodeId: 'body' },
  preset: 'decimal',
});
// @ts-expect-error Runtime values come from the supported host contract.
createSuperDocClient({ runtime: 'v1' });
await client.open({
  // @ts-expect-error Collaboration query parameter values must be strings.
  collaboration: { providerType: 'y-websocket', url: 'wss://collaboration.example', params: { room: 42 } },
});
await document.lists.create({
  mode: 'empty',
  at: { kind: 'block', nodeType: 'paragraph', nodeId: 'body' },
  // @ts-expect-error Scalar parameter schemas retain the preset enumeration.
  preset: 'invalid',
});

const xml = await document.selection.extractOoxml({});
xml.fragment.namespaces satisfies Record<string, string>;
