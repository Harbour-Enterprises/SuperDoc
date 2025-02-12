import { getColStyleDeclaration } from './tableHelpers/getColStyleDeclaration.js';
import { Attribute } from '@core/Attribute.js';

/**
 * Source example.
 * https://github.com/ProseMirror/prosemirror-tables/blob/master/src/tableview.ts
 */
export const createTableView = ({ editor }) => {

  return class TableView {
    editor;

    node;

    dom;

    table;

    colgroup;

    contentDOM;

    cellMinWidth;

    constructor(node, cellMinWidth) {
      this.editor = editor;
      this.node = node;
      this.cellMinWidth = cellMinWidth;
      this.dom = document.createElement('div');
      this.dom.className = 'tableWrapper';
      this.table = this.dom.appendChild(document.createElement('table'));
      this.colgroup = this.table.appendChild(document.createElement('colgroup'));
      updateTable(this.editor, this.node, this.table);
      updateColumns(node, this.colgroup, this.table, cellMinWidth);
      this.contentDOM = this.table.appendChild(document.createElement('tbody'));
    }

    update(node) {
      if (node.type !== this.node.type) {
        return false;
      }

      this.node = node;
      updateTable(this.editor, node, this.table);
      updateColumns(node, this.colgroup, this.table, this.cellMinWidth);

      return true;
    }

    ignoreMutation(mutation) {
      return (
        mutation.type === 'attributes'
        && (mutation.target === this.table || this.colgroup.contains(mutation.target))
      );
    }
  }
}

export function updateColumns(
  node,
  colgroup,
  table,
  cellMinWidth,
  overrideCol,
  overrideValue,
) {
  let totalWidth = 0;
  let fixedWidth = true;
  let nextDOM = colgroup.firstChild;
  const row = node.firstChild;

  // if (!row) return;

  if (row !== null) {
    for (let i = 0, col = 0; i < row.childCount; i++) {
      const { colspan, colwidth } = row.child(i).attrs;
      
      for (let j = 0; j < colspan; j++, col++) {
        const hasWidth = overrideCol === col ? overrideValue : (colwidth && colwidth[j]);
        const cssWidth = hasWidth ? `${hasWidth}px` : '';
        totalWidth += hasWidth || cellMinWidth;
        if (!hasWidth) fixedWidth = false;

        if (!nextDOM) {
          const col = document.createElement('col')
          const [propKey, propVal] = getColStyleDeclaration(cellMinWidth, hasWidth);
          col.style.setProperty(propKey, propVal);
          colgroup.appendChild(col);
        } else {
          if (nextDOM.style.width !== cssWidth) {
            const [propKey, propVal] = getColStyleDeclaration(cellMinWidth, hasWidth);
            nextDOM.style.setProperty(propKey, propVal);
          }

          nextDOM = nextDOM.nextSibling;
        }
      }
    }
  }

  while (nextDOM) {
    const after = nextDOM.nextSibling;
    nextDOM.parentNode?.removeChild(nextDOM);
    nextDOM = after;
  }

  if (fixedWidth) {
    table.style.width = `${totalWidth}px`;
    table.style.minWidth = '';
  } else {
    table.style.width = '';
    table.style.minWidth = `${totalWidth}px`;
  }
}

function updateTable(editor, node, table) {
  const allExtensionsAttrs = editor.extensionService.attributes;
  const tableExtensionAttrs = allExtensionsAttrs.filter((e) => e.type === 'table');
  const htmlAttributes = Attribute.getAttributesToRender(node, tableExtensionAttrs);
  Object.entries(htmlAttributes).forEach(([key, value]) => {
    table.setAttribute(key, value);
  });
}
