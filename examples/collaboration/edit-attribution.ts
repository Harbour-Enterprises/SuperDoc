import type { Doc, Map as YMap, Transaction } from 'yjs';

export type AttributedStoryEdit = { shardId: string; actorType: 'human' | 'code' };

// Install after restoring authoritative room state, before accepting live edits.
export function observeAttributedEdits(
  document: Doc,
  onEdit: (edits: AttributedStoryEdit[], transaction: Transaction) => void,
): () => void {
  const content = document.getMap<YMap<unknown>>('content');
  const registered = new Map<string, YMap<unknown>>();
  const register = () => {
    registered.clear();
    for (const [shardId, shard] of content) {
      const meta = shard.get('meta') as YMap<unknown> | undefined;
      if (meta) registered.set(shardId, meta);
    }
  };
  register();
  content.observe(register);

  const afterTransaction = (transaction: Transaction) => {
    const edits: AttributedStoryEdit[] = [];
    const changedTypes: ReadonlyMap<unknown, ReadonlySet<string | null>> = transaction.changed;
    for (const [shardId, meta] of registered) {
      if (!changedTypes.get(meta)?.has('lastEditActorType')) continue;
      const actorType = meta.get('lastEditActorType');
      if (actorType === 'human' || actorType === 'code') edits.push({ shardId, actorType });
    }
    if (edits.length) onEdit(edits, transaction);
  };
  document.on('afterTransaction', afterTransaction);

  const stop = () => {
    content.unobserve(register);
    document.off('afterTransaction', afterTransaction);
    document.off('destroy', stop);
  };
  document.on('destroy', stop);
  return stop;
}
