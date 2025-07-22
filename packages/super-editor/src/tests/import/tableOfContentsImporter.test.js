import { beforeAll, expect } from 'vitest';
import { loadTestDataForEditorTests, initTestEditor } from '@tests/helpers/helpers.js';
import { getExportedResult, getTextFromNode } from '../export/export-helpers/index';
import { getTextFromProseMirrorNode } from './testUtils.test';

// ---------------------------------------------------------------------------
// Helper utilities for the extended TOC test-suite
// ---------------------------------------------------------------------------

/**
 * Recursively walk a ProseMirror node and return the first node that satisfies the predicate.
 * @param {Object} node – the starting ProseMirror node
 * @param {(n:Object)=>boolean} predicate – matcher
 * @returns {Object|null}
 */
const findNode = (node, predicate) => {
  if (!node) return null;
  if (predicate(node)) return node;
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      const found = findNode(child, predicate);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Determine if a node (or any of its descendants) has a link mark with a given href.
 * @param {Object} node – ProseMirror node
 * @param {string} href – expected href value
 * @returns {boolean}
 */
const nodeContainsLink = (node, href) => {
  return !!findNode(node, (n) => Array.isArray(n.marks) && n.marks.some((m) => m.type === 'link' && m.attrs?.href === href));
};

/**
 * Extract instruction text (`w:instrText`) from a paragraph element in the exported XML.
 * Will return the first matching text value or null.
 * @param {Object} pNode – paragraph xml node ("w:p")
 * @returns {string|null}
 */
const getInstrTextFromParagraph = (pNode) => {
  if (!pNode?.elements) return null;
  for (const r of pNode.elements) {
    if (!r?.elements) continue;
    for (const el of r.elements) {
      if (el.name === 'w:instrText') {
        if (typeof el.text === 'string') return el.text.trim();
        if (el.elements?.length) {
          const txt = el.elements.find((t) => typeof t.text === 'string');
          if (txt) return txt.text.trim();
        }
      }
    }
  }
  return null;
};

/**
 * Locate the first paragraph within the exported document body that contains the
 * supplied keyword inside its instruction text.
 * @param {Object} body – the exported body xml node (from getExportedResult)
 * @param {string} keyword – e.g. "TOC" or "PAGEREF"
 * @returns {Object|undefined}
 */
const findParagraphByInstructionKeyword = (body, keyword) => {
  return body?.elements?.find((el) => el.name === 'w:p' && getInstrTextFromParagraph(el)?.includes(keyword));
};

// ---------------------------------------------------------------------------
// Helper utilities section ends here. Extended tests have been merged into the main TOC describe block below.

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
    const item = content.content[3];

    // Expect TOC wrapper with 4 entries and header 1 instruction
    expect(item.type).toBe('toc-wrapper');
    expect(item.content.length).toBe(4);
    expect(item.attrs.instruction).toBe('TOC \\o 1-1');
    // Expect TOC wrapper entry with instruction
    // Entry 1
    expect(item.content[0].type).toBe('toc-entry');
    expect(item.content[0].attrs.instruction).toBe('PAGEREF _Toc \\h');
    // Check that the entry has the correct structure: title + tab + page number
    expect(item.content[0].content.length).toBe(3);
    expect(item.content[0].content[0].type).toBe('text');
    expect(item.content[0].content[0].text).toBe('Section 1');
    expect(item.content[0].content[1].type).toBe('tab');
    expect(item.content[0].content[2].type).toBe('text');
    expect(item.content[0].content[2].text).toBe('2');
    // Entry 2
    expect(item.content[1].type).toBe('toc-entry');
    expect(item.content[1].attrs.instruction).toBe('PAGEREF _Toc1 \\h');
    expect(item.content[1].content[0].text).toBe('Section 2');
    expect(item.content[1].content[2].text).toBe('2');
    // Entry 3
    expect(item.content[2].type).toBe('toc-entry');
    expect(item.content[2].attrs.instruction).toBe('PAGEREF _Toc2 \\h');
    expect(item.content[2].content[0].text).toBe('Section 3');
    expect(item.content[2].content[2].text).toBe('3');
    // Entry 4
    expect(item.content[3].type).toBe('toc-entry');
    expect(item.content[3].attrs.instruction).toBe('PAGEREF _Toc3 \\h');
    expect(item.content[3].content[0].text).toBe('Section 4');
    expect(item.content[3].content[2].text).toBe('4');
  });

  it('imports expected toc-entry attributes, link marks, tab & page-number nodes', () => {
    const wrapper = content.content[3];
    expect(wrapper.type).toBe('toc-wrapper');

    // All entries should satisfy the following expectations
    wrapper.content.forEach((entry) => {
      // 1. Basic structure & attributes
      expect(entry.type).toBe('toc-entry');
      expect(entry.attrs).toBeDefined();
      expect(entry.attrs.instruction).toMatch(/^PAGEREF/);
      // styleId should exist and typically start with "TOC" (e.g. TOC1, TOC2 …)
      expect(entry.attrs.styleId).toBeDefined();
      if (entry.attrs.styleId) {
        expect(entry.attrs.styleId).toMatch(/TOC/i);
      }

      // 2. Content should have the correct structure: title + tab + page number
      expect(entry.content.length).toBe(3);
      expect(entry.content[0].type).toBe('text'); // Section title
      expect(entry.content[1].type).toBe('tab');  // First tab
      expect(entry.content[2].type).toBe('text'); // Page number
      expect(entry.content[2].text).toMatch(/^\d+$/); // Page number should be numeric

      // 3. All title nodes *and* page number node should carry a link mark that
      //    points to the correct bookmark (derived from the instruction text)
      const bookmarkMatch = entry.attrs.instruction.match(/PAGEREF\s+([^\s\\]+)/i);
      expect(bookmarkMatch).not.toBeNull();
      const bookmark = bookmarkMatch[1];
      const expectedHref = `#${bookmark}`;
      expect(nodeContainsLink(entry, expectedHref)).toBe(true);

      // 4. Basic text sanity check
      expect(entry.content[0].text.length).toBeGreaterThan(0); // Section title should have content
    });
  });

  it('exported document retains TOC wrapper & entry instructions', () => {
    // Wrapper paragraph with TOC instruction
    const wrapperPara = findParagraphByInstructionKeyword(body, 'TOC');
    const wrapperInstr = getInstrTextFromParagraph(wrapperPara);
    expect(wrapperInstr).toBe('TOC \\o 1-1');

    // All PAGEREF paragraphs – we expect exactly 4 entries
    const entryParas = body.elements.filter(
      (el) => el.name === 'w:p' && getInstrTextFromParagraph(el)?.startsWith('PAGEREF'),
    );
    expect(entryParas.length).toBe(4);

    entryParas.forEach((p) => {
      const instr = getInstrTextFromParagraph(p);
      expect(instr).toMatch(/^PAGEREF/);
    });
  });

  // it('imports expected toc entry', async () => {
  //   const item = content.content[3];
  //   expect(item.type).toBe('toc-entry');
  //   expect(item.content[0].type).toBe('paragraph');
  //   expect(item.content[0].content[0].type).toBe('text');
  //   expect(item.content[0].content[0].text).toBe('1');
  // });
});