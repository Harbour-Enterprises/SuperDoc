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
const sanitizeHtmlMock = vi.hoisted(() => vi.fn((html) => ({ innerHTML: html })));

vi.mock('../../InputRule.js', () => ({
  convertEmToPt: convertEmToPtMock,
  sanitizeHtml: sanitizeHtmlMock,
}));

const getNewListIdMock = vi.hoisted(() => vi.fn(() => 300 + getNewListIdMock.mock.calls.length));
const generateNewListDefinitionMock = vi.hoisted(() => vi.fn());

vi.mock('@helpers/list-numbering-helpers.js', () => ({
  ListHelpers: {
    getNewListId: getNewListIdMock,
    generateNewListDefinition: generateNewListDefinitionMock,
  },
}));

const createSingleItemListMock = vi.hoisted(() =>
  vi.fn(({ li, tag, rootNumId }) => {
    const list = li.ownerDocument.createElement(tag);
    const newLi = li.cloneNode(true);
    list.setAttribute('data-list-id', rootNumId);
    list.appendChild(newLi);
    return list;
  }),
);

vi.mock('../html/html-helpers.js', () => ({
  createSingleItemList: createSingleItemListMock,
}));

const getLvlTextMock = vi.hoisted(() => vi.fn(() => '%1.'));

vi.mock('../../helpers/pasteListHelpers.js', () => ({
  getLvlTextForGoogleList: getLvlTextMock,
  googleNumDefMap: new Map([['decimal', 'decimal']]),
}));

import { DOMParser } from 'prosemirror-model';
import { handleGoogleDocsHtml } from './google-docs-paste.js';

describe('handleGoogleDocsHtml', () => {
  beforeEach(() => {
    parseResult = { type: 'doc' };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('merges and flattens Google Docs lists before dispatching', () => {
    const html = `
      <div>
        <ol start="1">
          <li aria-level="1" style="list-style-type: decimal">Item 1</li>
        </ol>
        <ol start="2">
          <li aria-level="1" style="list-style-type: decimal">Item 2</li>
        </ol>
      </div>
    `;

    const dispatch = vi.fn();
    const replaceSelectionWith = vi.fn(() => 'next');
    const editor = {
      schema: {},
      view: { dispatch },
      options: {},
    };
    const view = { state: { tr: { replaceSelectionWith } } };

    const result = handleGoogleDocsHtml(html, editor, view);

    expect(result).toBe(true);
    expect(convertEmToPtMock).toHaveBeenCalledWith(html);
    expect(sanitizeHtmlMock).toHaveBeenCalled();
    expect(getNewListIdMock).toHaveBeenCalled();
    expect(generateNewListDefinitionMock).toHaveBeenCalled();
    expect(createSingleItemListMock).toHaveBeenCalledTimes(2);

    expect(DOMParser.fromSchema).toHaveBeenCalledWith(editor.schema);
    expect(replaceSelectionWith).toHaveBeenCalledWith(parseResult, true);
    expect(dispatch).toHaveBeenCalledWith('next');
  });
});
