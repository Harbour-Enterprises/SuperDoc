import { twipsToPixels, convertSizeToCSS } from '@core/super-converter/helpers.js';
import { Attribute } from '@core/Attribute.js';
import type { Node as PmNode } from 'prosemirror-model';
import type { NodeView, ViewMutationRecord } from 'prosemirror-view';
import type { Editor } from '@core/Editor.js';

type TableNode = PmNode & {
  attrs: Record<string, unknown>;
  firstChild: PmNode | null;
  childCount: number;
  child(index: number): PmNode;
};

/**
 * Source example.
 * https://github.com/ProseMirror/prosemirror-tables/blob/master/src/tableview.ts
 */
export const createTableView = ({ editor }: { editor: Editor }) => {
  return class TableView implements NodeView {
    editor: Editor;
    node: TableNode;
    dom: HTMLElement;
    table: HTMLTableElement;
    colgroup: HTMLTableColElement;
    contentDOM: HTMLElement;
    cellMinWidth: number;

    constructor(node: TableNode, cellMinWidth: number) {
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

      // use `setTimeout` to get cells.
      setTimeout(() => {
        updateTableWrapper(this.dom, this.table);
      }, 0);
    }

    update(node: TableNode, _decorations?: readonly unknown[], _innerDecorations?: unknown) {
      if (node.type !== this.node.type) {
        return false;
      }

      this.node = node;
      updateTable(this.editor, node, this.table);
      updateColumns(node, this.colgroup, this.table, this.cellMinWidth);
      updateTableWrapper(this.dom, this.table);

      return true;
    }

    ignoreMutation(mutation: ViewMutationRecord): boolean {
      if (mutation.type === 'selection') {
        return false;
      }
      const target = mutation.target as Node;
      const tableWrapper = this.dom;
      if (target === tableWrapper && mutation.type === 'attributes' && mutation.attributeName === 'style') {
        return true;
      }

      return mutation.type === 'attributes' && (target === this.table || this.colgroup.contains(target));
    }
  };
};

export function updateColumns(
  node: TableNode,
  colgroup: HTMLTableColElement,
  table: HTMLTableElement,
  _cellMinWidth: number,
) {
  const gridColumns =
    Array.isArray(node.attrs?.grid) && node.attrs.grid.length
      ? node.attrs.grid.map((col: { col: number }) => twipsToPixels(col.col))
      : null;
  const totalColumns = gridColumns?.length ?? null;

  const resolveColumnWidth = (colIndex: number, colwidthValue: unknown) => {
    if (colwidthValue != null) return colwidthValue;
    if (gridColumns && gridColumns[colIndex] != null) return gridColumns[colIndex];
    return null;
  };

  const widths: Array<number | null> = [];
  const firstRow = node.firstChild as PmNode | null;
  let colIndex = 0;

  if (firstRow !== null) {
    for (let i = 0; i < firstRow.childCount; i++) {
      const child = firstRow.child(i);
      const { colspan, colwidth } = child.attrs as { colspan: number; colwidth?: number[] };
      for (let span = 0; span < colspan; span += 1, colIndex += 1) {
        widths.push(resolveColumnWidth(colIndex, colwidth && colwidth[span]) as number | null);
      }
    }
  }

  if (totalColumns != null && colIndex < totalColumns) {
    for (let col = colIndex; col < totalColumns; col += 1) {
      widths.push(resolveColumnWidth(col, null) as number | null);
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

  const tableWidthCSS = convertSizeToCSS(
    node.attrs.tableProperties.tableWidth?.value ?? null,
    node.attrs.tableProperties.tableWidth?.type ?? 'auto',
  );

  let colElement = colgroup.firstChild as HTMLTableColElement | null;
  normalizedWidths.forEach((width) => {
    if (!colElement) {
      colElement = document.createElement('col');
      colgroup.appendChild(colElement);
    }

    colElement.style.width = width !== null && width !== undefined ? `${width}px` : '';
    colElement = colElement.nextSibling as HTMLTableColElement | null;
  });

  while (colElement) {
    const next = colElement.nextSibling as HTMLTableColElement | null;
    colElement.parentNode?.removeChild(colElement);
    colElement = next;
  }

  const tableIndent = convertSizeToCSS(
    node.attrs.tableProperties.tableIndent?.value ?? 0,
    node.attrs.tableProperties.tableIndent?.type ?? 'dxa',
  );
  const firstRowFirstCellPaddingLeftPx =
    (firstRow?.firstChild?.attrs as Record<string, unknown>)?.cellMargins?.left ?? 0;
  const firstRowLastCellPaddingRightPx =
    (firstRow?.lastChild?.attrs as Record<string, unknown>)?.cellMargins?.right ?? 0;

  table.style.marginLeft = `${-firstRowFirstCellPaddingLeftPx}px`;
  if (tableIndent !== null) {
    table.style.marginLeft = tableIndent;
  }

  if (node.attrs.tableProperties.tableWidth?.type === 'pct') {
    const padding = firstRowFirstCellPaddingLeftPx + firstRowLastCellPaddingRightPx;
    table.style.maxWidth = table.style.width = `calc(${tableWidthCSS} + ${padding}px)`;
  } else {
    table.style.maxWidth = table.style.width = tableWidthCSS ?? '';
  }
}

function updateTable(editor: Editor, node: TableNode, table: HTMLTableElement) {
  const allExtensionsAttrs = editor.extensionService.attributes;
  const tableExtensionAttrs = allExtensionsAttrs.filter((e: { type: string }) => e.type === 'table');
  const htmlAttributes = Attribute.getAttributesToRender(node, tableExtensionAttrs);
  Object.entries(htmlAttributes).forEach(([key, value]) => {
    if (key === 'style') {
      table.style.cssText = typeof value === 'string' ? value : '';
    } else {
      table.setAttribute(key, String(value));
    }
  });
}

function updateTableWrapper(tableWrapper: HTMLElement, table: HTMLTableElement | null) {
  const defaultBorderWidth = 1;

  if (!table) {
    return;
  }

  let borderLeftMax = parseFloat(table.style.borderLeftWidth || '0');
  let borderRightMax = parseFloat(table.style.borderRightWidth || '0');

  const firstColumnCells = Array.from(
    table.querySelectorAll<HTMLTableCellElement>(':scope > tbody > tr > td:first-child'),
  );
  const lastColumnCells = Array.from(
    table.querySelectorAll<HTMLTableCellElement>(':scope > tbody > tr > td:last-child'),
  );

  for (const cell of firstColumnCells) {
    const borderLeft = parseFloat(cell.style.borderLeftWidth) || 0;
    borderLeftMax = Math.max(borderLeftMax, borderLeft);
  }
  for (const cell of lastColumnCells) {
    const borderRight = parseFloat(cell.style.borderRightWidth) || 0;
    borderRightMax = Math.max(borderRightMax, borderRight);
  }

  const borderWidth = Math.ceil(Math.max(borderLeftMax, borderRightMax));
  tableWrapper.style.setProperty('--table-border-width', `${borderWidth || defaultBorderWidth}px`);
}
