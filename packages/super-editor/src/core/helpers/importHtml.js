//@ts-check
import { DOMParser } from 'prosemirror-model';
import { stripHtmlStyles } from './htmlSanitizer.js';

/**
 * Create a document from HTML content
 * @param {string} content - HTML content
 * @param {Object} schema - ProseMirror schema
 * @returns {Object} Document node
 */
export function createDocFromHTML(content, schema) {
  let parsedContent;

  if (typeof content === 'string') {
    // Strip styles
    const cleanHtml = stripHtmlStyles(content);

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanHtml;
    parsedContent = tempDiv;
  } else {
    parsedContent = content;
  }

  return DOMParser.fromSchema(schema).parse(parsedContent);
}
