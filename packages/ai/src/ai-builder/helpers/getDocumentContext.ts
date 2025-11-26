import type { Editor } from '../../types';

/**
 * Result from getDocumentContext
 */
export interface DocumentContextResult {
  /** Strategy used: 'full' for small docs, 'selection' for large docs */
  strategy: 'full' | 'selection';
  /** The document content (full or selection only) */
  content: unknown;
  /** Guidance message for large documents */
  message?: string;
}

/**
 * Options for getDocumentContext
 */
export interface DocumentContextOptions {
  /** Maximum tokens before switching to selection-only mode (default: 5000) */
  maxTokens?: number;
}

/**
 * Get document context optimized for token efficiency.
 *
 * - Small documents: returns full document content
 * - Large documents: returns only selection, with guidance to use tools
 *
 * @example
 * ```typescript
 * const context = getDocumentContext(editor, { maxTokens: 5000 });
 *
 * if (context.strategy === 'full') {
 *   // Send full document to LLM
 *   systemPrompt += `\n\nDocument:\n${JSON.stringify(context.content)}`;
 * } else {
 *   // Send selection + guidance
 *   systemPrompt += `\n\nSelected content:\n${JSON.stringify(context.content)}`;
 *   systemPrompt += `\n\n${context.message}`;
 * }
 * ```
 */
export function getDocumentContext(editor: Editor, options?: DocumentContextOptions): DocumentContextResult {
  const maxTokens = options?.maxTokens ?? 5000;
  const charsPerToken = 4; // rough estimate

  const { state } = editor;
  if (!state) {
    return {
      strategy: 'full',
      content: null,
    };
  }

  const docSize = state.doc.content.size;
  const estimatedTokens = Math.ceil(docSize / charsPerToken);

  // Small document: return full content
  if (estimatedTokens <= maxTokens) {
    return {
      strategy: 'full',
      content: state.doc.toJSON(),
    };
  }

  // Large document: return selection only
  const { from, to } = state.selection;
  const selectedContent = state.doc.cut(from, to);

  return {
    strategy: 'selection',
    content: selectedContent.toJSON(),
    message: 'Document is large. Use searchContent to find text positions and readContent to read specific sections.',
  };
}
