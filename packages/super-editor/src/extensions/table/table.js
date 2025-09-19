// @ts-check
import { Node, Attribute } from '@core/index.js';
import { callOrGet } from '@core/utilities/callOrGet.js';
import { getExtensionConfigField } from '@core/helpers/getExtensionConfigField.js';
import { /* TableView */ createTableView } from './TableView.js';
import { createTable } from './tableHelpers/createTable.js';
import { createColGroup } from './tableHelpers/createColGroup.js';
import { deleteTableWhenSelected } from './tableHelpers/deleteTableWhenSelected.js';
import { isInTable } from '@helpers/isInTable.js';
import { createTableBorders } from './tableHelpers/createTableBorders.js';
import { createCellBorders } from '../table-cell/helpers/createCellBorders.js';
import { findParentNode } from '@helpers/findParentNode.js';
import { TextSelection } from 'prosemirror-state';
import { isCellSelection } from './tableHelpers/isCellSelection.js';
import {
  addColumnBefore as originalAddColumnBefore,
  addColumnAfter as originalAddColumnAfter,
  addRowBefore as originalAddRowBefore,
  addRowAfter as originalAddRowAfter,
  CellSelection,
  columnResizing,
  deleteColumn,
  deleteRow,
  deleteTable,
  fixTables,
  goToNextCell,
  mergeCells as originalMergeCells,
  setCellAttr,
  splitCell as originalSplitCell,
  tableEditing,
  toggleHeader,
  toggleHeaderCell,
  // TableView,
  tableNodeTypes,
  selectedRect,
  TableMap,
} from 'prosemirror-tables';
import { cellAround } from './tableHelpers/cellAround.js';
import { cellWrapping } from './tableHelpers/cellWrapping.js';

/**
 * Table configuration options
 * @typedef {Object} TableConfig
 * @property {number} [rows=3] - Number of rows to create
 * @property {number} [cols=3] - Number of columns to create
 * @property {boolean} [withHeaderRow=false] - Create first row as header row
 */

/**
 * Table indentation configuration
 * @typedef {Object} TableIndent
 * @property {number} width - Indent width in pixels
 * @property {string} [type='dxa'] - Indent type
 */

/**
 * Cell selection position
 * @typedef {Object} CellSelectionPosition
 * @property {number} anchorCell - Starting cell position
 * @property {number} headCell - Ending cell position
 */

/**
 * Configuration options for Table
 * @typedef {Object} TableOptions
 * @category Options
 * @property {Object} [htmlAttributes={'aria-label': 'Table node'}] - Default HTML attributes for all tables
 * @property {boolean} [resizable=true] - Enable column resizing functionality
 * @property {number} [handleWidth=5] - Width of resize handles in pixels
 * @property {number} [cellMinWidth=10] - Minimum cell width constraint in pixels
 * @property {boolean} [lastColumnResizable=true] - Allow resizing of the last column
 * @property {boolean} [allowTableNodeSelection=false] - Enable selecting the entire table node
 */

/**
 * Attributes for table nodes
 * @typedef {Object} TableAttributes
 * @category Attributes
 * @property {TableIndent} [tableIndent] - Table indentation configuration
 * @property {import("./tableHelpers/createTableBorders.js").TableBorders} [borders] - Border styling for this table
 * @property {string} [borderCollapse='collapse'] - CSS border-collapse property
 * @property {string} [justification] - Table alignment ('left', 'center', 'right')
 * @property {number} [tableCellSpacing] - Cell spacing in pixels for this table
 * @property {string} [sdBlockId] @internal - Internal block tracking ID
 * @property {string} [tableStyleId] @internal - Internal reference to table style
 * @property {string} [tableLayout] @internal - CSS table-layout property (advanced usage)
 */

/**
 * Current cell information
 * @typedef {Object} CurrentCellInfo
 * @property {Object} rect - Selected rectangle information
 * @property {import('prosemirror-model').Node} cell - The cell node
 * @property {Object} attrs - Cell attributes
 */

