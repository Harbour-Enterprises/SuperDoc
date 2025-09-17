/**
 * Generate text based on a prompt with streaming
 * @param {string} prompt - User prompt
 * @param {Object} options - Additional options
 * @param {string} options.context - System prompt to guide generation
 * @param {string} options.documentXml - Document XML for context
 * @param {string} options.url - URL of a document to analyze
 * @param {Object} options.config - API configuration
 * @param {function} onChunk - Callback for each text chunk
 * @returns {Promise<string>} - The complete generated text
 */
export function writeStreaming(prompt: string, options: {
    context: string;
    documentXml: string;
    url: string;
    config: any;
}, onChunk: Function, onDone: any): Promise<string>;
/**
 * Generate text based on a prompt (non-streaming)
 * @param {string} prompt - User prompt
 * @param {Object} options - Additional options
 * @param {string} options.context - System prompt to guide generation
 * @param {string} options.documentXml - Document XML for context
 * @param {string} options.url - URL of a document to analyze
 * @param {Object} options.config - API configuration
 * @returns {Promise<string>} - The generated text
 */
export function write(prompt: string, options?: {
    context: string;
    documentXml: string;
    url: string;
    config: any;
}): Promise<string>;
/**
 * Rewrite text based on a prompt with streaming
 * @param {string} text - Text to rewrite
 * @param {string} prompt - User instructions for rewriting
 * @param {Object} options - Additional options
 * @param {string} options.documentXml - Document XML for context
 * @param {string} options.url - URL of a document to analyze
 * @param {Object} options.config - API configuration
 * @param {function} onChunk - Callback for each text chunk
 * @returns {Promise<string>} - The complete rewritten text
 */
export function rewriteStreaming(text: string, prompt: string, options: {
    documentXml: string;
    url: string;
    config: any;
}, onChunk: Function, onDone: any): Promise<string>;
/**
 * Rewrite text based on a prompt (non-streaming)
 * @param {string} text - Text to rewrite
 * @param {string} prompt - User instructions for rewriting
 * @param {Object} options - Additional options
 * @param {string} options.documentXml - Document XML for context
 * @param {string} options.url - URL of a document to analyze
 * @param {Object} options.config - API configuration
 * @returns {Promise<string>} - The rewritten text
 */
export function rewrite(text: string, prompt?: string, options?: {
    documentXml: string;
    url: string;
    config: any;
}): Promise<string>;
/**
 * Converts markdown-style formatting in the document text to ProseMirror's native formatting.
 * Uses a node-aware approach that safely handles formatting across node boundaries.
 *
 * This function processes the entire document content and applies formatting rules defined in formatRegistry.
 * It handles cases where formatting markers (like **bold**) span across multiple text nodes by tracking
 * node positions and boundaries. The function works from the end of the document to the start to avoid
 * position shifts when making replacements.
 *
 * @param {Object} editor - The ProseMirror editor instance containing the document state and view
 */
export function formatDocument(editor: any): void;
//# sourceMappingURL=ai-helpers.d.ts.map