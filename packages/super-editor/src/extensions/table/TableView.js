import { getColStyleDeclaration } from './tableHelpers/getColStyleDeclaration.js';
import { twipsToPixels, PIXELS_PER_INCH } from '@core/super-converter/helpers.js';
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
      updateColumns(node, this.colgroup, this.table, cellMinWidth, undefined, undefined, this.editor);
      this.contentDOM = this.table.appendChild(document.createElement('tbody'));

      // use `setTimeout` to get cells.
      setTimeout(() => {
        updateTableWrapper(this.dom, this.table);
      }, 0);
    }

    update(node) {
      if (node.type !== this.node.type) {
        return false;
      }

      this.node = node;
      updateTable(this.editor, node, this.table);
      updateColumns(node, this.colgroup, this.table, this.cellMinWidth, undefined, undefined, this.editor);
      updateTableWrapper(this.dom, this.table);

      return true;
    }

    ignoreMutation(mutation) {
      const tableWrapper = this.dom;
      if (mutation.target === tableWrapper && mutation.type === 'attributes' && mutation.attributeName === 'style') {
        return true;
      }

      return (
        mutation.type === 'attributes' && (mutation.target === this.table || this.colgroup.contains(mutation.target))
      );
    }
  };
};

export function updateColumns(node, colgroup, table, cellMinWidth, overrideCol, overrideValue, editor) {
  const gridColumns =
    Array.isArray(node.attrs?.grid) && node.attrs.grid.length
      ? node.attrs.grid.map((col) => twipsToPixels(col.col))
      : null;
  const totalColumns = gridColumns?.length ?? null;

  const pageBody = table.closest('.page__body');
  const wrapper = table.parentElement;
  let availableWidth = pageBody?.getBoundingClientRect?.().width;
  if (!availableWidth && wrapper) {
    availableWidth = wrapper.getBoundingClientRect().width;
  }
  if (typeof availableWidth === 'number' && !Number.isNaN(availableWidth)) {
    availableWidth = Math.max(availableWidth - 2, 0);
  } else {
    availableWidth = null;
  }

  const pageStyles = editor?.converter?.pageStyles;
  if (pageStyles?.pageSize?.width) {
    const toNumber = (v) => (typeof v === 'number' ? v : parseFloat(v) || 0);
    const pageWidth = toNumber(pageStyles.pageSize.width);
    const marginLeft = toNumber(pageStyles.pageMargins?.left);
    const marginRight = toNumber(pageStyles.pageMargins?.right);
    const pageAvailableWidthPx = Math.max((pageWidth - marginLeft - marginRight) * PIXELS_PER_INCH, 0);
    if (pageAvailableWidthPx > 0) {
      availableWidth = availableWidth ? Math.min(availableWidth, pageAvailableWidthPx) : pageAvailableWidthPx;
    }
  }

  const resolveColumnWidth = (colIndex, colwidthValue) => {
    if (overrideCol === colIndex) return overrideValue;
    if (colwidthValue != null) return colwidthValue;
    if (gridColumns && gridColumns[colIndex] != null) return gridColumns[colIndex];
    return null;
  };

  const widths = [];
  const row = node.firstChild;
  let colIndex = 0;

  if (row !== null) {
    for (let i = 0; i < row.childCount; i++) {
      const child = row.child(i);
      const { colspan, colwidth } = child.attrs;
      for (let span = 0; span < colspan; span += 1, colIndex += 1) {
        widths.push(resolveColumnWidth(colIndex, colwidth && colwidth[span]));
      }
    }
  }

  if (totalColumns != null && colIndex < totalColumns) {
    for (let col = colIndex; col < totalColumns; col += 1) {
      widths.push(resolveColumnWidth(col));
    }
  }

  const normalizedWidths = widths.map((widthPx) => {
    const numericWidth = Number(widthPx);
    if (!Number.isFinite(numericWidth)) return null;
    if (numericWidth < 0) return null;
    if (numericWidth === 0) return 0;
    if (numericWidth < 1) return 0;
    return numericWidth;
  });

  const rawTotalWidth = normalizedWidths.reduce((sum, width) => sum + (width != null ? width : cellMinWidth), 0);

  let scale = 1;
  if (availableWidth && rawTotalWidth > 0 && rawTotalWidth > availableWidth) {
    scale = availableWidth / rawTotalWidth;
  }

  let totalWidth = 0;
  let hasUndefinedWidth = false;

  let dom = colgroup.firstChild;
  normalizedWidths.forEach((width) => {
    let scaledWidth = width;
    if (scaledWidth != null) {
      scaledWidth = scaledWidth * scale;
    }

    const [propKey, propVal] = getColStyleDeclaration(cellMinWidth, scaledWidth);

    if (scaledWidth == null) {
      totalWidth += cellMinWidth;
      hasUndefinedWidth = true;
    } else {
      totalWidth += scaledWidth;
    }

    if (!dom) {
      const colElement = document.createElement('col');
      colElement.style.setProperty(propKey, propVal);
      colgroup.appendChild(colElement);
    } else {
      dom.style.setProperty(propKey, propVal);
      dom = dom.nextSibling;
    }
  });

  while (dom) {
    const next = dom.nextSibling;
    dom.parentNode?.removeChild(dom);
    dom = next;
  }

  if (scale < 1 || !hasUndefinedWidth) {
    const clampedWidth = Math.min(totalWidth, availableWidth || totalWidth);
    table.style.width = `${clampedWidth}px`;
    table.style.minWidth = '';
  } else {
    table.style.width = '';
    table.style.minWidth = `${totalWidth}px`;
  }
  table.style.maxWidth = '100%';
}

function updateTable(editor, node, table) {
  const allExtensionsAttrs = editor.extensionService.attributes;
  const tableExtensionAttrs = allExtensionsAttrs.filter((e) => e.type === 'table');
  const htmlAttributes = Attribute.getAttributesToRender(node, tableExtensionAttrs);
  Object.entries(htmlAttributes).forEach(([key, value]) => {
    if (key === 'style') {
      table.style.cssText = value;
    } else {
      table.setAttribute(key, value);
    }
  });
}

function updateTableWrapper(tableWrapper, table) {
  let defaultBorderWidth = 1;
  let borderWidth;

  if (!table) {
    return;
  }

  let borderLeftMax = parseFloat(table.style.borderLeftWidth || 0);
  let borderRightMax = parseFloat(table.style.borderRightWidth) || 0;

  let firstColumnCells = [...table.querySelectorAll(':scope > tbody > tr > td:first-child')];
  let lastColumnCells = [...table.querySelectorAll(':scope > tbody > tr > td:last-child')];

  for (let cell of firstColumnCells) {
    let borderLeft = parseFloat(cell.style.borderLeftWidth) || 0;
    borderLeftMax = Math.max(borderLeftMax, borderLeft);
  }
  for (let cell of lastColumnCells) {
    let borderRight = parseFloat(cell.style.borderRightWidth) || 0;
    borderRightMax = Math.max(borderRightMax, borderRight);
  }

  // for simplicity, we take the maximum value of the borders.
  borderWidth = Math.ceil(Math.max(borderLeftMax, borderRightMax));
  tableWrapper.style.setProperty('--table-border-width', `${borderWidth || defaultBorderWidth}px`);
}
