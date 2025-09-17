import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { initTestEditor } from '@tests/helpers/helpers.js';
import { orderedListMarker } from './orderedListMarkerPlugin.js';
import { orderedListSync, randomId } from './orderedListSyncPlugin.js';

vi.mock('@core/super-converter/v2/importer/listImporter.js', () => ({
  docxNumberigHelpers: {
    generateListPath: vi.fn(() => [1]),
  },
}));

vi.mock('@helpers/list-numbering-helpers.js', () => ({
  ListHelpers: {
    getListDefinitionDetails: vi.fn(() => ({
      lvlText: '%1.',
      customFormat: null,
      listNumberingType: 'decimal',
      start: 1,
    })),
  },
}));

vi.mock('@extensions/list-item/ListItemNodeView.js', () => ({
  refreshAllListItemNodeViews: vi.fn(),
}));

describe('ordered list helpers', () => {
  let schema;

  beforeEach(() => {
    const { editor } = initTestEditor({ mode: 'text', content: '<p></p>' });
    schema = editor.schema;
    editor.destroy();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const buildListDoc = (listAttrs, itemAttrs) => {
    const paragraph = (text) => schema.nodes.paragraph.create(null, schema.text(text));
    const listItems = itemAttrs.map((attrs, index) =>
      schema.nodes.listItem.create(attrs, paragraph(`Item ${index + 1}`)),
    );
    const list = schema.nodes.orderedList.create(listAttrs, listItems);
    return schema.nodes.doc.create(null, [list]);
  };

  it('orderedListMarker corrects list item marker attributes', () => {
    const listAttrs = { listId: 'list-1' };
    const doc = buildListDoc(listAttrs, [
      {
        lvlText: '%1.',
        listLevel: [1],
        listNumberingType: 'decimal',
        listId: 'list-1',
      },
      {
        // Incorrect numbering attributes that should be normalised
        lvlText: '%1.',
        listLevel: [1],
        listNumberingType: 'decimal',
        listId: 'list-1',
      },
    ]);

    const oldDoc = schema.nodes.doc.create(null, [schema.nodes.paragraph.create()]);
    const oldState = EditorState.create({ schema, doc: oldDoc });
    const newState = EditorState.create({ schema, doc });

    const plugin = orderedListMarker();
    const trStub = { docChanged: true, getMeta: () => undefined };

    const resultTr = plugin.spec.appendTransaction([trStub], oldState, newState);
    expect(resultTr).toBeDefined();

    const patchedState = newState.apply(resultTr);
    const attrs = [];
    patchedState.doc.descendants((node) => {
      if (node.type.name === 'listItem') {
        attrs.push(node.attrs.listLevel);
      }
    });
    expect(attrs).toEqual([[1], [2]]);
  });

  it('orderedListSync initialises numbering and updates list items', () => {
    const editorStub = {
      converter: { convertedXml: {} },
    };
    const plugin = orderedListSync(editorStub);

    const doc = buildListDoc({ listId: '1' }, [
      { level: '0', numId: '1', listId: '1' },
      { level: '0', numId: '1', listId: '1' },
    ]);
    const paragraphDoc = schema.nodes.doc.create(null, [schema.nodes.paragraph.create()]);
    const oldState = EditorState.create({ schema, doc: paragraphDoc });
    const newState = EditorState.create({ schema, doc });

    const tx = {
      docChanged: true,
      getMeta: () => undefined,
      steps: [
        {
          toJSON: () => ({ slice: { content: [{ type: 'listItem' }] } }),
        },
      ],
    };

    const resultTr = plugin.spec.appendTransaction([tx], oldState, newState);
    expect(resultTr).toBeDefined();
    expect(resultTr.getMeta('orderedListSync')).toBe(true);

    const patchedState = newState.apply(resultTr);
    const attrs = [];
    patchedState.doc.descendants((node) => {
      if (node.type.name === 'listItem') {
        attrs.push({ listLevel: node.attrs.listLevel, lvlText: node.attrs.lvlText });
      }
    });
    expect(attrs[0].listLevel).toEqual([1]);
    expect(attrs[1].listLevel).toEqual([2]);
    expect(attrs[0].lvlText).toBe('%1.');
  });

  it('randomId returns a hexadecimal string', () => {
    const id = randomId();
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^[0-9a-f]+$/i);
  });
});
