import { describe, expect, it, mock } from 'bun:test';
import { executeSelectionExtractOoxml, type SelectionAdapter } from './selection.js';
import type { SelectionExtractOoxmlInput } from './selection.types.js';

describe('table-cell capture scope', () => {
  const rectangle = {
    kind: 'tableCells',
    tableId: 'table',
    start: { rowIndex: 0, columnIndex: 0 },
    end: { rowIndex: 1, columnIndex: 1 },
  } as const;

  it.each([
    { selectionMode: 'text', isRectangular: true },
    { selectionMode: 'cells', isRectangular: false },
  ])('rejects context that cannot represent whole rectangular cells: %j', (markers) => {
    const extract = mock(() => ({}));
    const adapter = { extractOoxml: extract } as unknown as SelectionAdapter;
    try {
      executeSelectionExtractOoxml(adapter, {
        at: { ...rectangle, ...markers },
      } as unknown as SelectionExtractOoxmlInput);
      throw new Error('Expected INVALID_TARGET');
    } catch (error) {
      expect((error as { code?: string }).code).toBe('INVALID_TARGET');
    }
    expect(extract).not.toHaveBeenCalled();
  });

  it.each([
    ['legacy', rectangle],
    ['explicitly rectangular', { ...rectangle, selectionMode: 'cells', isRectangular: true } as const],
  ] as const)('keeps %s targets usable', (_kind, at) => {
    const extract = mock(() => ({}));
    executeSelectionExtractOoxml({ extractOoxml: extract } as unknown as SelectionAdapter, { at });
    expect(extract).toHaveBeenCalledTimes(1);
  });
});
