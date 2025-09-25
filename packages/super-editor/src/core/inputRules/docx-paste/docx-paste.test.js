import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let parseResult;

const domParserMock = vi.hoisted(() => ({
  fromSchema: vi.fn(() => ({
    parse: vi.fn(() => parseResult),
  })),
}));

vi.mock('prosemirror-model', () => ({
  DOMParser: domParserMock,
}));

const convertEmToPtMock = vi.hoisted(() => vi.fn((html) => html));
const cleanHtmlMock = vi.hoisted(() => vi.fn((html) => html));
const handleHtmlPasteMock = vi.hoisted(() => vi.fn(() => false));

vi.mock('../../InputRule.js', () => ({
  convertEmToPt: convertEmToPtMock,
  cleanHtmlUnnecessaryTags: cleanHtmlMock,
  handleHtmlPaste: handleHtmlPasteMock,
}));

const extractListLevelStylesMock = vi.hoisted(() =>
  vi.fn(() => ({
    'margin-left': '18pt',
    'mso-level-number-format': 'decimal',
    'mso-level-text': '%1.',
  })),
);

const startHelperMock = vi.hoisted(() => vi.fn(() => 1));

vi.mock('@helpers/pasteListHelpers.js', () => ({
  extractListLevelStyles: extractListLevelStylesMock,
  numDefByTypeMap: new Map([['1', 'decimal']]),
  numDefMap: new Map([['decimal', 'decimal']]),
  startHelperMap: new Map([['decimal', startHelperMock]]),
}));

const normalizeLvlTextCharMock = vi.hoisted(() => vi.fn((value) => value || '%1.'));

vi.mock('../../super-converter/v2/importer/listImporter.js', () => ({
  normalizeLvlTextChar: normalizeLvlTextCharMock,
}));

const getNewListIdMock = vi.hoisted(() => vi.fn(() => 100 + getNewListIdMock.mock.calls.length));
const generateNewListDefinitionMock = vi.hoisted(() => vi.fn());

vi.mock('@helpers/list-numbering-helpers.js', () => ({
  ListHelpers: {
    getNewListId: getNewListIdMock,
    generateNewListDefinition: generateNewListDefinitionMock,
  },
}));

import { DOMParser } from 'prosemirror-model';
import { handleDocxPaste } from './docx-paste.js';

describe('handleDocxPaste', () => {
  beforeEach(() => {
    parseResult = { type: 'doc' };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to handleHtmlPaste when converter is missing', () => {
    const editor = { converter: null };
    const view = {};
    const html = '<p>plain</p>';

    handleDocxPaste(html, editor, view);

    expect(handleHtmlPasteMock).toHaveBeenCalledWith(html, editor);
  });

  it('parses DOCX-specific markup and dispatches the parsed document', () => {
    const html = `
      <html>
        <head>
          <style>
            p { margin-left: 20pt; }
          </style>
        </head>
        <body>
          <ol type="1" start="1">
            <li style="mso-list:l0 level1 lfo1">First item</li>
          </ol>
          <p style="mso-list:l0 level1 lfo1">
            <!--[if !supportLists]--><span style="font-family:Arial;font-size:12pt">1.</span><!--[endif]-->
            Second item
          </p>
        </body>
      </html>
    `;

    const dispatch = vi.fn();
    const replaceSelectionWith = vi.fn(() => 'next-tr');
    const editor = {
      schema: {},
      converter: { convertedXml: '<xml />' },
      view: { dispatch },
    };
    const view = { state: { tr: { replaceSelectionWith } } };

    const result = handleDocxPaste(html, editor, view);

    expect(result).toBe(true);
    expect(convertEmToPtMock).toHaveBeenCalledWith(html);
    expect(cleanHtmlMock).toHaveBeenCalled();

    expect(extractListLevelStylesMock).toHaveBeenCalled();
    expect(getNewListIdMock).toHaveBeenCalled();
    expect(generateNewListDefinitionMock).toHaveBeenCalled();

    expect(DOMParser.fromSchema).toHaveBeenCalledWith(editor.schema);
    expect(replaceSelectionWith).toHaveBeenCalledWith(parseResult, true);
    expect(dispatch).toHaveBeenCalledWith('next-tr');
  });
});
