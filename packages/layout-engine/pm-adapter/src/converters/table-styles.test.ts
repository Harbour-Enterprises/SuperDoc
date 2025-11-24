import { describe, expect, it, beforeEach, vi } from 'vitest';
import { hydrateTableStyleAttrs } from './table-styles.js';
import type { PMNode } from '../types.js';
import * as tblTranslator from '@converter/v3/handlers/w/tbl/tbl-translator.js';

// Mock the external super-converter module that's imported by table-styles.ts
// This module is part of super-editor package and not available in pm-adapter tests
vi.mock('@converter/v3/handlers/w/tbl/tbl-translator.js');

describe('hydrateTableStyleAttrs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hydrates from tableProperties even without converter context', () => {
    const table = {
      attrs: {
        tableProperties: {
          cellMargins: {
            marginLeft: { value: 108, type: 'dxa' },
            top: { value: 12, type: 'px' },
          },
          tableWidth: { value: 1440, type: 'dxa' },
        },
      },
    } as unknown as PMNode;

    const result = hydrateTableStyleAttrs(table, undefined);
    expect(result?.cellPadding?.left).toBeCloseTo((108 / 1440) * 96);
    expect(result?.cellPadding?.top).toBe(12);
    expect(result?.tableWidth).toEqual({ width: 96, type: 'px' });
  });

  it('merges referenced styles when context available', () => {
    vi.mocked(tblTranslator._getReferencedTableStyles).mockReturnValue({
      borders: { top: { val: 'single', size: 8 } },
      cellMargins: { left: { value: 72, type: 'dxa' } },
      justification: 'center',
    });

    const table = {
      attrs: {
        tableStyleId: 'TableGrid',
        tableProperties: {
          tableWidth: { value: 500, type: 'px' },
        },
      },
    } as unknown as PMNode;

    const result = hydrateTableStyleAttrs(table, { docx: {} });
    expect(result?.borders).toEqual({ top: { val: 'single', size: 8 } });
    expect(result?.justification).toBe('center');
    expect(result?.cellPadding?.left).toBeCloseTo((72 / 1440) * 96);
    expect(result?.tableWidth).toEqual({ width: 500, type: 'px' });
  });
});
