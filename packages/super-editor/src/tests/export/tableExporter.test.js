import { getExportedResult } from './export-helpers/index.js';
import { twipsToPixels } from '../../core/super-converter/helpers.js';

describe('test table export', async () => {
  const fileName = 'table-merged-cells.docx';
  const result = await getExportedResult(fileName);

  const body = {};

  beforeEach(() => {
    Object.assign(
      body,
      result.elements?.find((el) => el.name === 'w:body'),
    );
  });

  it('correctly gets w:tblGrid', () => {
    const tableGrid = body.elements[0].elements[1].elements;
    const gridCol1 = twipsToPixels(tableGrid[0].attributes['w:w']);
    const gridCol2 = twipsToPixels(tableGrid[1].attributes['w:w']);
    const gridCol3 = twipsToPixels(tableGrid[2].attributes['w:w']);

    expect(gridCol1).toBeCloseTo(94.2, 1);
    expect(gridCol2).toBeCloseTo(330.733, 3);
    expect(gridCol3).toBeCloseTo(176.133, 3);
  });
});
