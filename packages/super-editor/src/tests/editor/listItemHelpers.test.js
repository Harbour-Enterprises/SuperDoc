import { loadTestDataForEditorTests, initTestEditor } from '@tests/helpers/helpers.js';
import { getVisibleIndent } from '@extensions/list-item/ListItemNodeView.js';
import { getListItemStyleDefinitions } from '@helpers/list-numbering-helpers.js';
import { expect } from 'vitest';
import { getNumberingCache } from '@core/super-converter/v2/importer/numberingCache.js';

describe(' test list item rendering indents from styles', () => {
  const filename = 'base-custom.docx';
  let docx, media, mediaFiles, fonts, editor;
  beforeAll(async () => ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(filename)));
  beforeEach(() => ({ editor } = initTestEditor({ content: docx, media, mediaFiles, fonts })));

  // Global so we can access it in the tests
  let stylePpr, numDefPpr;

  it('[getListItemStyleDefinitions] can import the list item style definitions []', () => {
    const numId = 1;
    const level = 1;
    const { stylePpr: stylePprResult, numDefPpr: numDefPprResult } = getListItemStyleDefinitions({
      styleId: 'ListParagraph',
      numId,
      level,
      editor,
    });

    stylePpr = stylePprResult;
    numDefPpr = numDefPprResult;

    // Check the style definitions for indent
    expect(stylePpr).toBeDefined();
    const indentTag = stylePpr.elements.find((el) => el.name === 'w:ind');
    expect(indentTag).toBeDefined();
    const indentLeft = indentTag.attributes['w:left'];
    expect(indentLeft).toBe('720');
    expect(indentTag.attributes['w:hanging']).toBeUndefined();
    expect(indentTag.attributes['w:firstLine']).toBeUndefined();
    expect(indentTag.attributes['w:right']).toBeUndefined();

    // Check the numDef for indent
    expect(numDefPpr).toBeDefined();
    const numDefIndentTag = numDefPpr.elements.find((el) => el.name === 'w:ind');
    expect(numDefIndentTag).toBeDefined();
    const numDefIndentLeft = numDefIndentTag.attributes['w:left'];
    const numDefIndentHanging = numDefIndentTag.attributes['w:hanging'];
    expect(numDefIndentLeft).toBe('1440');
    expect(numDefIndentHanging).toBe('360');
    expect(numDefIndentTag.attributes['w:firstLine']).toBeUndefined();
    expect(numDefIndentTag.attributes['w:right']).toBeUndefined();

    const cache = getNumberingCache(editor.converter);
    expect(cache).toBeDefined();
    expect(cache.numToDefinition).toBeDefined();
    expect(cache.numToDefinition.size).toBeGreaterThan(0);

    getListItemStyleDefinitions({
      styleId: 'ListParagraph',
      numId,
      level,
      editor,
    });
    expect(getNumberingCache(editor.converter)).toBe(cache);
  });

  it('[getListItemStyleDefinitions] returns empty definitions when numbering data is unavailable', () => {
    const result = getListItemStyleDefinitions({
      styleId: 'ListParagraph',
      numId: 1,
      level: 0,
      editor: { converter: {} },
    });

    expect(result).toEqual({});
  });

  it('[getListItemStyleDefinitions] falls back to converter.numbering when docx XML is missing', () => {
    const numbering = {
      definitions: {
        1: {
          elements: [{ name: 'w:abstractNumId', attributes: { 'w:val': '10' } }],
        },
      },
      abstracts: {
        10: {
          elements: [
            {
              name: 'w:lvl',
              attributes: { 'w:ilvl': '0' },
              elements: [
                {
                  name: 'w:pPr',
                  elements: [
                    {
                      name: 'w:ind',
                      attributes: { 'w:left': '720', 'w:hanging': '360' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };

    const result = getListItemStyleDefinitions({
      styleId: undefined,
      numId: 1,
      level: 0,
      editor: { converter: { numbering } },
    });

    expect(result.numDefPpr?.elements?.[0]?.name).toBe('w:ind');
    expect(result.numDefPpr?.elements?.[0]?.attributes?.['w:left']).toBe('720');
  });

  it('[getVisibleIndent] derives non-zero values for imported list items', () => {
    let listItemNode = null;
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'listItem' && !listItemNode) {
        listItemNode = node;
        return false;
      }
      return true;
    });
    expect(listItemNode).toBeTruthy();
    const defs = getListItemStyleDefinitions({
      styleId: listItemNode.attrs.styleId,
      numId: listItemNode.attrs.numId,
      level: listItemNode.attrs.level,
      editor,
    });
    const visibleIndent = getVisibleIndent(defs.stylePpr, defs.numDefPpr, listItemNode.attrs.indent);
    expect(visibleIndent.left).toBeGreaterThan(0);
    expect(visibleIndent.hanging).toBeGreaterThan(0);
  });

  it('[getVisibleIndent] can calculate visible indent', () => {
    const visibleIndent = getVisibleIndent(stylePpr, numDefPpr);
    expect(visibleIndent).toBeDefined();
    expect(visibleIndent.left).toBe(96);
    expect(visibleIndent.hanging).toBe(24);
    expect(visibleIndent.right).toBeUndefined();
  });
});

describe('list helpers in blank editor state', () => {
  it('provides base numbering definitions without imported docx', () => {
    const { editor } = initTestEditor();
    const numbering = editor.converter.numbering || {};
    expect(Object.keys(numbering.definitions || {})).not.toHaveLength(0);
    expect(Object.keys(numbering.abstracts || {})).not.toHaveLength(0);
    editor.destroy();
  });
});
