//@ts-check
import { DOMParser } from 'prosemirror-model';
import { createDocFromHTML } from './importHtml.js';
import { createDocFromMarkdown } from './importMarkdown.js';
import { ListHelpers } from './list-numbering-helpers.js';

/**
 * Unified content processor that handles all content types
 * @param {Object} params
 * @param {string} params.content - The content to process
 * @param {string} params.type - Content type: 'html', 'markdown', 'text', 'schema'
 * @param {Object} params.schema - ProseMirror schema
 * @returns {Object} Processed ProseMirror document
 */
export function processContent({ content, type, schema }) {
  let doc;

  switch (type) {
    case 'html':
      doc = createDocFromHTML(content, schema, { isImport: true });
      break;

    case 'markdown':
      doc = createDocFromMarkdown(content, schema, { isImport: true });
      break;

    case 'text':
      const wrapper = document.createElement('div');
      wrapper.dataset.superdocImport = 'true';
      const para = document.createElement('p');
      para.textContent = content;
      wrapper.appendChild(para);
      doc = DOMParser.fromSchema(schema).parse(wrapper);
      break;

    case 'schema':
      doc = schema.nodeFromJSON(content);
      break;

    default:
      throw new Error(`Unknown content type: ${type}`);
  }

  return doc;
}
