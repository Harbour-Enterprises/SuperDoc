import { Extension } from '@core/index';
import { getStructuredContentTagsById } from './structuredContentHelpers/getStructuredContentTagsById';

/**
 * @typedef {Object} StructuredContentTableAppendRowsOptions
 * @property {string} id - Structured content block identifier
 * @property {number} [tableIndex=0] - Index of the table inside the block
 * @property {Array<string[]>|Array<string>} rows - Cell values to append
 * @property {boolean} [copyRowStyle=false] - Clone the last row's styling when true
 */

export const StructuredContentTableCommands = Extension.create({
  name: 'structuredContentTableCommands',

  addHelpers() {
    return {
      /**
       * Find all tables inside a structured content block identified by id.
       * @param {string} id - Structured content block id
       * @param {import('prosemirror-state').EditorState} state - Editor state
       * @returns {Array<{ node: import('prosemirror-model').Node, pos: number }>} tables with absolute positions
       */
      getTablesInStructuredContentBlockById: (id, state) => {
        if (!id || !state) return [];

        const blocks = getStructuredContentTagsById(id, state).filter(
          ({ node }) => node.type.name === 'structuredContentBlock',
        );

        if (!blocks.length) return [];

        const { pos: blockPos, node: blockNode } = blocks[0];

        // Find all tables in the block subtree (relative positions)
        const tablesInBlock = [];
        blockNode.descendants((child, relPos) => {
          if (child.type.name === 'table') {
            // Translate to absolute pos in the document
            const absPos = blockPos + 1 + relPos; // +1 to enter block node
            tablesInBlock.push({ node: child, pos: absPos });
          }
        });

        return tablesInBlock;
      },
    };
  },

  addCommands() {
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

    return {
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

          const blocks = getStructuredContentTagsById(id, state).filter(
            ({ node }) => node.type.name === 'structuredContentBlock',
          );
          if (!blocks.length) return true;

          const { pos: blockPos, node: blockNode } = blocks[0];
          const tables = [];
          blockNode.descendants((child, relPos) => {
            if (child.type.name === 'table') tables.push({ node: child, pos: blockPos + 1 + relPos });
          });
          if (!tables.length || tableIndex < 0 || tableIndex >= tables.length) return true;

          const { node: tableNode, pos: tablePos } = tables[tableIndex];
          // Delegate to table command (bulk) to perform the append
          if (dispatch) {
            return commands.appendRowsWithContentToTable({ tablePos, tableNode, valueRows: normalized, copyRowStyle });
          }
          return commands.appendRowsWithContentToTable({
            tablePos,
            tableNode,
            valueRows: normalized,
            copyRowStyle,
            dispatch: false,
          });
        },
    };
  },
});

export default StructuredContentTableCommands;
