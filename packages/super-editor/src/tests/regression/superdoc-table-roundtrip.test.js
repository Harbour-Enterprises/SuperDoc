import { describe, it, expect, beforeAll } from 'vitest';
import { loadTestDataForEditorTests, initTestEditor } from '@tests/helpers/helpers.js';
import { getExportedResult } from '@tests/export/export-helpers/index.js';

const TEST_DOC = 'superdoc_table_tester.docx';

describe('superdoc_table_tester import/export', () => {
  let editor;
  let documentJson;

  beforeAll(async () => {
    const { docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(TEST_DOC);
    ({ editor } = initTestEditor({ content: docx, media, mediaFiles, fonts }));
    documentJson = editor.getJSON();
  });

  it('imports table style cell margins without injecting paragraph spacing', () => {
    const tableNode = documentJson.content.find((node) => node.type === 'table');
    expect(tableNode).toBeDefined();

    const { tableProperties } = tableNode.attrs;
    expect(tableProperties?.cellMargins).toEqual({
      marginLeft: { value: 108, type: 'dxa' },
      marginRight: { value: 108, type: 'dxa' },
      marginTop: { value: 0, type: 'dxa' },
      marginBottom: { value: 0, type: 'dxa' },
    });

    const firstCell = tableNode.content[0].content[0];
    expect(firstCell.attrs.cellMargins.left).toBeCloseTo(7.2, 2);
    expect(firstCell.attrs.cellMargins.right).toBeCloseTo(7.2, 2);

    const paragraph = firstCell.content.find((child) => child.type === 'paragraph');
    expect(paragraph).toBeDefined();
    expect(paragraph.attrs.spacing).toEqual({
      line: null,
      lineRule: 'auto',
      after: null,
      before: null,
    });
  });

  it('round-trips table margins and omits spacing when exporting', async () => {
    const exportResult = await getExportedResult(TEST_DOC);
    const body = exportResult.elements.find((el) => el.name === 'w:body');
    const tbl = body?.elements?.find((el) => el.name === 'w:tbl');
    expect(tbl).toBeDefined();

    const tblPr = tbl.elements.find((el) => el.name === 'w:tblPr');
    const tblCellMar = tblPr?.elements?.find((el) => el.name === 'w:tblCellMar');
    expect(tblCellMar).toBeDefined();

    const tblLeft = tblCellMar.elements.find((el) => el.name === 'w:left');
    const tblRight = tblCellMar.elements.find((el) => el.name === 'w:right');
    expect(Number(tblLeft?.attributes?.['w:w'])).toBe(108);
    expect(Number(tblRight?.attributes?.['w:w'])).toBe(108);

    const firstTr = tbl.elements.find((el) => el.name === 'w:tr');
    const firstTc = firstTr?.elements?.find((el) => el.name === 'w:tc');
    const tcPr = firstTc?.elements?.find((el) => el.name === 'w:tcPr');
    const tcMar = tcPr?.elements?.find((el) => el.name === 'w:tcMar');
    expect(tcMar).toBeDefined();

    const tcLeft = tcMar.elements.find((el) => el.name === 'w:left');
    const tcRight = tcMar.elements.find((el) => el.name === 'w:right');
    expect(Number(tcLeft?.attributes?.['w:w'])).toBe(108);
    expect(Number(tcRight?.attributes?.['w:w'])).toBe(108);

    const firstParagraph = firstTc?.elements?.find((el) => el.name === 'w:p');
    const pPr = firstParagraph?.elements?.find((el) => el.name === 'w:pPr');
    const spacing = pPr?.elements?.find((el) => el.name === 'w:spacing');
    expect(spacing).toBeUndefined();
  });
});
