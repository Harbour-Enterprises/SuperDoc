import { DOMParser } from 'prosemirror-model';
import { createDocFromHTML } from './importHtml.js';
import { createDocFromMarkdown } from './importMarkdown.js';
import { wrapTextsInRuns } from '../inputRules/docx-paste/docx-paste.js';
import type { Editor } from '../Editor.js';
import type { Node as PmNode, Schema } from 'prosemirror-model';

type ContentType = 'html' | 'markdown' | 'text' | 'schema';

type ProcessContentParams = { content: unknown; type: ContentType; editor: Editor };

/**
 * Unified content processor that handles all content types
 */
export function processContent({ content, type, editor }: ProcessContentParams): PmNode | null {
  let doc: PmNode | null = null;

  switch (type) {
    case 'html':
      doc = createDocFromHTML(content as string | HTMLElement, editor, { isImport: true });
      break;

    case 'markdown':
      doc = createDocFromMarkdown(content as string, editor, { isImport: true });
      break;

    case 'text':
      const wrapper = document.createElement('div');
      wrapper.dataset.superdocImport = 'true';
      const para = document.createElement('p');
      para.textContent = content != null ? String(content) : '';
      wrapper.appendChild(para);
      doc = DOMParser.fromSchema(editor.schema).parse(wrapper);
      doc = wrapTextsInRuns(doc);
      break;

    case 'schema':
      doc = editor.schema.nodeFromJSON(content as Parameters<Schema['nodeFromJSON']>[0]);
      doc = wrapTextsInRuns(doc);
      break;

    default:
      throw new Error(`Unknown content type: ${type}`);
  }

  return doc;
}
