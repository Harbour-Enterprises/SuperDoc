/**
 * Editor Handlers
 *
 * Handlers for document editor operations.
 */

import { getSDKManager } from '../services/index.js';
import { ValidationError } from '../utils/index.js';

// =============================================================================
// Types
// =============================================================================

export interface LoadDocxParams {
  docx: string; // base64 encoded
}

export interface SessionParams {
  sessionId: string;
}

export interface InsertContentParams extends SessionParams {
  content: string | Record<string, unknown>;
}

export interface OpenDocParams extends SessionParams {
  docx: string; // base64 encoded
}

// =============================================================================
// Handlers
// =============================================================================

/**
 * Load a DOCX document and create a new editor session
 */
export async function loadDocx(params: LoadDocxParams): Promise<{ sessionId: string }> {
  if (!params.docx) {
    throw new ValidationError('docx parameter is required', 'docx');
  }

  const buffer = Buffer.from(params.docx, 'base64');
  if (buffer.length === 0) {
    throw new ValidationError('Invalid base64 data', 'docx');
  }

  const manager = getSDKManager();
  const sessionId = await manager.createSession(buffer);

  return { sessionId };
}

/**
 * Get document as ProseMirror JSON
 */
export async function getJSON(params: SessionParams): Promise<Record<string, unknown>> {
  validateSessionId(params.sessionId);

  const manager = getSDKManager();
  const editor = manager.getEditor(params.sessionId);

  return await editor.getJSON();
}

/**
 * Get document as HTML
 */
export async function getHTML(params: SessionParams): Promise<string> {
  validateSessionId(params.sessionId);

  const manager = getSDKManager();
  const editor = manager.getEditor(params.sessionId);

  return await editor.getHTML();
}

/**
 * Get document as Markdown
 */
export async function getMarkdown(params: SessionParams): Promise<string> {
  validateSessionId(params.sessionId);

  const manager = getSDKManager();
  const editor = manager.getEditor(params.sessionId);

  return await editor.getMarkdown();
}

/**
 * Get document metadata
 */
export async function getMetadata(params: SessionParams): Promise<Record<string, unknown>> {
  validateSessionId(params.sessionId);

  const manager = getSDKManager();
  const editor = manager.getEditor(params.sessionId);

  return await editor.getMetadata();
}

/**
 * Insert content into document
 */
export async function insertContent(params: InsertContentParams): Promise<{ success: boolean }> {
  validateSessionId(params.sessionId);

  if (params.content === undefined || params.content === null) {
    throw new ValidationError('content parameter is required', 'content');
  }

  const manager = getSDKManager();
  const editor = manager.getEditor(params.sessionId);

  await editor.insertContent(params.content);

  return { success: true };
}

/**
 * Export document as DOCX (base64)
 */
export async function exportDocx(params: SessionParams): Promise<{ docx: string }> {
  validateSessionId(params.sessionId);

  const manager = getSDKManager();
  const editor = manager.getEditor(params.sessionId);

  const buffer = await editor.exportDocx();

  return { docx: buffer.toString('base64') };
}

/**
 * Close document (editor returns to idle state)
 */
export async function close(params: SessionParams): Promise<{ success: boolean }> {
  validateSessionId(params.sessionId);

  const manager = getSDKManager();
  const editor = manager.getEditor(params.sessionId);

  await editor.close();

  return { success: true };
}

/**
 * Open a new document in existing editor
 */
export async function open(params: OpenDocParams): Promise<{ success: boolean }> {
  validateSessionId(params.sessionId);

  if (!params.docx) {
    throw new ValidationError('docx parameter is required', 'docx');
  }

  const buffer = Buffer.from(params.docx, 'base64');
  if (buffer.length === 0) {
    throw new ValidationError('Invalid base64 data', 'docx');
  }

  const manager = getSDKManager();
  const editor = manager.getEditor(params.sessionId);

  await editor.open(buffer);

  return { success: true };
}

/**
 * Get editor lifecycle state
 */
export async function getLifecycle(params: SessionParams): Promise<{ lifecycle: string }> {
  validateSessionId(params.sessionId);

  const manager = getSDKManager();
  const editor = manager.getEditor(params.sessionId);

  const lifecycle = await editor.getLifecycle();

  return { lifecycle };
}

/**
 * Destroy editor session
 */
export async function destroy(params: SessionParams): Promise<{ success: boolean }> {
  // Don't validate - destroying non-existent session is OK
  if (params.sessionId) {
    const manager = getSDKManager();
    await manager.destroySession(params.sessionId);
  }

  return { success: true };
}

// =============================================================================
// Helpers
// =============================================================================

function validateSessionId(sessionId: unknown): asserts sessionId is string {
  if (!sessionId || typeof sessionId !== 'string') {
    throw new ValidationError('sessionId parameter is required', 'sessionId');
  }
}

// =============================================================================
// Handler Map
// =============================================================================

/**
 * Editor handler map for RPC-style access
 */
export const editorHandlers = {
  loadDocx,
  getJSON,
  getHTML,
  getMarkdown,
  getMetadata,
  insertContent,
  exportDocx,
  close,
  open,
  getLifecycle,
  destroy,
} as const;

export type EditorMethod = keyof typeof editorHandlers;