/**
 * @module Table
 * @sidebarTitle Table
 * @snippetPath /snippets/extensions/table.mdx
 * @shortcut Tab | goToNextCell/addRowAfter | Navigate to next cell or add row
 * @shortcut Shift-Tab | goToPreviousCell | Navigate to previous cell
 * @shortcut Backspace | deleteTableWhenSelected | Delete table when all cells selected
 * @shortcut Delete | deleteTableWhenSelected | Delete table when all cells selected
 */
export const Table = Node.create({
  name: 'table',

  content: 'tableRow+',

  group: 'block',

  isolating: true,

  tableRole: 'table',

  addOptions() {
    return {
      htmlAttributes: {
        'aria-label': 'Table node',
      },
      resizable: true,
      handleWidth: 5,
      cellMinWidth: 10,
      lastColumnResizable: true,
      allowTableNodeSelection: false,
    };
  },

  addAttributes() {
    return {
      /* tableWidth: {
        renderDOM: ({ tableWidth }) => {
          if (!tableWidth) return {};
          const { width, type = 'auto' } = tableWidth;
          return { 
            style: `width: ${width}px` 
          };
        },
      }, */

      /**
       * @private
       * @category Attribute
       * @param {string} [sdBlockId] - Internal block tracking ID (not user-configurable)
       */
      sdBlockId: {
        default: null,
        keepOnSplit: false,
        parseDOM: (elem) => elem.getAttribute('data-sd-block-id'),
        renderDOM: (attrs) => {
          return attrs.sdBlockId ? { 'data-sd-block-id': attrs.sdBlockId } : {};
        },
      },

      /**
       * @category Attribute
       * @param {TableIndent} [tableIndent] - Table indentation configuration
       */
      tableIndent: {
        renderDOM: ({ tableIndent }) => {
          if (!tableIndent) return {};
          const { width } = tableIndent;
          let style = '';
          if (width) style += `margin-left: ${width}px`;
          return {
            style,
          };
        },
      },

      /**
       * @category Attribute
       * @param {import("./tableHelpers/createTableBorders.js").TableBorders} [borders] - Border styling for this table
       */
      borders: {
        default: {},
        renderDOM({ borders }) {
          if (!borders) return {};
          const style = Object.entries(borders).reduce((acc, [key, { size, color }]) => {
            return `${acc}border-${key}: ${Math.ceil(size)}px solid ${color || 'black'};`;
          }, '');

          return {
            style,
          };
        },
      },

      /**
       * @category Attribute
       * @param {string} [borderCollapse='collapse'] - CSS border-collapse property
       */
      borderCollapse: {
        default: null,
        renderDOM({ borderCollapse }) {
          return {
            style: `border-collapse: ${borderCollapse || 'collapse'}`,
          };
        },
      },

      /**
       * @category Attribute
       * @param {string} [justification] - Table alignment ('left', 'center', 'right')
       */
      justification: {
        default: null,
        renderDOM: (attrs) => {
          if (!attrs.justification) return {};

          if (attrs.justification === 'center') {
            return { style: `margin: 0 auto` };
          }
          if (attrs.justification === 'right') {
            return { style: `margin-left: auto` };
          }

          return {};
        },
      },

      /**
       * @private
       * @category Attribute
       * @param {string} [tableStyleId] - Internal reference to table style (not user-configurable)
       */
      tableStyleId: {
        rendered: false,
      },

      /**
       * @private
       * @category Attribute
       * @param {string} [tableLayout] - CSS table-layout property (advanced usage)
       */
      tableLayout: {
        rendered: false,
      },

      /**
       * @category Attribute
       * @param {number} [tableCellSpacing] - Cell spacing in pixels for this table
       */
      tableCellSpacing: {
        default: null,
        rendered: false,
      },
    };
  },

  parseDOM() {
    return [{ tag: 'table' }];
  },

  renderDOM({ node, htmlAttributes }) {
    const { colgroup, tableWidth, tableMinWidth } = createColGroup(node, this.options.cellMinWidth);

    const attrs = Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes, {
      style: tableWidth ? `width: ${tableWidth}` : `min-width: ${tableMinWidth}`,
    });

    const table = ['table', attrs, colgroup, ['tbody', 0]];

    return table;
  },

  addCommands() {
    return {
      /**
       * Insert a new table into the document
       * @category Command
       * @param {TableConfig} [config] - Table configuration options
       * @example
       * editor.commands.insertTable()
       * editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
       */
      insertTable:
        ({ rows = 3, cols = 3, withHeaderRow = false } = {}) =>
        ({ tr, dispatch, editor }) => {
          const node = createTable(editor.schema, rows, cols, withHeaderRow);

          if (dispatch) {
            const offset = tr.selection.from + 1;
            tr.replaceSelectionWith(node)
              .scrollIntoView()
              .setSelection(TextSelection.near(tr.doc.resolve(offset)));
          }

          return true;
        },

      /**
       * Delete the entire table containing the cursor
       * @category Command
       * @example
       * editor.commands.deleteTable()
       */
      deleteTable:
        () =>
        ({ state, dispatch }) => {
          return deleteTable(state, dispatch);
        },

      /**
       * Add a column before the current column
       * @category Command
       * @example
       * editor.commands.addColumnBefore()
       * @note Preserves cell attributes from current column
       */
      addColumnBefore:
        () =>
        ({ state, dispatch, chain }) => {
          if (!originalAddColumnBefore(state)) return false;

          let { rect, attrs: currentCellAttrs } = getCurrentCellAttrs(state);

          return chain()
            .command(() => originalAddColumnBefore(state, dispatch))
            .command(({ tr }) => {
              let table = tr.doc.nodeAt(rect.tableStart - 1);
              if (!table) return false;
              let updatedMap = TableMap.get(table);
              let newColumnIndex = rect.left;

              if (newColumnIndex < 0 || newColumnIndex >= updatedMap.width) {
                return false;
              }

              for (let row = 0; row < updatedMap.height; row++) {
                let cellIndex = row * updatedMap.width + newColumnIndex;
                let cellPos = updatedMap.map[cellIndex];
                let cellAbsolutePos = rect.tableStart + cellPos;
                let cell = tr.doc.nodeAt(cellAbsolutePos);
                if (cell) {
                  let attrs = {
                    ...currentCellAttrs,
                    colspan: cell.attrs.colspan,
                    rowspan: cell.attrs.rowspan,
                    colwidth: cell.attrs.colwidth,
                  };
                  tr.setNodeMarkup(cellAbsolutePos, null, attrs);
                }
              }

              return true;
            })
            .run();
        },

      /**
       * Add a column after the current column
       * @category Command
       * @returns {Function} Command
       * @example
       * addColumnAfter()
       * @note Preserves cell attributes from current column
       */
      addColumnAfter:
        () =>
        ({ state, dispatch, chain }) => {
          if (!originalAddColumnAfter(state)) return false;

          let { rect, attrs: currentCellAttrs } = getCurrentCellAttrs(state);

          return chain()
            .command(() => originalAddColumnAfter(state, dispatch))
            .command(({ tr }) => {
              let table = tr.doc.nodeAt(rect.tableStart - 1);
              if (!table) return false;
              let updatedMap = TableMap.get(table);
              let newColumnIndex = rect.left + 1;

              if (newColumnIndex < 0 || newColumnIndex >= updatedMap.width) {
                return false;
              }

              for (let row = 0; row < updatedMap.height; row++) {
                let cellIndex = row * updatedMap.width + newColumnIndex;
                let cellPos = updatedMap.map[cellIndex];
                let cellAbsolutePos = rect.tableStart + cellPos;
                let cell = tr.doc.nodeAt(cellAbsolutePos);
                if (cell) {
                  let attrs = {
                    ...currentCellAttrs,
                    colspan: cell.attrs.colspan,
                    rowspan: cell.attrs.rowspan,
                    colwidth: cell.attrs.colwidth,
                  };
                  tr.setNodeMarkup(cellAbsolutePos, null, attrs);
                }
              }

              return true;
            })
            .run();
        },

      /**
       * Delete the column containing the cursor
       * @category Command
       * @returns {Function} Command
       * @example
       * deleteColumn()
       */
      deleteColumn:
        () =>
        ({ state, dispatch }) => {
          return deleteColumn(state, dispatch);
        },

      /**
       * Add a row before the current row
       * @category Command
       * @returns {Function} Command
       * @example
       * addRowBefore()
       * @note Preserves cell attributes from current row
       */
      addRowBefore:
        () =>
        ({ state, dispatch, chain }) => {
          if (!originalAddRowBefore(state)) return false;

          let { rect, attrs: currentCellAttrs } = getCurrentCellAttrs(state);

          return chain()
            .command(() => originalAddRowBefore(state, dispatch))
            .command(({ tr }) => {
              let table = tr.doc.nodeAt(rect.tableStart - 1);
              if (!table) return false;
              let updatedMap = TableMap.get(table);
              let newRowIndex = rect.top;

              if (newRowIndex < 0 || newRowIndex >= updatedMap.height) {
                return false;
              }

              for (let col = 0; col < updatedMap.width; col++) {
                let cellIndex = newRowIndex * updatedMap.width + col;
                let cellPos = updatedMap.map[cellIndex];
                let cellAbsolutePos = rect.tableStart + cellPos;
                let cell = tr.doc.nodeAt(cellAbsolutePos);
                if (cell) {
                  let attrs = {
                    ...currentCellAttrs,
                    colspan: cell.attrs.colspan,
                    rowspan: cell.attrs.rowspan,
                    colwidth: cell.attrs.colwidth,
                  };
                  tr.setNodeMarkup(cellAbsolutePos, null, attrs);
                }
              }

              return true;
            })
            .run();
        },

      /**
       * Add a row after the current row
       * @category Command
       * @returns {Function} Command
       * @example
       * addRowAfter()
       * @note Preserves cell attributes from current row
       */
      addRowAfter:
        () =>
        ({ state, dispatch, chain }) => {
          if (!originalAddRowAfter(state)) return false;

          let { rect, attrs: currentCellAttrs } = getCurrentCellAttrs(state);

          return chain()
            .command(() => originalAddRowAfter(state, dispatch))
            .command(({ tr }) => {
              let table = tr.doc.nodeAt(rect.tableStart - 1);
              if (!table) return false;
              let updatedMap = TableMap.get(table);
              let newRowIndex = rect.top + 1;

              if (newRowIndex >= updatedMap.height) return false;

              for (let col = 0; col < updatedMap.width; col++) {
                let cellIndex = newRowIndex * updatedMap.width + col;
                let cellPos = updatedMap.map[cellIndex];
                let cellAbsolutePos = rect.tableStart + cellPos;
                let cell = tr.doc.nodeAt(cellAbsolutePos);
                if (cell) {
                  let attrs = {
                    ...currentCellAttrs,
                    colspan: cell.attrs.colspan,
                    rowspan: cell.attrs.rowspan,
                    colwidth: cell.attrs.colwidth,
                  };
                  tr.setNodeMarkup(cellAbsolutePos, null, attrs);
                }
              }

              return true;
            })
            .run();
        },

      /**
       * Delete the row containing the cursor
       * @category Command
       * @returns {Function} Command
       * @example
       * deleteRow()
       */
      deleteRow:
        () =>
        ({ state, dispatch }) => {
          return deleteRow(state, dispatch);
        },

      /**
       * Merge selected cells into one
       * @category Command
       * @returns {Function} Command
       * @example
       * mergeCells()
       * @note Content from all cells is preserved
       */
      mergeCells:
        () =>
        ({ state, dispatch }) => {
          return originalMergeCells(state, dispatch);
        },

      /**
       * Split a merged cell back into individual cells
       * @category Command
       * @returns {Function} Command - true if split, false if position invalid
       * @example
       * splitCell()
       */
      splitCell:
        () =>
        ({ state, dispatch, commands }) => {
          if (originalSplitCell(state, dispatch)) {
            return true;
          }

          return commands.splitSingleCell();
        },

      /**
       * Split a single unmerged cell into two cells horizontally
       * @category Command
       * @returns {Function} Command - true if split, false if position invalid
       * @example
       * splitSingleCell()
       * @note This command splits a single cell (not merged) into two cells by:
       * - Dividing the cell width in half
       * - Inserting a new cell to the right
       * - Adjusting colspan for cells in other rows that span this column
       * - Only works on cells with colspan=1 and rowspan=1
       * @note Different from splitCell which splits merged cells back to original cells
       */
      splitSingleCell:
        () =>
        ({ state, dispatch, tr }) => {
          // For reference.
          // https://github.com/ProseMirror/prosemirror-tables/blob/a99f70855f2b3e2433bc77451fedd884305fda5b/src/commands.ts#L497
          const sel = state.selection;
          let cellNode;
          let cellPos;
          if (!(sel instanceof CellSelection)) {
            cellNode = cellWrapping(sel.$from);
            if (!cellNode) return false;
            cellPos = cellAround(sel.$from)?.pos;
          } else {
            if (sel.$anchorCell.pos != sel.$headCell.pos) return false;
            cellNode = sel.$anchorCell.nodeAfter;
            cellPos = sel.$anchorCell.pos;
          }
          if (cellNode == null || cellPos == null) {
            return false;
          }
          if (cellNode.attrs.colspan != 1 || cellNode.attrs.rowspan != 1) {
            return false;
          }
          //

          if (dispatch) {
            let rect = selectedRect(state);
            let currentRow = rect.top;
            let currentCol = rect.left;
            let baseAttrs = { ...cellNode.attrs };
            let currentColWidth = baseAttrs.colwidth;
            let newCellWidth = null;

            // Get new width for the current and new cells.
            if (currentColWidth && currentColWidth[0]) {
              newCellWidth = Math.ceil(currentColWidth[0] / 2);
            }

            // Update width of the current cell.
            if (newCellWidth) {
              tr.setNodeMarkup(tr.mapping.map(cellPos, 1), null, { ...baseAttrs, colwidth: [newCellWidth] });
            }

            // Insert new cell after the current one.
            const newCellAttrs = { ...baseAttrs, colwidth: newCellWidth ? [newCellWidth] : null };
            const newCell = getCellType({ node: cellNode, state }).createAndFill(newCellAttrs);
            tr.insert(tr.mapping.map(cellPos + cellNode.nodeSize, 1), newCell);

            // Update colspan and colwidth for cells in other rows.
            for (let row = 0; row < rect.map.height; row++) {
              if (row === currentRow) continue;

              let rowCells = new Set();
              for (let col = 0; col < rect.map.width; col++) {
                let cellIndex = rect.map.map[row * rect.map.width + col];
                if (cellIndex != null) rowCells.add(cellIndex);
              }

              [...rowCells].forEach((cellIndex) => {
                let cellRect = rect.map.findCell(cellIndex);

                // If cell covers the column where we added new cell.
                if (cellRect.left <= currentCol && cellRect.right > currentCol) {
                  let cellPos = tr.mapping.map(rect.tableStart + cellIndex, 1);
                  let cell = tr.doc.nodeAt(cellPos);

                  if (cell) {
                    let newColspan = (cell.attrs.colspan || 1) + 1;
                    let updatedColwidth = cell.attrs.colwidth;
                    if (updatedColwidth && newCellWidth) {
                      let originalColIndex = currentCol - cellRect.left;
                      updatedColwidth = [
                        ...updatedColwidth.slice(0, originalColIndex),
                        newCellWidth, // current cell width
                        newCellWidth, // new cell width
                        ...updatedColwidth.slice(originalColIndex + 1),
                      ];
                    }
                    let cellAttrs = { ...cell.attrs, colspan: newColspan, colwidth: updatedColwidth };
                    tr.setNodeMarkup(cellPos, null, cellAttrs);
                  }
                }
              });
            }
          }

          return true;
        },

      /**
       * Toggle between merge and split cells based on selection
       * @category Command
       * @returns {Function} Command
       * @example
       * mergeOrSplit()
       * @note Merges if multiple cells selected, splits if merged cell selected
       */
      mergeOrSplit:
        () =>
        ({ state, dispatch, commands }) => {
          if (originalMergeCells(state, dispatch)) {
            return true;
          }

          return commands.splitCell();
        },

      /**
       * Toggle the first column as header column
       * @category Command
       * @returns {Function} Command
       * @example
       * toggleHeaderColumn()
       */
      toggleHeaderColumn:
        () =>
        ({ state, dispatch }) => {
          return toggleHeader('column')(state, dispatch);
        },

      /**
       * Toggle the first row as header row
       * @category Command
       * @returns {Function} Command
       * @example
       * toggleHeaderRow()
       */
      toggleHeaderRow:
        () =>
        ({ state, dispatch }) => {
          return toggleHeader('row')(state, dispatch);
        },

      /**
       * Toggle current cell as header cell
       * @category Command
       * @returns {Function} Command
       * @example
       * toggleHeaderCell()
       */
      toggleHeaderCell:
        () =>
        ({ state, dispatch }) => {
          return toggleHeaderCell(state, dispatch);
        },

      /**
       * Set an attribute on selected cells
       * @category Command
       * @param {string} name - Attribute name
       * @param {*} value - Attribute value
       * @returns {Function} Command
       * @example
       * setCellAttr('background', { color: 'ff0000' })
       * setCellAttr('verticalAlign', 'middle')
       */
      setCellAttr:
        (name, value) =>
        ({ state, dispatch }) => {
          return setCellAttr(name, value)(state, dispatch);
        },

      /**
       * Navigate to the next cell (Tab behavior)
       * @category Command
       * @returns {Function} Command
       * @example
       * goToNextCell()
       */
      goToNextCell:
        () =>
        ({ state, dispatch }) => {
          return goToNextCell(1)(state, dispatch);
        },

      /**
       * Navigate to the previous cell (Shift+Tab behavior)
       * @category Command
       * @returns {Function} Command
       * @example
       * goToPreviousCell()
       */
      goToPreviousCell:
        () =>
        ({ state, dispatch }) => {
          return goToNextCell(-1)(state, dispatch);
        },

      /**
       * Fix table structure inconsistencies
       * @category Command
       * @returns {Function} Command
       * @example
       * fixTables()
       * @note Repairs malformed tables and normalizes structure
       */
      fixTables:
        () =>
        ({ state, dispatch }) => {
          if (dispatch) {
            fixTables(state);
          }

          return true;
        },

      /**
       * Set cell selection programmatically
       * @category Command
       * @param {CellSelectionPosition} pos - Cell selection coordinates
       * @returns {Function} Command
       * @example
       * setCellSelection({ anchorCell: 10, headCell: 15 })
       */
      setCellSelection:
        (pos) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setSelection(CellSelection.create(tr.doc, pos.anchorCell, pos.headCell));
          }

          return true;
        },

      /**
       * Set background color for selected cells
       * @category Command
       * @param {string} value - Color value (hex with or without #)
       * @example
       * editor.commands.setCellBackground('#ff0000')
       * editor.commands.setCellBackground('ff0000')
       */
      setCellBackground:
        (value) =>
        ({ editor, commands, dispatch }) => {
          const { selection } = editor.state;

          if (!isCellSelection(selection)) {
            return false;
          }

          const color = value?.startsWith('#') ? value.slice(1) : value;

          if (dispatch) {
            return commands.setCellAttr('background', { color });
          }

          return true;
        },

      /**
       * Remove all borders from table and its cells
       * @category Command
       * @returns {Function} Command
       * @example
       * deleteCellAndTableBorders()
       * @note Sets all border sizes to 0
       */
      deleteCellAndTableBorders:
        () =>
        ({ state, tr }) => {
          if (!isInTable(state)) {
            return false;
          }

          const table = findParentNode((node) => node.type.name === this.name)(state.selection);

          if (!table) {
            return false;
          }

          const from = table.pos;
          const to = table.pos + table.node.nodeSize;

          // remove from cells
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (['tableCell', 'tableHeader'].includes(node.type.name)) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                borders: createCellBorders({ size: 0 }),
              });
            }
          });

          // remove from table
          tr.setNodeMarkup(table.pos, undefined, {
            ...table.node.attrs,
            borders: createTableBorders({ size: 0 }),
          });

          return true;
        },
    };
  },

  addShortcuts() {
    return {
      Tab: () => {
        if (this.editor.commands.goToNextCell()) {
          return true;
        }
        if (!this.editor.can().addRowAfter()) {
          return false;
        }
        return this.editor.chain().addRowAfter().goToNextCell().run();
      },
      'Shift-Tab': () => this.editor.commands.goToPreviousCell(),
      Backspace: deleteTableWhenSelected,
      'Mod-Backspace': deleteTableWhenSelected,
      Delete: deleteTableWhenSelected,
      'Mod-Delete': deleteTableWhenSelected,
    };
  },

  addPmPlugins() {
    const resizable = this.options.resizable && this.editor.isEditable;

    return [
      ...(resizable
        ? [
            columnResizing({
              handleWidth: this.options.handleWidth,
              cellMinWidth: this.options.cellMinWidth,
              defaultCellMinWidth: this.options.cellMinWidth,
              lastColumnResizable: this.options.lastColumnResizable,
              View: createTableView({
                editor: this.editor,
              }),
            }),
          ]
        : []),

      tableEditing({
        allowTableNodeSelection: this.options.allowTableNodeSelection,
      }),
    ];
  },

  extendNodeSchema(extension) {
    return {
      tableRole: callOrGet(
        getExtensionConfigField(extension, 'tableRole', {
          name: extension.name,
          options: extension.options,
          storage: extension.storage,
        }),
      ),
    };
  },
});

