import { DOMParser as PMDOMParser } from 'prosemirror-model';
import { Extension } from '@core/index';
import { htmlHandler } from '@core/InputRule';
import { findParentNode } from '@helpers/findParentNode';
import { generateRandomSigned32BitIntStrId } from '@core/helpers/generateDocxRandomId.js';
import { getStructuredContentTagsById } from './structuredContentHelpers/getStructuredContentTagsById';
import * as structuredContentHelpers from './structuredContentHelpers/index';

const STRUCTURED_CONTENT_NAMES = ['structuredContent', 'structuredContentBlock'];

/**
 * @typedef {Object} StructuredContentInlineInsert
 * @property {string} [text] - Text content to insert
 * @property {Object} [json] - ProseMirror JSON
 * @property {Object} [attrs] - Node attributes
 */

/**
 * @typedef {Object} StructuredContentBlockInsert
 * @property {string} [html] - HTML content to insert
 * @property {Object} [json] - ProseMirror JSON
 * @property {Object} [attrs] - Node attributes
 */

/**
 * @typedef {Object} StructuredContentUpdate
 * @property {string} [text] - Replace content with text (only for structured content inline)
 * @property {string} [html] - Replace content with HTML (only for structured content block)
 * @property {Object} [json] - Replace content with ProseMirror JSON (overrides html)
 * @property {Object} [attrs] - Update attributes only (preserves content)
 */

/**
 * @typedef {Object} StructuredContentTableAppendRowsOptions
 * @property {string} id - Structured content block identifier
 * @property {number} [tableIndex=0] - Index of the table inside the block
 * @property {Array<string[]>|Array<string>} rows - Cell values to append
 * @property {boolean} [copyRowStyle=false] - Clone the last row's styling when true
 */

export const StructuredContentCommands = Extension.create({
  name: 'structuredContentCommands',

  addCommands() {
    return {
      /**
       * Inserts a structured content inline at selection.
       * @category Command
       * @param {StructuredContentInlineInsert} options
       */
      insertStructuredContentInline:
        (options = {}) =>
        ({ editor, dispatch, state, tr }) => {
          const { schema } = editor;
          let { from, to } = state.selection;

          if (dispatch) {
            const selectionText = state.doc.textBetween(from, to);

            let content = null;

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

            const attrs = {
              ...options.attrs,
              id: options.attrs?.id || generateRandomSigned32BitIntStrId(),
              tag: 'inline_text_sdt',
              alias: options.attrs?.alias || 'Structured content',
            };
            const node = schema.nodes.structuredContent.create(attrs, content, null);

            const parent = findParentNode((node) => node.type.name === 'structuredContent')(state.selection);
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
       */
      insertStructuredContentBlock:
        (options = {}) =>
        ({ editor, dispatch, state, tr }) => {
          const { schema } = editor;
          let { from, to } = state.selection;

          if (dispatch) {
            const selectionContent = state.selection.content();

            let content = null;

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

            const attrs = {
              ...options.attrs,
              id: options.attrs?.id || generateRandomSigned32BitIntStrId(),
              tag: 'block_table_sdt',
              alias: options.attrs?.alias || 'Structured content',
            };
            const node = schema.nodes.structuredContentBlock.create(attrs, content, null);

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
       */
      updateStructuredContentById:
        (id, options = {}) =>
        ({ editor, dispatch, state, tr }) => {
          const structuredContentTags = getStructuredContentTagsById(id, state);

          if (!structuredContentTags.length) {
            return true;
          }

          const { schema } = editor;

          if (dispatch) {
            const structuredContent = structuredContentTags[0];
            const { pos, node } = structuredContent;
            const posFrom = pos;
            const posTo = pos + node.nodeSize;

            let content = null;

            if (options.text) {
              content = schema.text(options.text);
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
              updatedNode.check();
            } catch {
              console.error('Updated node does not conform to the schema');
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
       */
      deleteStructuredContent:
        (structuredContentTags) =>
        ({ dispatch, tr }) => {
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
       * Removes a structured content by ID.
       * @category Command
       * @param {string | string[]} idOrIds
       */
      deleteStructuredContentById:
        (idOrIds) =>
        ({ dispatch, state, tr }) => {
          const structuredContentTags = getStructuredContentTagsById(idOrIds, state);

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
       */
      deleteStructuredContentAtSelection:
        () =>
        ({ dispatch, state, tr }) => {
          const predicate = (node) => STRUCTURED_CONTENT_NAMES.includes(node.type.name);
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
        ({ id, tableIndex = 0, rows = [], copyRowStyle = false }) =>
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
const normalizeRowsInput = (rowsOrValues) => {
  if (!Array.isArray(rowsOrValues) || !rowsOrValues.length) {
    return [];
  }

  if (Array.isArray(rowsOrValues[0])) {
    return rowsOrValues;
  }

  return [rowsOrValues];
};
