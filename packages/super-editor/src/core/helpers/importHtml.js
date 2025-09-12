//@ts-check
import { DOMParser } from 'prosemirror-model';
import { stripHtmlStyles } from './htmlSanitizer.js';

/**
 * Create a document from HTML content
 * @param {string} content - HTML content
 * @param {Object} schema - ProseMirror schema
 * @param {Object} [options={}] - Import options
 * @returns {Object} Document node
 */
export function createDocFromHTML(content, schema, options = {}) {
  const { isImport = false } = options;
  let parsedContent;

  if (typeof content === 'string') {
    // Strip styles
    const cleanHtml = stripHtmlStyles(content);

    const tempDiv = document.createElement('div');

    // Mark as import if needed
    if (isImport) {
      tempDiv.dataset.superdocImport = 'true';
    }

    tempDiv.innerHTML = cleanHtml;
    parsedContent = tempDiv;
  } else {
    parsedContent = content;
  }

  return DOMParser.fromSchema(schema).parse(parsedContent);
}
