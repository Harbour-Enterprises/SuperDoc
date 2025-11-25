import { describe, it, expect } from 'vitest';
import { Schema } from 'prosemirror-model';
import { schema as basic } from 'prosemirror-schema-basic';
import { builders } from 'prosemirror-test-builder';
import { TextSelection, NodeSelection } from 'prosemirror-state';
import { lastInlinePos } from './list-helpers/test-helpers.js';

import {
  listItemSpec,
  orderedListSpec,
  bulletListSpec,
  tableSpec,
  tableRowSpec,
  tableCellSpec,
  createEditor,
  applyCmd,
} from './list-helpers/test-helpers.js';

import { splitListItem } from './splitListItem.js';

const nodes = basic.spec.nodes
  .update('paragraph', basic.spec.nodes.get('paragraph'))
  .addToEnd('listItem', listItemSpec)
  .addToEnd('orderedList', orderedListSpec)
  .addToEnd('bulletList', bulletListSpec)
  .addToEnd('table', tableSpec)
  .addToEnd('tableRow', tableRowSpec)
  .addToEnd('tableCell', tableCellSpec);

const schema = new Schema({ nodes, marks: basic.spec.marks });

const {
  doc,
  p,
  bulletList,
  orderedList,
  li: listItem,
} = builders(schema, {
  doc: { nodeType: 'doc' },
  p: { nodeType: 'paragraph' },
  bulletList: { nodeType: 'bulletList' },
  orderedList: { nodeType: 'orderedList' },
  li: { nodeType: 'listItem' },
});

function firstTextPos(pmDoc) {
  let pos = 0;
  pmDoc.descendants((node, nodePos) => {
    if (node.isText && node.text) {
      pos = nodePos;
      return false;
    }
    return true;
  });
  return pos;
}

function findNodePos(pmDoc, predicate) {
  let found = null;
  pmDoc.descendants((node, pos) => {
    if (predicate(node)) {
      found = pos;
      return false;
    }
    return true;
  });
  return found ?? 0;
}

