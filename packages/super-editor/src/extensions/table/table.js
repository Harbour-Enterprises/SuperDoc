import { Node, Attribute } from '@core/index.js';
import { callOrGet } from '@core/utilities/callOrGet.js';
import { getExtensionConfigField } from '@core/helpers/getExtensionConfigField.js';
import { /* TableView */ createTableView } from './TableView.js';
import { findParentNodeClosestToPos } from '@helpers/index.js';
import { Fragment } from "prosemirror-model";
import { createTable } from './tableHelpers/createTable.js';
import { createColGroup } from './tableHelpers/createColGroup.js';
import { deleteTableWhenSelected } from './tableHelpers/deleteTableWhenSelected.js';
import { isInTable } from '@helpers/isInTable.js';
import { createTableBorders } from './tableHelpers/createTableBorders.js';
import { createCellBorders } from '../table-cell/helpers/createCellBorders.js';
import { findParentNode } from '@helpers/findParentNode.js';
import { TextSelection } from 'prosemirror-state';
import { getFieldAttrs } from '@helpers/annotator.js';
import { getNodeType } from '@core/helpers/getNodeType.js';
import {
  addColumnBefore,
  addColumnAfter,
  addRowBefore,
  addRowAfter,
  CellSelection,
  columnResizing,
  deleteColumn,
  deleteRow,
  deleteTable,
  fixTables,
  goToNextCell,
  mergeCells,
  setCellAttr,
  splitCell,
  tableEditing,
  toggleHeader,
  toggleHeaderCell,
  // TableView,
} from 'prosemirror-tables';

