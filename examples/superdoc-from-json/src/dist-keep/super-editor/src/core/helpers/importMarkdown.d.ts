/**
 * Create a ProseMirror document from Markdown content
 * @param {string} markdown - Markdown content
 * @param {Object} schema - ProseMirror schema
 * @returns {Object} Document node
 */
export function createDocFromMarkdown(markdown: string, schema: any): any;
/**
 * Convert Markdown to HTML with SuperDoc/DOCX compatibility
 * @param {string} markdown - Markdown content
 * @returns {string} HTML content
 */
export function convertMarkdownToHTML(markdown: string): string;
