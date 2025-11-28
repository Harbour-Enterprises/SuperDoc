import { createNodeFromContent } from '../helpers/createNodeFromContent.js';
import type { Command, CommandProps } from '../types/ChainedCommands.js';
import { selectionToInsertionEnd } from '../helpers/selectionToInsertionEnd.js';
import type { Node as ProseMirrorNode, Fragment as ProseMirrorFragment, ResolvedPos } from 'prosemirror-model';

export type JSONContent = Record<string, unknown> | Array<Record<string, unknown>>;
export type ContentValue =
  | string
  | Array<string | { text?: string }>
  | ProseMirrorNode
  | ProseMirrorFragment
  | JSONContent;
export type Position = ResolvedPos | number | { from: number; to: number };

export interface InsertContentOptions {
  parseOptions?: Record<string, unknown>;
  updateSelection?: boolean;
  applyInputRules?: boolean;
  applyPasteRules?: boolean;
  asText?: boolean;
  errorOnInvalidContent?: boolean;
}

/**
 * Checks if the given node or fragment is a ProseMirror Fragment.
 * @param {ProseMirrorNode|ProseMirrorFragment} nodeOrFragment
 * @returns {boolean}
 */
const isFragment = (nodeOrFragment: ProseMirrorNode | ProseMirrorFragment): boolean => {
  return !('type' in nodeOrFragment);
};

/**
 * Inserts content at the specified position.
 * - Bare strings with newlines → insertText (keeps literal \n)
 * - HTML-looking strings → parse and replaceWith
 * - Arrays of strings / {text} objects → insertText
 *
 * @param {import("prosemirror-model").ResolvedPos|number|{from:number,to:number}} position
 * @param {string|Array<string|{text?:string}>|ProseMirrorNode|ProseMirrorFragment} value
 * @param {Object} options
 * @returns {boolean}
 */
// prettier-ignore
export const insertContentAt =
  (position: Position, value: ContentValue, options?: InsertContentOptions): Command =>
  ({ tr, dispatch, editor }: CommandProps) => {
    if (!dispatch) return true;

    const isPmContent = typeof value === 'object' && value !== null && 'childCount' in value;

    options = {
      parseOptions: {},
      updateSelection: true,
      applyInputRules: false,
      applyPasteRules: false,
      // optional escape hatch to force literal text insertion
      asText: false,
      ...options,
    };

    let content: ProseMirrorNode | ProseMirrorFragment;

    try {
      content = isPmContent
        ? (value as ProseMirrorNode | ProseMirrorFragment)
        : createNodeFromContent(value as string | Record<string, unknown> | Array<Record<string, unknown>>, editor, {
            parseOptions: {
              preserveWhitespace: 'full',
              ...options.parseOptions,
            },
            errorOnInvalidContent: Boolean(
              options.errorOnInvalidContent ?? (editor.options as Record<string, unknown>).enableContentCheck,
            ),
          });
    } catch (e) {
      editor.emit(
        'contentError',
        {
          editor,
          error: e as Error,
        },
      );
      return false;
    }

    let from: number;
    let to: number;
    if (typeof position === 'number') {
      from = position;
      to = position;
    } else if ((position as { from?: number; to?: number }).from !== undefined) {
      from = (position as { from: number }).from;
      to = (position as { to: number }).to;
    } else {
      const resolved = position as ResolvedPos;
      from = resolved.pos;
      to = resolved.pos;
    }

    // Heuristic:
    // - Bare strings that LOOK like HTML: let parser handle (replaceWith)
    // - Bare strings with one or more newlines: force text insertion (insertText)
    const isBareString = typeof value === 'string';
    const looksLikeHTML = isBareString && /^\s*<[a-zA-Z][^>]*>.*<\/[a-zA-Z][^>]*>\s*$/s.test(value);
    const hasNewline = isBareString && /[\r\n]/.test(value);
    const forceTextInsert =
      !!options.asText ||
      (hasNewline && !looksLikeHTML) ||
      (Array.isArray(value) && value.every((v) => typeof v === 'string' || (v && typeof (v as { text?: string }).text === 'string'))) ||
      (!!value && typeof value === 'object' && 'text' in value && typeof value.text === 'string');

    // Inspect parsed nodes to decide text vs block replacement
    let isOnlyTextContent = true;
    let isOnlyBlockContent = true;
    const nodes = isFragment(content) ? Array.from({ length: content.childCount }, (_, i) => content.child(i)) : [content];

    nodes.forEach((node) => {
      // validate node
      if ('check' in node && typeof node.check === 'function') {
        node.check();
      }

      // only-plain-text if every node is an unmarked text node
      isOnlyTextContent = isOnlyTextContent ? ('isText' in node && node.isText && node.marks?.length === 0) : false;

      isOnlyBlockContent = isOnlyBlockContent ? ('isBlock' in node && Boolean(node.isBlock)) : false;
    });

    // Replace empty textblock wrapper when inserting blocks at a cursor
    // But NOT when we're forcing text insertion (e.g., bare strings with newlines)
    if (from === to && isOnlyBlockContent && !forceTextInsert) {
      const { parent } = tr.doc.resolve(from);
      const isEmptyTextBlock = parent.isTextblock && !parent.type.spec.code && !parent.childCount;

      if (isEmptyTextBlock) {
        from -= 1;
        to += 1;
      }
    }

    let newContent: ProseMirrorNode | ProseMirrorFragment | string;

    // Use insertText for pure text OR when explicitly/heuristically forced
    if (isOnlyTextContent || forceTextInsert) {
      if (Array.isArray(value)) {
        newContent = value.map((v) => (typeof v === 'string' ? v : (v && v.text) || '')).join('');
      } else if (typeof value === 'object' && !!value && 'text' in value && typeof value.text === 'string') {
        newContent = value.text;
      } else {
        newContent = typeof value === 'string' ? value : '';
      }

      tr.insertText(newContent, from, to);
    } else {
      newContent = content;
      tr.replaceWith(from, to, newContent);
    }

    // set cursor at end of inserted content
    if (options.updateSelection) {
      selectionToInsertionEnd(tr, tr.steps.length - 1, -1);
    }

    if (options.applyInputRules) {
      tr.setMeta('applyInputRules', { from, text: newContent });
    }

    if (options.applyPasteRules) {
      tr.setMeta('applyPasteRules', { from, text: newContent });
    }

    return true;
  };