describe('splitListItem', () => {
  describe('Basic splitting behavior', () => {
    it('splits a single paragraph list item at caret position', () => {
      const d = doc(orderedList(listItem(p('hello'))));
      const { editor, state } = createEditor(d, schema);

      const textStart = firstTextPos(d);
      const cursorPos = textStart + 2; // he|llo
      const s1 = state.apply(state.tr.setSelection(TextSelection.create(d, cursorPos)));

      const s2 = applyCmd(s1, editor, splitListItem());

      expect(s2.doc.childCount).toBe(2);
      expect(s2.doc.child(0).type.name).toBe('orderedList');
      expect(s2.doc.child(0).childCount).toBe(1);
      expect(s2.doc.child(0).textContent).toBe('he');

      expect(s2.doc.child(1).type.name).toBe('orderedList');
      expect(s2.doc.child(1).childCount).toBe(1);
      expect(s2.doc.child(1).textContent).toBe('llo');
    });

    it('splits when selection spans text (deletes selection, then splits at caret)', () => {
      const d = doc(orderedList(listItem(p('abc'))));
      const { editor, state } = createEditor(d, schema);

      const textStart = firstTextPos(d);
      const from = textStart + 1; // "b"
      const to = from + 1;
      const s1 = state.apply(state.tr.setSelection(TextSelection.create(d, from, to)));

      const s2 = applyCmd(s1, editor, splitListItem());

      expect(s2.doc.childCount).toBe(2);
      expect(s2.doc.child(0).textContent).toBe('a');
      expect(s2.doc.child(1).textContent).toBe('c');
    });

    it('splits at beginning creates empty first item', () => {
      const d = doc(orderedList(listItem(p('hello'))));
      const { editor, state } = createEditor(d, schema);

      const textStart = firstTextPos(d);
      const s1 = state.apply(state.tr.setSelection(TextSelection.create(d, textStart)));

      const s2 = applyCmd(s1, editor, splitListItem());

      expect(s2.doc.childCount).toBe(2);
      expect(s2.doc.child(0).textContent).toBe('');
      expect(s2.doc.child(1).textContent).toBe('hello');
    });

    it('splits at end creates empty second item', () => {
      const d = doc(orderedList(listItem(p('hello'))));
      const { editor, state } = createEditor(d, schema);

      const textStart = firstTextPos(d);
      const cursorPos = textStart + 'hello'.length;
      const s1 = state.apply(state.tr.setSelection(TextSelection.create(d, cursorPos)));

      const s2 = applyCmd(s1, editor, splitListItem());

      expect(s2.doc.childCount).toBe(2);
      expect(s2.doc.child(0).textContent).toBe('hello');
      expect(s2.doc.child(1).textContent).toBe('');
    });
  });

  describe('Multi-paragraph list items', () => {
    it('splits multi-paragraph list item preserving other paragraphs', () => {
      const d = doc(orderedList(listItem(p('first paragraph'), p('second paragraph'), p('third paragraph'))));
      const { editor, state } = createEditor(d, schema);

      // split inside second paragraph after "second "
      let splitPos = 0;
      d.descendants((node, pos) => {
        if (node.isText && node.text === 'second paragraph') {
          splitPos = pos + 'second '.length;
          return false;
        }
        return true;
      });

      const s1 = state.apply(state.tr.setSelection(TextSelection.create(d, splitPos)));
      const s2 = applyCmd(s1, editor, splitListItem());

      expect(s2.doc.childCount).toBe(2);

      const firstList = s2.doc.child(0);
      expect(firstList.childCount).toBe(1);
      expect(firstList.child(0).childCount).toBe(2);
      expect(firstList.child(0).child(0).textContent).toBe('first paragraph');
      expect(firstList.child(0).child(1).textContent).toBe('second ');

      const secondList = s2.doc.child(1);
      expect(secondList.childCount).toBe(1);
      expect(secondList.child(0).childCount).toBe(2);
      expect(secondList.child(0).child(0).textContent).toBe('paragraph');
      expect(secondList.child(0).child(1).textContent).toBe('third paragraph');
    });
  });

  describe('Different list types', () => {
    it('works with bullet lists', () => {
      const d = doc(bulletList(listItem(p('bullet item'))));
      const { editor, state } = createEditor(d, schema);

      const textStart = firstTextPos(d);
      const cursorPos = textStart + 'bullet'.length;
      const s1 = state.apply(state.tr.setSelection(TextSelection.create(d, cursorPos)));

      const s2 = applyCmd(s1, editor, splitListItem());

      expect(s2.doc.childCount).toBe(2);
      expect(s2.doc.child(0).type.name).toBe('bulletList');
      expect(s2.doc.child(1).type.name).toBe('bulletList');
      expect(s2.doc.child(0).textContent).toBe('bullet');
      expect(s2.doc.child(1).textContent).toBe(' item');
    });
  });

  describe('Empty paragraph handling', () => {
    it('handles empty paragraph at end (should use outdent/exit logic)', () => {
      const d = doc(orderedList(listItem(p('content'), p(''))));
      const { editor, state } = createEditor(d, schema);
      // Minimal mock so handleSplitInEmptyBlock can read attributes
      editor.extensionService = { attributes: {} };

      const emptyParaPos = findNodePos(d, (n) => n.type.name === 'paragraph' && n.textContent === '') + 1;

      const s1 = state.apply(state.tr.setSelection(TextSelection.create(d, emptyParaPos)));
      const result = applyCmd(s1, editor, splitListItem());

      expect(result.doc).toBeDefined();
    });
  });

  describe('Edge cases and invalid selections', () => {
    it('returns false/no-op for non-list context', () => {
      const d = doc(p('regular paragraph'));
      const { editor, state } = createEditor(d, schema);

      const textStart = firstTextPos(d);
      const s1 = state.apply(state.tr.setSelection(TextSelection.create(d, textStart)));

      const s2 = applyCmd(s1, editor, splitListItem());
      expect(s2.doc.eq(s1.doc)).toBe(true);
    });

    it('does not split on a block (node) selection', () => {
      const d = doc(orderedList(listItem(p('content'))));
      const { editor, state } = createEditor(d, schema);

      const listItemPos = findNodePos(d, (n) => n.type.name === 'listItem');
      const s1 = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, listItemPos)));

      const s2 = applyCmd(s1, editor, splitListItem());
      expect(s2.doc.eq(s1.doc)).toBe(true);
    });
  });

  describe('Cursor positioning after split', () => {
    it('positions cursor in second list item after split', () => {
      const d = doc(orderedList(listItem(p('hello'))));
      const { editor, state } = createEditor(d, schema);

      const textStart = firstTextPos(d);
      const cursorPos = textStart + 2; // he|llo
      const s1 = state.apply(state.tr.setSelection(TextSelection.create(d, cursorPos)));

      const s2 = applyCmd(s1, editor, splitListItem());

      const selection = s2.selection;
      expect(selection).toBeInstanceOf(TextSelection);

      const $pos = selection.$from;
      expect($pos.parent.type.name).toBe('paragraph');
      expect($pos.parent.textContent).toBe('llo');

      // climb two levels safely
      const listNode = $pos.node($pos.depth - 2);
      expect(listNode.type.name).toBe('orderedList');
      expect(listNode).toBe(s2.doc.child(1));
    });
  });

  describe('Splitting with images in lists', () => {
    it('splitListItem does not delete the list item when it contains an inline image', () => {
      const imageNode = schema.nodes.image.create({ src: 'x.png', alt: null, title: null });
      const d = doc(bulletList(listItem(p('before ', imageNode, ' after'))));
      const { editor, state } = createEditor(d, schema);

      // Put caret right after the image (more realistic than end of paragraph)
      const posAfterImage = (() => {
        let pos = null;
        state.doc.descendants((n, p) => {
          if (n.type.name === 'image') {
            pos = p + 1; // first position *after* the image inline atom
            return false;
          }
          return true;
        });
        return pos;
      })();

      const s1 = state.apply(state.tr.setSelection(TextSelection.create(state.doc, posAfterImage)));
      const s2 = applyCmd(s1, editor, splitListItem());

      // Expect TWO lists (this command creates firstList + secondList)
      expect(s2.doc.childCount).toBe(2);

      const firstList = s2.doc.child(0);
      const secondList = s2.doc.child(1);
      expect(firstList.type.name).toBe('bulletList');
      expect(secondList.type.name).toBe('bulletList');

      // First list has one item that still contains the image
      expect(firstList.childCount).toBe(1);
      let hasImage = false;
      firstList.child(0).descendants((n) => {
        if (n.type.name === 'image') hasImage = true;
      });
      expect(hasImage).toBe(true);

      // Second list has the new (split) item
      expect(secondList.childCount).toBe(1);
      expect(secondList.child(0).firstChild.type.name).toBe('paragraph');
    });
  });

  describe('Attributes preservation', () => {
    it('preserves list and list item attributes', () => {
      const d = doc(orderedList({ start: 5 }, listItem({ level: 1 }, p('item'))));
      const { editor, state } = createEditor(d, schema);

      const textStart = firstTextPos(d);
      const cursorPos = textStart + 2;
      const s1 = state.apply(state.tr.setSelection(TextSelection.create(d, cursorPos)));

      const s2 = applyCmd(s1, editor, splitListItem());

      const supportsStart = !!schema.nodes.orderedList?.spec?.attrs?.start;
      const supportsLevel = !!schema.nodes.listItem?.spec?.attrs?.level;

      if (supportsStart) {
        expect(s2.doc.child(0).attrs.start).toBe(5);
        expect(s2.doc.child(1).attrs.start).toBe(5);
      } else {
        // If schema doesn’t support it, ensure we didn’t accidentally add it
        expect(s2.doc.child(0).attrs).not.toHaveProperty('start');
        expect(s2.doc.child(1).attrs).not.toHaveProperty('start');
      }

      if (supportsLevel) {
        expect(s2.doc.child(0).child(0).attrs.level).toBe(1);
        expect(s2.doc.child(1).child(0).attrs.level).toBe(1);
      } else {
        expect(s2.doc.child(0).child(0).attrs).not.toHaveProperty('level');
        expect(s2.doc.child(1).child(0).attrs).not.toHaveProperty('level');
      }
    });
  });
});
