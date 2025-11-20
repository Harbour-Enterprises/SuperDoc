import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock children translation to keep tests focused on this module
vi.mock('@converter/v2/exporter/helpers/index', () => ({
  translateChildNodes: vi.fn(() => [{ name: 'w:p', elements: [] }]),
}));

import { pixelsToTwips, pixelsToEightPoints, twipsToPixels } from '@converter/helpers.js';
import { translateTableCell, generateTableCellProperties } from './translate-table-cell.js';

describe('translate-table-cell helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generateTableCellProperties builds tcPr with width, span, bg, margins, vAlign, vMerge, and borders', () => {
    const node = {
      attrs: {
        colwidth: [100, 50],
        widthUnit: 'px',
        cellWidthType: 'dxa',
        background: { color: '#FF00FF' },
        colspan: 2,
        rowspan: 3,
        cellMargins: { top: 96, right: 48, bottom: 0, left: 24 },
        verticalAlign: 'center',
        borders: {
          top: { color: '#FF0000', size: 2, space: 1 },
          bottom: { val: 'none' },
        },
      },
    };

    const tcPr = generateTableCellProperties(node);
    expect(tcPr.name).toBe('w:tcPr');

    const byName = Object.fromEntries(tcPr.elements.map((e) => [e.name, e]));

    // tcW
    expect(byName['w:tcW'].attributes['w:w']).toBe(String(pixelsToTwips(150)));
    expect(byName['w:tcW'].attributes['w:type']).toBe('dxa');

    // gridSpan
    expect(byName['w:gridSpan'].attributes['w:val']).toBe('2');

    // background
    expect(byName['w:shd'].attributes['w:fill']).toBe('#FF00FF');

    // tcMar
    const mar = byName['w:tcMar'];

    expect(Array.isArray(mar.elements)).toBe(true);
    const marMap = Object.fromEntries(mar.elements.map((e) => [e.name, e.attributes['w:w']]));
    expect(marMap['w:top']).toBe(String(pixelsToTwips(96)));
    expect(marMap['w:right']).toBe(String(pixelsToTwips(48)));
    expect(marMap['w:bottom']).toBe(String(pixelsToTwips(0)));
    expect(marMap['w:left']).toBe(String(pixelsToTwips(24)));

    // vAlign
    expect(byName['w:vAlign'].attributes['w:val']).toBe('center');

    // vMerge for start of a vertical merge
    expect(byName['w:vMerge'].attributes['w:val']).toBe('restart');

    // borders
    const borders = byName['w:tcBorders'];
    const bMap = Object.fromEntries(borders.elements.map((e) => [e.name, e]));
    expect(bMap['w:top'].attributes).toMatchObject({
      'w:val': 'single',
      'w:color': 'FF0000',
      'w:sz': String(pixelsToEightPoints(2)),
      'w:space': '1',
    });
    expect(bMap['w:bottom'].attributes['w:val']).toBe('nil');
  });

  it('generateTableCellProperties adds continuation vMerge when continueMerge is set', () => {
    const node = { attrs: { colwidth: [10], widthUnit: 'px', continueMerge: true } };
    const tcPr = generateTableCellProperties(node);
    const vMerge = tcPr.elements.find((e) => e.name === 'w:vMerge');
    expect(vMerge).toBeTruthy();
    expect(vMerge.attributes).toEqual({ 'w:val': 'continue' });
  });

  it('translateTableCell wraps children with tcPr as the first element', async () => {
    const params = {
      node: { attrs: { colwidth: [60], widthUnit: 'px' } },
      children: [],
    };

    const out = translateTableCell(params);
    expect(out.name).toBe('w:tc');
    expect(Array.isArray(out.elements)).toBe(true);
    expect(out.elements[0].name).toBe('w:tcPr');
    // mocked child from translateChildNodes
    expect(out.elements[1]).toMatchObject({ name: 'w:p' });
  });
});