export const Table = Node.create({
  name: 'table',

  content: 'tableRow+',

  group: 'block',

  isolating: true,

  tableRole: 'table',

  addOptions() {
    return {
      htmlAttributes: {},
      resizable: true,
      handleWidth: 5,
      cellMinWidth: 25,
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

      tableIndent: {
        renderDOM: ({ tableIndent }) => {
          if (!tableIndent) return {};
          const { width, type = 'dxa' } = tableIndent;
          let style = '';
          if (width) style += `margin-left: ${width}px`;
          return { 
            style, 
          };
        },
      },

      borders: {
        default: {},
        renderDOM({ borders }) {
          if (!borders) return {};
          const style = Object.entries(borders).reduce(
            (acc, [key, { size, color }]) => {
              return `${acc}border-${key}: ${size}px solid ${color || 'black'};`;
            }, 
            ''
          );

          return { 
            style, 
          };
        },
      },

      borderCollapse: {
        default: null,
        renderDOM({ borderCollapse }) {
          return { 
            style: `border-collapse: ${borderCollapse || 'collapse'}`, 
          };
        },
      },

      tableStyleId: { 
        rendered: false, 
      },

      tableLayout: { 
        rendered: false 
      },

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
    const { colgroup, tableWidth, tableMinWidth } = createColGroup(
      node,
      this.options.cellMinWidth,
    );

    const attrs = Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes, {
      style: tableWidth 
        ? `width: ${tableWidth}` 
        : `min-width: ${tableMinWidth}`,
    });

    const table =  [
      'table', 
      attrs, 
      colgroup, 
      ['tbody', 0],
    ];

    return table;
  },

  addCommands() {
    return {
      insertTable:
        ({ rows = 3, cols = 3, withHeaderRow = false } = {}) => ({ tr, dispatch, editor }) => {
          const zeroWidthText = editor.schema.text('\u200B');
          const emptyPar = getNodeType('paragraph', editor.schema).create(null, zeroWidthText);
          const node = createTable(editor.schema, rows, cols, withHeaderRow, emptyPar);

          if (dispatch) {
            const offset = tr.selection.from + 1;
            tr.replaceSelectionWith(node)
              .scrollIntoView()
              .setSelection(TextSelection.near(tr.doc.resolve(offset)));
          }
          
          return true;
        },

      deleteTable:
        () => ({ state, dispatch }) => {
          return deleteTable(state, dispatch);
        },

      addColumnBefore:
        () => ({ state, dispatch }) => {
          return addColumnBefore(state, dispatch);
        },

      addColumnAfter:
        () => ({ state, dispatch }) => {
          return addColumnAfter(state, dispatch);
        },

      deleteColumn:
        () => ({ state, dispatch }) => {
          return deleteColumn(state, dispatch);
        },

      addRowBefore:
        () => ({ state, dispatch }) => {
          return addRowBefore(state, dispatch);
        },

      addRowAfter:
        () => ({ state, dispatch }) => {
          return addRowAfter(state, dispatch);
        },

      deleteRow:
        () => ({ state, dispatch }) => {
          return deleteRow(state, dispatch);
        },

      mergeCells:
        () => ({ state, dispatch }) => {
          return mergeCells(state, dispatch);
        },

      splitCell:
        () => ({ state, dispatch }) => {
          return splitCell(state, dispatch);
        },

      mergeOrSplit:
        () => ({ state, dispatch }) => {
          if (mergeCells(state, dispatch)) {
            return true;
          }

          return splitCell(state, dispatch);
        },

      toggleHeaderColumn:
        () => ({ state, dispatch }) => {
          return toggleHeader('column')(state, dispatch);
        },

      toggleHeaderRow:
        () => ({ state, dispatch }) => {
          return toggleHeader('row')(state, dispatch);
        },

      toggleHeaderCell:
        () => ({ state, dispatch }) => {
          return toggleHeaderCell(state, dispatch);
        },

      setCellAttr:
        (name, value) => ({ state, dispatch }) => {
          return setCellAttr(name, value)(state, dispatch);
        },

      goToNextCell:
        () => ({ state, dispatch }) => {
          return goToNextCell(1)(state, dispatch);
        },

      goToPreviousCell:
        () => ({ state, dispatch }) => {
          return goToNextCell(-1)(state, dispatch);
        },

      fixTables:
        () => ({ state, dispatch }) => {
          if (dispatch) {
            fixTables(state);
          }

          return true;
        },

      setCellSelection:
        (pos) => ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setSelection(CellSelection.create(tr.doc, pos.anchorCell, pos.headCell));
          }

          return true;
        },

        deleteCellAndTableBorders:
          () => ({ chain, state, tr }) => {
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

        generateTable: (annotation, matchingAnnotation, fieldData) => {
          return ({ tr, editor }) => {
            const seenTableRowAnnotationIds = [];
            const { state: { doc, schema } } = editor;
            const { tableRow: RowType, tableCell: CellType, fieldAnnotation: FieldType, paragraph: ParaType } = schema.nodes;

            // Locate the parent row node containing the annotation
            const position = doc.resolve(annotation.pos);
            const rowInfo = findParentNodeClosestToPos(position, (node) => node.type === RowType);
            if (!rowInfo) return;

            // Get all annotations in the row
            rowInfo.node.descendants((node, pos) => {
              if (node.type.name === 'fieldAnnotation') {
                seenTableRowAnnotationIds.push(node.attrs.fieldId);
              }
            });

            if (!seenTableRowAnnotationIds.includes(annotation.node.attrs.fieldId)) return [];

            // Figure out the position where we will start inserting new rows
            const { pos: rowStartPos, node: rowNode } = rowInfo;
            let insertPos = rowStartPos + rowNode.nodeSize;

            // Helper: rebuild a single cell for a given row index
            const rebuildCell = (cellNode, rowIndex) => {
              const updatedBlocks = cellNode.content.content.map((blockNode) => {
                if (blockNode.type !== ParaType) return blockNode;

                // Rebuild paragraphs by mapping inline nodes
                const updatedInlines = blockNode.content.content.map((inlineNode) => {
                  if (inlineNode.type !== FieldType) return inlineNode;

                  // Find the matching field data and compute new attributes
                  const fieldRecord = fieldData.find((f) => f.input_id === inlineNode.attrs.fieldId);
                  const value = fieldRecord?.input_value[rowIndex];

                  // Different field types require different annotation handling
                  // We use the helper here to get the correct attributes
                  // Since generated tables contain annotated fields
                  const extraAttrs = getFieldAttrs(inlineNode, value);
                  return FieldType.create(
                    { ...inlineNode.attrs, ...extraAttrs },
                    inlineNode.content,
                    inlineNode.marks
                  );
                });

                return ParaType.create(blockNode.attrs, Fragment.from(updatedInlines), blockNode.marks);
              });

              return CellType.create(cellNode.attrs, Fragment.from(updatedBlocks), cellNode.marks);
            };

            // Iterate over each row value and build+insert a new row
            matchingAnnotation.input_value.forEach((_, rowIndex) => {
              // Build all cells for the new row
              const newCells = rowNode.content.content.map((cellNode) => rebuildCell(cellNode, rowIndex));
              const newRow = RowType.create(rowNode.attrs, Fragment.from(newCells), rowNode.marks);

              tr.insert(insertPos, Fragment.from(newRow));
              insertPos += newRow.nodeSize;
            });

            // Remove the original (placeholder) row
            tr.delete(rowStartPos, rowStartPos + rowNode.nodeSize);
            return seenTableRowAnnotationIds;
          };
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
      tableRole: callOrGet(getExtensionConfigField(extension, 'tableRole', {
        name: extension.name,
        options: extension.options,
        storage: extension.storage,
      })),
    };
  },
});
