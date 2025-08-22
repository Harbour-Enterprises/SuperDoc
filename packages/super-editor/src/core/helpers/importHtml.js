import { DOMParser } from 'prosemirror-model';

/**
 * Create a document from HTML content
 * @private
 * @param {string} content - HTML content
 * @returns {Object} Document node
 */
export function createDocFromHTML(content, schema) {
  let parsedContent = content;
  if (typeof content === 'string') {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    parsedContent = tempDiv;
    tempDiv.remove();
  }

  return DOMParser.fromSchema(schema).parse(parsedContent);
}
