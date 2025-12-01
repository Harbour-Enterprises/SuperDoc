// Paragraph context cache keyed by paragraph node reference to avoid repeated recomputation.
// Stored per plugin instance; revision is used to invalidate cached contexts when content/attrs change.
//
// CACHE INVALIDATION STRATEGY:
// The revision number comes from the tab plugin state and increments on every document change.
// ProseMirror's immutability guarantees ensure cache correctness:
// - When a paragraph's content or attributes change, ProseMirror creates a new Node instance
// - The WeakMap key (old Node reference) becomes stale and unreachable
// - New Node instances will miss the cache and trigger recomputation
// - The revision check provides an additional invalidation layer for cases where the same
//   Node reference might be reused across plugin state updates
//
// This dual-key approach (Node reference + revision) ensures we never serve stale cached data
// while maximizing cache hits for unchanged paragraphs.

import type { Node as PmNode } from 'prosemirror-model';

type ParagraphContextEntry<T> = { revision: number; context: T };

let cache: WeakMap<PmNode, ParagraphContextEntry<unknown>> = new WeakMap();

/**
 * Get a cached paragraph context or compute and store it.
 * Returns cached context if the paragraph node and revision match, otherwise computes fresh.
 *
 * @param paragraph - The paragraph node (immutable)
 * @param startPos - Starting position of the paragraph in the document
 * @param helpers - Editor helpers for context extraction
 * @param revision - Current plugin state revision number (invalidates on doc changes)
 * @param compute - Function to compute context if cache misses
 * @returns The paragraph context (cached or freshly computed)
 */
export function getParagraphContext<T>(
  paragraph: PmNode,
  startPos: number,
  helpers: unknown,
  revision: number,
  compute: (paragraph: PmNode, startPos: number, helpers: unknown) => T,
): T {
  const cached = cache.get(paragraph) as ParagraphContextEntry<T> | undefined;
  if (cached && cached.revision === revision) {
    return cached.context;
  }
  const context = compute(paragraph, startPos, helpers);
  cache.set(paragraph, { revision, context });
  return context;
}

/**
 * Clears the cached context for a specific paragraph node.
 *
 * @param paragraph - The paragraph node to remove from cache
 */
export function clearParagraphContext(paragraph: PmNode): void {
  cache.delete(paragraph);
}

/**
 * Clears all cached paragraph contexts by replacing the cache with a fresh WeakMap.
 *
 */
export function clearAllParagraphContexts(): void {
  // WeakMap doesn't support clear(), so replace with a fresh map
  cache = new WeakMap();
}
