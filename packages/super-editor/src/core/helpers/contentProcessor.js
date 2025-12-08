//@ts-check
import { DOMParser } from 'prosemirror-model';
import { createDocFromHTML } from './importHtml.js';
import { createDocFromMarkdown } from './importMarkdown.js';
import { wrapTextsInRuns } from '../inputRules/docx-paste/docx-paste.js';

/**
 * Unified content processor that handles all content types
 * @param {Object} params
 * @param {string} params.content - The content to process
 * @param {string} params.type - Content type: 'html', 'markdown', 'text', 'schema'
 * @param {Object} params.editor - The editor instance
 * @returns {Object} Processed ProseMirror document
 */
export function processContent({ content, type, editor }) {
  let doc;

  switch (type) {
    case 'html':
      doc = createDocFromHTML(content, editor, { isImport: true });
      break;

    case 'markdown':
      doc = createDocFromMarkdown(content, editor, { isImport: true });
      break;

    case 'text':
      const wrapper = document.createElement('div');
      wrapper.dataset.superdocImport = 'true';
      const para = document.createElement('p');
      para.textContent = content;
      wrapper.appendChild(para);
      doc = DOMParser.fromSchema(editor.schema).parse(wrapper);
      doc = wrapTextsInRuns(doc);
      break;

    case 'schema':
      doc = editor.schema.nodeFromJSON(content);
      doc = wrapTextsInRuns(doc);
      break;

    default:
      throw new Error(`Unknown content type: ${type}`);
  }

  return doc;
}
