import type { BrowserDocumentApi, SelectionInfo, SuperDocUI, TableContextInfo } from 'superdoc/ui';

declare const doc: BrowserDocumentApi;
declare const ui: SuperDocUI;

const input: Parameters<BrowserDocumentApi['selection']['current']>[0] = { includeText: true };
const result: Awaited<ReturnType<BrowserDocumentApi['selection']['current']>> = {} as SelectionInfo;
const metadata: SelectionInfo['tableSelection'] = result.tableSelection;
if (metadata) {
  const type: 'table' | 'cell' | 'cells' = metadata.type;
  const kind: 'tableCells' = metadata.kind;
  const tableId: string = metadata.tableId;
  const columnIndex: number = metadata.start.columnIndex;
  const cellIds: string[] = metadata.cells.map((cell) => cell.nodeId);
  const mode: 'text' | 'cells' = metadata.selectionMode;
  const rectangular: boolean = metadata.isRectangular;
  const spans: number[] = metadata.cells.map((cell) => cell.rowspan * cell.colspan);
  // @ts-expect-error Context metadata may be text or nonrectangular and is not an executable rectangle.
  void doc.selection.extractOoxml({ at: metadata });
  if (mode === 'cells' && rectangular) {
    void doc.selection.extractOoxml({
      at: {
        kind: 'tableCells',
        tableId,
        start: metadata.start,
        end: metadata.end,
        story: metadata.story,
        selectionMode: 'cells',
        isRectangular: true,
      },
    });
  }
  void [type, kind, tableId, columnIndex, cellIds, mode, rectangular, spans];
}
const contextMetadata: SelectionInfo['tableSelection'] = ui.viewport.contextAt({ x: 0, y: 0 }).selection.tableSelection;
const freshTableContext: Promise<TableContextInfo> = ui.tables.getContextAsync();
const range = ui.tables.getContext().cellRange;
const status = ui.tables.getContext().status;
void [doc.selection.current(input), contextMetadata, freshTableContext, range, status];
