import { DOMParser, Node as PmNode } from 'prosemirror-model';
import { stripHtmlStyles } from './htmlSanitizer.js';
import { htmlHandler } from '../InputRule.js';
import type { Editor } from '../Editor.js';

/**
 * Create a document from HTML content
 * @param content - HTML content
 * @param editor - Editor instance
 * @param options - Import options
 * @returns Document node
 */
export function createDocFromHTML(
  content: string | HTMLElement,
  editor: Editor,
  options: { isImport?: boolean } = {},
): PmNode {
  const { isImport = false } = options;
  let parsedContent: HTMLElement | DocumentFragment;

  if (typeof content === 'string') {
    // Strip styles
    const fragment = htmlHandler(stripHtmlStyles(content), editor);

    // Mark as import if needed
    if (isImport && fragment.firstElementChild) {
      (fragment.firstElementChild as HTMLElement).dataset.superdocImport = 'true';
    }

    parsedContent = fragment;
  } else {
    parsedContent = content;
  }

  return DOMParser.fromSchema(editor.schema).parse(parsedContent);
}
