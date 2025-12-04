/**
 * Handler Registry
 *
 * Combines all handlers into a single registry for the RPC router.
 */

import { systemHandlers } from './system.js';
import { editorHandlers } from './editor.js';
import { MethodNotFoundError } from '../utils/index.js';

export { systemHandlers, type SystemMethod } from './system.js';
export { editorHandlers, type EditorMethod } from './editor.js';

/**
 * All available RPC methods
 */
export const handlers = {
  // System
  ping: systemHandlers.ping,
  health: systemHandlers.health,
  getSessions: systemHandlers.getSessions,

  // Editor
  loadDocx: editorHandlers.loadDocx,
  getJSON: editorHandlers.getJSON,
  getHTML: editorHandlers.getHTML,
  getMarkdown: editorHandlers.getMarkdown,
  getMetadata: editorHandlers.getMetadata,
  insertContent: editorHandlers.insertContent,
  exportDocx: editorHandlers.exportDocx,
  close: editorHandlers.close,
  open: editorHandlers.open,
  getLifecycle: editorHandlers.getLifecycle,
  destroy: editorHandlers.destroy,
} as const;

export type Method = keyof typeof handlers;

/**
 * Check if a method exists
 */
export function hasMethod(method: string): method is Method {
  return method in handlers;
}

/**
 * Get a handler by method name
 */
export function getHandler(method: string): (params: unknown) => Promise<unknown> {
  if (!hasMethod(method)) {
    throw new MethodNotFoundError(method);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return handlers[method] as any;
}

/**
 * List all available methods
 */
export function listMethods(): string[] {
  return Object.keys(handlers);
}