/**
 * Get the cell type based on table role
 * @private
 * @param {Object} params - Parameters
 * @param {Object} params.node - Cell node
 * @param {Object} params.state - Editor state
 * @returns {Object} Cell node type
 */
function getCellType({ node, state }) {
  const nodeTypes = tableNodeTypes(state.schema);
  return nodeTypes[node.type.spec.tableRole];
}

/**
 * Copy cell attributes excluding span properties
 * @private
 * @param {Object} node - Cell node
 * @returns {Object} Filtered attributes without colspan, rowspan, colwidth
 * @note Used when creating new cells to preserve styling but not structure
 */
function copyCellAttrs(node) {
  // Exclude colspan, rowspan and colwidth attrs.
  // eslint-disable-next-line no-unused-vars
  const { colspan, rowspan, colwidth, ...attrs } = node.attrs;
  return attrs;
}

/**
 * Get current cell attributes from selection
 * @private
 * @param {Object} state - Editor state
 * @returns {CurrentCellInfo} Current cell information
 */
function getCurrentCellAttrs(state) {
  let rect = selectedRect(state);
  let index = rect.top * rect.map.width + rect.left;
  let pos = rect.map.map[index];
  let cell = rect.table.nodeAt(pos);
  let attrs = copyCellAttrs(cell);
  return { rect, cell, attrs };
}
