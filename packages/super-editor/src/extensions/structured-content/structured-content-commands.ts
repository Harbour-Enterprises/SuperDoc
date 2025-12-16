import { DOMParser as PMDOMParser } from 'prosemirror-model';
import { Extension } from '@core/index';
import { htmlHandler } from '@core/InputRule';
import { findParentNode } from '@helpers/findParentNode';
import { generateRandomSigned32BitIntStrId } from '@core/helpers/generateDocxRandomId.js';
import { getStructuredContentTagsById } from './structuredContentHelpers/getStructuredContentTagsById';
import { getStructuredContentByGroup } from './structuredContentHelpers/getStructuredContentByGroup';
import { createTagObject } from './structuredContentHelpers/tagUtils';
import * as structuredContentHelpers from './structuredContentHelpers/index';
import type { Command } from '@core/types/ChainedCommands.js';
import type { ProseMirrorJSON } from '@core/types/EditorTypes.js';
import type { Fragment, Node as PmNode } from 'prosemirror-model';
import type { StructuredContentMatch } from './structuredContentHelpers/types';

const STRUCTURED_CONTENT_NAMES = ['structuredContent', 'structuredContentBlock'];

type StructuredContentTag = string | Record<string, unknown> | null;

type StructuredContentAttrs = {
  id?: string;
  tag?: StructuredContentTag;
  alias?: string;
  sdtPr?: unknown;
  [key: string]: unknown;
};

type StructuredContentInsertAttrs = StructuredContentAttrs & {
  /** Group identifier for linking multiple fields (auto-encoded to JSON tag) */
  group?: string;
};

/**
 * Find the first text node within a structured content node, even when wrapped.
 * Some plugins wrap text in inline nodes (e.g., run), so we need to search descendants.
 */
const findFirstTextNode = (node: PmNode): PmNode | null => {
  let firstTextNode: PmNode | null = null;
  node.descendants((child: PmNode) => {
    if (child.isText) {
      firstTextNode = child;
      return false;
    }
    return true;
  });
  return firstTextNode;
};

/**
 * Options for inserting inline structured content
 */
interface StructuredContentInlineInsert {
  /** Text content to insert */
  text?: string;
  /** ProseMirror JSON */
  json?: ProseMirrorJSON;
  /** Node attributes */
  attrs?: StructuredContentInsertAttrs;
}

/**
 * Options for inserting block structured content
 */
interface StructuredContentBlockInsert {
  /** HTML content to insert */
  html?: string;
  /** ProseMirror JSON */
  json?: ProseMirrorJSON;
  /** Node attributes */
  attrs?: StructuredContentInsertAttrs;
}

/**
 * Options for updating structured content
 */
interface StructuredContentUpdate {
  /** Replace content with text (only for structured content inline) */
  text?: string;
  /** Replace content with HTML (only for structured content block) */
  html?: string;
  /** Replace content with ProseMirror JSON (overrides html) */
  json?: ProseMirrorJSON;
  /** Update attributes only (preserves content) */
  attrs?: StructuredContentAttrs;
  /** When true, preserves marks from the first text node (only applies with text option) */
  keepTextNodeStyles?: boolean;
}

/**
 * @typedef {Object} StructuredContentTableAppendRowsOptions
 * @property {string} id - Structured content block identifier
 * @property {number} [tableIndex=0] - Index of the table inside the block
 * @property {Array<string[]>|Array<string>} rows - Cell values to append
 * @property {boolean} [copyRowStyle=false] - Clone the last row's styling when true
 */
interface StructuredContentTableAppendRowsOptions {
  id: string;
  tableIndex?: number;
  rows?: Array<string[] | string>;
  copyRowStyle?: boolean;
}

type StructuredContentEntry = StructuredContentMatch;

