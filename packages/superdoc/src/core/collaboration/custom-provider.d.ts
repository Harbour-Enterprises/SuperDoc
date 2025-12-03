import type { Doc as YDoc } from 'yjs';

/**
 * Custom provider interface - implement this to use your own collaboration provider.
 *
 * Required provider methods/events used by SuperDoc:
 * - provider.on('synced', callback) - called when initial sync completes
 * - provider.off('synced', callback) - unsubscribe from synced event
 * - provider.disconnect() - called on SuperDoc destroy
 * - provider.destroy() - called on SuperDoc destroy
 * - provider.awareness.setLocalStateField('user', user) - set local user
 * - provider.awareness.on('update', callback) - awareness changes
 * - provider.awareness.getStates() - get all awareness states
 *
 * @example
 * ```typescript
 * import { createYjsProvider } from '@y-sweet/client';
 *
 * // Create your provider externally
 * const ydoc = new Y.Doc();
 * const provider = await createYjsProvider(ydoc, docId, '/api/auth');
 *
 * new SuperDoc({
 *   modules: {
 *     collaboration: {
 *       customProvider: { provider, ydoc },
 *     }
 *   }
 * });
 * ```
 */
export interface CustomProvider {
  provider: {
    /** Subscribe to events - SuperDoc uses 'synced' event */
    on(event: string, callback: (...args: unknown[]) => void): void;
    /** Unsubscribe from events */
    off(event: string, callback: (...args: unknown[]) => void): void;
    /** Disconnect from server - called on SuperDoc.destroy() */
    disconnect(): void;
    /** Cleanup resources - called on SuperDoc.destroy() */
    destroy(): void;
    awareness: {
      /** Set local user state */
      setLocalStateField(field: string, value: unknown): void;
      /** Get all connected users' states */
      getStates(): Map<number, Record<string, unknown>>;
      /** Subscribe to awareness updates */
      on(event: string, callback: (...args: unknown[]) => void): void;
    };
  };
  ydoc: YDoc;
}
