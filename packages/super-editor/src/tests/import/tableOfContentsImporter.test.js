import { beforeAll, expect } from 'vitest';
import { loadTestDataForEditorTests, initTestEditor } from '@tests/helpers/helpers.js';
import { getExportedResult, getTextFromNode } from '../export/export-helpers/index';
import { getTextFromProseMirrorNode } from './testUtils.test';

describe('Check that we can import toc nodes', () => {
  const filename = 'toc-example-cp.docx';
  let docx, media, mediaFiles, fonts, editor, dispatch, content, exported, body;
  beforeAll(async () => {
    ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(filename));
    ({ editor, dispatch } = initTestEditor({ content: docx, media, mediaFiles, fonts }));
    content = editor.getJSON();
    exported = await getExportedResult(filename);
    body = exported.elements?.find((el) => el.name === 'w:body');
  });

  it('imports expected toc wrapper', async () => {
    const item = content.content[1];

    // Expect TOC wrapper with 4 entries and header 1 instruction
    expect(item.type).toBe('toc-wrapper');
    expect(item.content.length).toBe(4);
    expect(item.attrs.instruction).toBe('TOC \\o 1-1');
    // Expect TOC wrapper entry with instruction
    // Entry 1
    expect(item.content[0].type).toBe('toc-entry');
    expect(item.content[0].attrs.instruction).toBe('PAGEREF _Toc \\h');
    expect(getTextFromProseMirrorNode(item.content[0])).toBe('Section 1');
    // Entry 2
    expect(item.content[1].type).toBe('toc-entry');
    expect(item.content[1].attrs.instruction).toBe('PAGEREF _Toc1 \\h');
    expect(getTextFromProseMirrorNode(item.content[1])).toBe('Section 2');
    // Entry 3
    expect(item.content[2].type).toBe('toc-entry');
    expect(item.content[2].attrs.instruction).toBe('PAGEREF _Toc2 \\h');
    expect(getTextFromProseMirrorNode(item.content[2])).toBe('Section 3');
    // Entry 4
    expect(item.content[3].type).toBe('toc-entry');
    expect(item.content[3].attrs.instruction).toBe('PAGEREF _Toc3 \\h');
    expect(getTextFromProseMirrorNode(item.content[3])).toBe('Section 4');
  });

  // it('imports expected toc entry', async () => {
  //   const item = content.content[3];
  //   expect(item.type).toBe('toc-entry');
  //   expect(item.content[0].type).toBe('paragraph');
  //   expect(item.content[0].content[0].type).toBe('text');
  //   expect(item.content[0].content[0].text).toBe('1');
  // });
});