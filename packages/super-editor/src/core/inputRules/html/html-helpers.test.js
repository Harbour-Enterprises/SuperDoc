import { describe, it, expect, beforeEach, vi } from 'vitest';

let listIdCounter = 0;

const getNewListIdMock = vi.hoisted(() => vi.fn(() => ++listIdCounter));
const generateNewListDefinitionMock = vi.hoisted(() => vi.fn());
const getListDefinitionDetailsMock = vi.hoisted(() => vi.fn(() => ({ listNumberingType: 'decimal', lvlText: '%1.' })));

vi.mock('@helpers/list-numbering-helpers.js', () => ({
  ListHelpers: {
    getNewListId: getNewListIdMock,
    generateNewListDefinition: generateNewListDefinitionMock,
    getListDefinitionDetails: getListDefinitionDetailsMock,
  },
}));

import { flattenListsInHtml, createSingleItemList, unflattenListsInHtml } from './html-helpers.js';

describe('html list helpers', () => {
  const editor = { options: {}, converter: {} };

  beforeEach(() => {
    listIdCounter = 0;
    getNewListIdMock.mockClear();
    generateNewListDefinitionMock.mockClear();
    getListDefinitionDetailsMock.mockClear();
  });

  it('flattens multi-item lists so each list has a single item', () => {
    const html = '<ul><li>One</li><li>Two</li></ul>';

    const flattened = flattenListsInHtml(html, editor);
    const parsed = new DOMParser().parseFromString(`<body>${flattened}</body>`, 'text/html');
    const lists = parsed.querySelectorAll('ul[data-list-id]');

    expect(lists.length).toBe(2);
    lists.forEach((list) => {
      expect(list.querySelectorAll('li').length).toBe(1);
    });
    expect(generateNewListDefinitionMock).toHaveBeenCalled();
  });

  it('creates a single-item list with numbering metadata', () => {
    const doc = new DOMParser().parseFromString('<li style="color:red">Solo</li>', 'text/html');
    const li = doc.body.firstElementChild;

    const list = createSingleItemList({
      li,
      tag: 'ol',
      rootNumId: '42',
      level: 0,
      editor,
      NodeInterface: window.Node,
    });

    const listItem = list.querySelector('li');
    expect(list.tagName).toBe('OL');
    expect(list.getAttribute('data-list-id')).toBe('42');
    expect(listItem.getAttribute('data-num-id')).toBe('42');
    expect(listItem.getAttribute('data-num-fmt')).toBe('decimal');
    expect(listItem.getAttribute('data-lvl-text')).toBe('%1.');
    expect(listItem.querySelector('p')).not.toBeNull();
  });

  it('reconstructs nested lists from flattened markup', () => {
    const flattenedHtml = `
      <ol data-list-id="7">
        <li data-level="0" data-num-fmt="decimal" data-list-level="[1]">Item 1</li>
      </ol>
      <ol data-list-id="7">
        <li data-level="0" data-num-fmt="decimal" data-list-level="[2]">Item 2</li>
      </ol>
    `;

    const reconstructed = unflattenListsInHtml(flattenedHtml);
    const parsed = new DOMParser().parseFromString(`<body>${reconstructed}</body>`, 'text/html');
    const list = parsed.querySelector('ol');

    expect(list).not.toBeNull();
    const items = list.querySelectorAll('li');
    expect(items.length).toBe(2);
    items.forEach((item) => {
      expect(item.hasAttribute('data-num-id')).toBe(false);
      expect(item.textContent.trim()).toMatch(/Item/);
    });
  });
});
