// packages/super-editor/src/core/helpers/importHtml.js

import { DOMParser } from 'prosemirror-model';
import { stripHtmlStyles } from './htmlSanitizer.js';

/**
 * Create a document from HTML content
 * @param {string} content - HTML content
 * @param {Object} schema - ProseMirror schema
 * @param {boolean} [stripStyles=true] - Whether to strip inline styles
 * @returns {Object} Document node
 */
export function createDocFromHTML(content, schema, stripStyles = true) {
  let parsedContent;

  if (typeof content === 'string') {
    // Strip styles if requested (default behavior)
    const cleanHtml = stripStyles ? stripHtmlStyles(content) : content;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanHtml;
    parsedContent = tempDiv;
  } else {
    parsedContent = content;
  }

  return DOMParser.fromSchema(schema).parse(parsedContent);
}