export const StructuredContentCommands = Extension.create({
  name: 'structuredContentCommands',

  addCommands() {
    return {
      /**
       * Inserts a structured content inline at selection.
       * @category Command
       * @param {StructuredContentInlineInsert} options
       * @example
       * // With group for linking multiple fields
       * editor.commands.insertStructuredContentInline({
       *  attrs: {
       *   group: 'customer-info',
       *   alias: 'Customer Name',
       *  },
       *  text: 'John Doe',
       * });
       *
       * // No group
       * editor.commands.insertStructuredContentInline({
       *  attrs: {
       *   id: '123',
       *   alias: 'Customer Name',
       *  },
       *  text: 'John Doe',
       *  // or
       *  json: { type: 'text', text: 'John Doe' },
       * });
       */
      insertStructuredContentInline:
        (options: StructuredContentInlineInsert = {}): Command =>
        ({ editor, dispatch, state, tr }) => {
          const { schema } = editor;
          let { from, to } = state.selection;

          if (dispatch) {
            const selectionText = state.doc.textBetween(from, to);

            let content: PmNode | null = null;

            if (selectionText) {
              content = schema.text(selectionText);
            }

            if (options.text) {
              content = schema.text(options.text);
            }

            if (options.json) {
              content = schema.nodeFromJSON(options.json);
            }

            if (!content) {
              content = schema.text(' ');
            }

            // Handle group parameter: convert to JSON tag
            let tag: StructuredContentTag = options.attrs?.tag || 'inline_text_sdt';
            if (options.attrs?.group) {
              tag = createTagObject({ group: options.attrs.group });
            }

            const attrs: StructuredContentInsertAttrs = {
              id: options.attrs?.id || generateRandomSigned32BitIntStrId(),
              tag,
              alias: options.attrs?.alias || 'Structured content',
              ...options.attrs,
            };
            const { group: _group, ...attrsWithoutGroup } = attrs;
            const node = schema.nodes.structuredContent.create(attrsWithoutGroup, content, undefined);

            const parent = findParentNode((node: PmNode) => node.type.name === 'structuredContent')(state.selection);
            if (parent) {
              const insertPos = parent.pos + parent.node.nodeSize;
              from = to = insertPos;
            }

            tr.replaceWith(from, to, node);
          }

          return true;
        },

      /**
       * Inserts a structured content block at selection.
       * @category Command
       * @param {StructuredContentBlockInsert} options
       * @example
       * // With group for linking multiple fields
       * editor.commands.insertStructuredContentBlock({
       *  attrs: {
       *    group: 'terms-section',
       *    alias: 'Terms & Conditions',
       *  },
       *  html: '<p>Legal content...</p>',
       * });
       *
       * // No group
       * editor.commands.insertStructuredContentBlock({
       *  attrs: {
       *    id: '456',
       *    alias: 'Terms & Conditions',
       *  },
       *  json: { type: 'paragraph', content: [{ type: 'text', text: 'Legal content...' }] }
       * });
       */
      insertStructuredContentBlock:
        (options: StructuredContentBlockInsert = {}): Command =>
        ({ editor, dispatch, state, tr }) => {
          const { schema } = editor;
          let { from, to } = state.selection;

          if (dispatch) {
            const selectionContent = state.selection.content();

            let content: Fragment | PmNode | null = null;

            if (selectionContent.size) {
              content = selectionContent.content;
            }

            if (options.html) {
              const html = htmlHandler(options.html, editor);
              const doc = PMDOMParser.fromSchema(schema).parse(html);
              content = doc.content;
            }

            if (options.json) {
              content = schema.nodeFromJSON(options.json);
            }

            if (!content) {
              content = schema.nodeFromJSON({ type: 'paragraph', content: [] });
            }

            // Handle group parameter: convert to JSON tag
            let tag: StructuredContentTag = options.attrs?.tag || 'block_table_sdt';
            if (options.attrs?.group) {
              tag = createTagObject({ group: options.attrs.group });
            }

            const attrs: StructuredContentInsertAttrs = {
              id: options.attrs?.id || generateRandomSigned32BitIntStrId(),
              tag,
              alias: options.attrs?.alias || 'Structured content',
              ...options.attrs,
            };
            const { group: _group, ...attrsWithoutGroup } = attrs;
            const node = schema.nodes.structuredContentBlock.create(attrsWithoutGroup, content, undefined);

            const parent = findParentNode((node) => node.type.name === 'structuredContentBlock')(state.selection);
            if (parent) {
              const insertPos = parent.pos + parent.node.nodeSize;
              from = to = insertPos;
            }

            tr.replaceRangeWith(from, to, node);
          }

          return true;
        },

      /**
       * Updates a single structured content field by its unique ID.
       * IDs are unique identifiers, so this will update at most one field.
       * If the updated node does not match the schema, it will not be updated.
       * @category Command
       * @param {string} id - Unique identifier of the field
       * @param {StructuredContentUpdate} options
       * @example
       * editor.commands.updateStructuredContentById('123', { text: 'Jane Doe', keepTextNodeStyles: true });
       * editor.commands.updateStructuredContentById('123', {
       *  json: { type: 'text', text: 'Jane Doe' },
       * });
       * editor.commands.updateStructuredContentById('456', {
       *  html: '<p>Updated legal content...</p>'
       * });
       */
      updateStructuredContentById:
        (id: string, options: StructuredContentUpdate = {}): Command =>
        ({ editor, dispatch, state, tr }) => {
          const structuredContentTags: StructuredContentMatch[] = getStructuredContentTagsById(id, state);

          if (!structuredContentTags.length) {
            return true;
          }

          const { schema } = editor;

          if (dispatch) {
            const structuredContent = structuredContentTags[0];
            const { pos, node } = structuredContent;
            const posFrom = pos;
            const posTo = pos + node.nodeSize;

            let content: Fragment | PmNode | null = null;

            if (options.text) {
              // If keepTextNodeStyles is true, use the marks from the first text node
              // Useful for preserving text styles when updating structured content
              const firstTextNode = options.keepTextNodeStyles === true ? findFirstTextNode(node) : null;
              const textMarks = firstTextNode ? firstTextNode.marks : [];
              content = schema.text(options.text, textMarks);
            }

            if (options.html) {
              const html = htmlHandler(options.html, editor);
              const doc = PMDOMParser.fromSchema(schema).parse(html);
              content = doc.content;
            }

            if (options.json) {
              content = schema.nodeFromJSON(options.json);
            }

            if (!content) {
              content = node.content;
            }

            const updatedNode = node.type.create({ ...node.attrs, ...options.attrs }, content, node.marks);

            try {
              const nodeForValidation = editor.validateJSON(updatedNode.toJSON());
              nodeForValidation.check();
            } catch (error) {
              console.error('Invalid content.', 'Passed value:', content, 'Error:', error);
              return false;
            }

            tr.replaceWith(posFrom, posTo, updatedNode);
          }

          return true;
        },

      /**
       * Removes a structured content.
       * @category Command
       * @param {Array<{ node: Node, pos: number }>} structuredContentTags
       * @example
       * const fields = editor.helpers.structuredContentCommands.getStructuredContentTagsById(['123'], editor.state);
       * editor.commands.deleteStructuredContent(fields);
       */
      deleteStructuredContent:
        (structuredContentTags: StructuredContentEntry[]): Command =>
        ({ dispatch, tr }) => {
          if (!structuredContentTags.length) {
            return true;
          }

          if (dispatch) {
            structuredContentTags.forEach((structuredContent: StructuredContentEntry) => {
              const { pos, node } = structuredContent;
              const posFrom = tr.mapping.map(pos);
              const posTo = tr.mapping.map(pos + node.nodeSize);
              const currentNode = tr.doc.nodeAt(posFrom);
              if (currentNode && node.eq(currentNode)) {
                tr.delete(posFrom, posTo);
              }
            });
          }

          return true;
        },

      /**
       * Removes a structured content by ID.
       * @category Command
       * @param {string | string[]} idOrIds
       * @example
       * editor.commands.deleteStructuredContentById('123');
       * editor.commands.deleteStructuredContentById(['123', '456']);
       */
      deleteStructuredContentById:
        (idOrIds: string | string[]): Command =>
        ({ dispatch, state, tr }) => {
          const structuredContentTags: StructuredContentMatch[] = getStructuredContentTagsById(idOrIds, state);

          if (!structuredContentTags.length) {
            return true;
          }

          if (dispatch) {
            structuredContentTags.forEach((structuredContent) => {
              const { pos, node } = structuredContent;
              const posFrom = tr.mapping.map(pos);
              const posTo = tr.mapping.map(pos + node.nodeSize);
              const currentNode = tr.doc.nodeAt(posFrom);
              if (currentNode && node.eq(currentNode)) {
                tr.delete(posFrom, posTo);
              }
            });
          }

          return true;
        },

      /**
       * Removes a structured content at cursor, preserving its content.
       * @category Command
       * @example
       * editor.commands.deleteStructuredContentAtSelection();
       */
      deleteStructuredContentAtSelection:
        (): Command =>
        ({ dispatch, state, tr }) => {
          const predicate = (node: PmNode) => STRUCTURED_CONTENT_NAMES.includes(node.type.name);
          const structuredContent = findParentNode(predicate)(state.selection);

          if (!structuredContent) {
            return true;
          }

          if (dispatch) {
            const { node, pos } = structuredContent;
            const posFrom = pos;
            const posTo = posFrom + node.nodeSize;
            const content = node.content;
            tr.replaceWith(posFrom, posTo, content);
          }

          return true;
        },

      /**
       * Updates all structured content fields that share the same group identifier.
       * Groups allow linking multiple fields together for batch operations.
       * @category Command
       * @param {string} group - Group identifier shared by multiple fields
       * @param {StructuredContentUpdate} options
       * @example
       * // Update all fields in the customer-info group
       * editor.commands.updateStructuredContentByGroup('customer-info', { text: 'Jane Doe', keepTextNodeStyles: true });
       *
       * // Update block content in a group
       * editor.commands.updateStructuredContentByGroup('terms-section', {
       *  html: '<p>Updated terms...</p>'
       * });
       */
      updateStructuredContentByGroup:
        (group: string, options: StructuredContentUpdate = {}): Command =>
        ({ editor, dispatch, state, tr }) => {
          const structuredContentTags: StructuredContentMatch[] = getStructuredContentByGroup(group, state);

          if (!structuredContentTags.length) {
            return true;
          }

          const { schema } = editor;

          if (dispatch) {
            // First pass: prepare and validate all updates before making any changes
            // This ensures all-or-nothing behavior - either all nodes update or none do
            const updates = [];

            for (const structuredContent of structuredContentTags) {
              const { pos, node } = structuredContent;

              let content: Fragment | PmNode | null = null;

              if (options.text) {
                // If keepTextNodeStyles is true, use the marks from the first text node
                // Useful for preserving text styles when updating structured content
                const firstTextNode = options.keepTextNodeStyles === true ? findFirstTextNode(node) : null;
                const textMarks = firstTextNode ? firstTextNode.marks : [];
                content = schema.text(options.text, textMarks);
              }

              if (options.html) {
                const html = htmlHandler(options.html, editor);
                const doc = PMDOMParser.fromSchema(schema).parse(html);
                content = doc.content;
              }

              if (options.json) {
                content = schema.nodeFromJSON(options.json);
              }

              if (!content) {
                content = node.content;
              }

              const updatedNode = node.type.create({ ...node.attrs, ...options.attrs }, content, node.marks);

              // Validate the node before adding to updates
              try {
                const nodeForValidation = editor.validateJSON(updatedNode.toJSON());
                nodeForValidation.check();
              } catch (error) {
                console.error('Invalid content.', 'Passed value:', content, 'Error:', error);
                return false;
              }

              updates.push({ pos, node, updatedNode });
            }

            // Second pass: apply all updates to the transaction
            // Use mapping to track position changes as document is modified
            for (const { pos, node, updatedNode } of updates) {
              const posFrom = tr.mapping.map(pos);
              const posTo = tr.mapping.map(pos + node.nodeSize);
              const currentNode = tr.doc.nodeAt(posFrom);
              if (currentNode && node.eq(currentNode)) {
                tr.replaceWith(posFrom, posTo, updatedNode);
              }
            }
          }

          return true;
        },

      /**
       * Removes all structured content fields that share the same group identifier.
       * @category Command
       * @param {string | string[]} groupOrGroups - Single group or array of groups
       * @example
       * // Delete all fields in a group
       * editor.commands.deleteStructuredContentByGroup('customer-info');
       *
       * // Delete multiple groups
       * editor.commands.deleteStructuredContentByGroup(['header', 'footer']);
       */
      deleteStructuredContentByGroup:
        (groupOrGroups: string | string[]): Command =>
        ({ dispatch, state, tr }) => {
          const structuredContentTags: StructuredContentMatch[] = getStructuredContentByGroup(groupOrGroups, state);

          if (!structuredContentTags.length) {
            return true;
          }

          if (dispatch) {
            structuredContentTags.forEach((structuredContent) => {
              const { pos, node } = structuredContent;
              const posFrom = tr.mapping.map(pos);
              const posTo = tr.mapping.map(pos + node.nodeSize);
              const currentNode = tr.doc.nodeAt(posFrom);
              if (currentNode && node.eq(currentNode)) {
                tr.delete(posFrom, posTo);
              }
            });
          }

          return true;
        },

      /**
       * Append multiple rows to the end of a table inside a structured content block.
       * Each inner array represents the cell values for one new row.
       * @category Command
       * @param {StructuredContentTableAppendRowsOptions} options - Append configuration
       * @example
       * editor.commands.appendRowsToStructuredContentTable({
       *   id: 'block-123',
       *   tableIndex: 0,
       *   rows: [['A', 'B'], ['C', 'D']],
       *   copyRowStyle: true,
       * });
       */
      appendRowsToStructuredContentTable:
        ({ id, tableIndex = 0, rows = [], copyRowStyle = false }: StructuredContentTableAppendRowsOptions): Command =>
        ({ state, commands, dispatch }) => {
          const normalized = normalizeRowsInput(rows);
          if (!normalized.length) return true;

          const tables = structuredContentHelpers.getStructuredContentTablesById(id, state);
          if (!tables.length || tableIndex < 0 || tableIndex >= tables.length) return true;

          const { node: tableNode, pos: tablePos } = tables[tableIndex];
          // Delegate to table command (bulk) to perform the append
          if (dispatch) {
            return commands.appendRowsWithContent({ tablePos, tableNode, valueRows: normalized, copyRowStyle });
          }
          return commands.appendRowsWithContent({
            tablePos,
            tableNode,
            valueRows: normalized,
            copyRowStyle,
            dispatch: false,
          });
        },
    };
  },

  addHelpers() {
    return {
      ...structuredContentHelpers,
    };
  },
});

/**
 * Normalize append row input into an array of row arrays.
 * @private
 * @param {Array} rowsOrValues - Raw row data
 * @returns {Array<string[]>}
 */
const normalizeRowsInput = (rowsOrValues: Array<string | string[]> | undefined): string[][] => {
  if (!Array.isArray(rowsOrValues) || !rowsOrValues.length) {
    return [];
  }

  if (Array.isArray(rowsOrValues[0])) {
    return rowsOrValues as string[][];
  }

  return [rowsOrValues as string[]];
};
