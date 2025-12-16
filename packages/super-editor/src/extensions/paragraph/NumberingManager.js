import { createNumberingManager } from '@superdoc/word-layout';

/**
 * Thin adapter that reuses the shared numbering manager implementation.
 * Provides a minimal compatibility alias for `_clearCache`.
 */
export function NumberingManager() {
  const manager = createNumberingManager();
  return {
    ...manager,
    _clearCache: manager.clearAllState,
  };
}
