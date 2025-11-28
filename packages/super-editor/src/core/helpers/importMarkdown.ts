import { marked } from 'marked';
import { createDocFromHTML } from './importHtml.js';
import type { Node as PmNode } from 'prosemirror-model';
import type { Editor } from '../Editor.js';

// Configure marked once
marked.use({
  breaks: false, // Use proper paragraphs, not <br> tags
  gfm: true, // GitHub Flavored Markdown support
});

/**
 * Create a ProseMirror document from Markdown content
 * @param markdown - Markdown content
 * @param editor - Editor instance
 * @param options - Import options
 * @returns Document node
 */
export function createDocFromMarkdown(markdown: string, editor: Editor, options: { isImport?: boolean } = {}): PmNode {
  const html = convertMarkdownToHTML(markdown);
  return createDocFromHTML(html, editor, options);
}

/**
 * Convert Markdown to HTML with SuperDoc/DOCX compatibility
 * @param markdown - Markdown content
 * @returns HTML content
 */
export function convertMarkdownToHTML(markdown: string): string {
  const html = marked.parse(markdown, { async: false }) as string;

  // Add spacing between paragraphs and lists for proper DOCX rendering
  return html
    .replace(/<\/p>\n<ul>/g, '</p>\n<p>&nbsp;</p>\n<ul>')
    .replace(/<\/p>\n<ol>/g, '</p>\n<p>&nbsp;</p>\n<ol>')
    .replace(/<\/ul>\n<h/g, '</ul>\n<p>&nbsp;</p>\n<h')
    .replace(/<\/ol>\n<h/g, '</ol>\n<p>&nbsp;</p>\n<h');
}
