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
  /** Optional document schema (if includeSchema was true) */
  schema?: any;
}

/**
 * Options for getDocumentContext
 */
export interface DocumentContextOptions {
  /** Maximum tokens before switching to selection-only mode (default: 5000) */
  maxTokens?: number;
  /** Whether to include the document schema (default: false) */
  includeSchema?: boolean;
}

/**
 * Get document context optimized for token efficiency.
 *
 * - Small documents: returns full document content
 * - Large documents: returns only selection, with guidance to use tools
 *
 * @example
 * ```typescript
 * // Basic usage
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
 *
 * // With schema for better understanding
 * const contextWithSchema = await getDocumentContext(editor, { 
 *   maxTokens: 5000, 
 *   includeSchema: true 
 * });
 * systemPrompt += `\n\nDocument Schema:\n${JSON.stringify(contextWithSchema.schema)}`;
 * ```
 */
export async function getDocumentContext(
  editor: Editor,
  options?: DocumentContextOptions
): Promise<DocumentContextResult> {
  const maxTokens = options?.maxTokens ?? 5000;
  const includeSchema = options?.includeSchema ?? false;
  const charsPerToken = 4; // rough estimate

  const { state } = editor;
  if (!state) {
    return {
      strategy: 'full',
      content: null,
    };
  }

  // Get schema if requested
  let schema = undefined;
  if (includeSchema && typeof editor.getSchemaSummaryJSON === 'function') {
    try {
      schema = await editor.getSchemaSummaryJSON();
    } catch (error) {
      console.warn('[ai-builder] Failed to get schema summary:', error);
    }
  }

  const docSize = state.doc.content.size;
  const estimatedTokens = Math.ceil(docSize / charsPerToken);

  // Small document: return full content
  if (estimatedTokens <= maxTokens) {
    return {
      strategy: 'full',
      content: state.doc.toJSON(),
      schema,
    };
  }

  // Large document: return selection only
  const { from, to } = state.selection;
  const selectedContent = state.doc.cut(from, to);

  return {
    strategy: 'selection',
    content: selectedContent.toJSON(),
    message: 'Document is large. Use searchContent to find text positions and readContent to read specific sections.',
    schema,
  };
}
