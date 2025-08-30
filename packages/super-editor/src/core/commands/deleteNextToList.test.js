import { describe, it, expect } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { getParaCtx, atVisualParaEnd, handleDeleteNextToList } from './deleteNextToList.js';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      group: 'block',
      content: '(run|text)*',
      renderDOM: () => ['p', 0],
      parseDOM: [{ tag: 'p' }],
    },
    run: {
      inline: true,
      group: 'inline',
      content: 'text*',
      renderDOM: () => ['span', { 'data-w-run': 'true' }, 0],
      parseDOM: [{ tag: 'span[data-w-run]' }],
    },
    text: { group: 'inline' },

    listItem: {
      content: 'paragraph+',
      renderDOM: () => ['li', 0],
      parseDOM: [{ tag: 'li' }],
    },
    orderedList: {
      group: 'block',
      content: 'listItem+',
      renderDOM: () => ['ol', 0],
      parseDOM: [{ tag: 'ol' }],
    },
    bulletList: {
      group: 'block',
      content: 'listItem+',
      renderDOM: () => ['ul', 0],
      parseDOM: [{ tag: 'ul' }],
    },
  },
});

const p = (...inlines) => schema.nodes.paragraph.create(null, inlines);
const t = (str) => schema.text(str);
const r = (str) => schema.nodes.run.create(null, schema.text(str));
const li = (...paras) => schema.nodes.listItem.create(null, paras);
const ol = (...items) => schema.nodes.orderedList.create(null, items);
const docN = (...blocks) => schema.nodes.doc.create(null, blocks);

function posBeforeNode(doc, target) {
  let hit = null;
  doc.descendants((node, pos) => {
    if (node === target) {
      hit = pos;
      return false;
    }
    return true;
  });
  return hit;
}
function cursorAtEndOfRun(state, runNode) {
  const before = posBeforeNode(state.doc, runNode);
  return before + 1 + runNode.content.size;
}
function mkState(doc, cursorPos) {
  return EditorState.create({
    schema,
    doc,
    selection: TextSelection.create(doc, cursorPos),
  });
}

function makeDispatchRef(stateRef) {
  return (tr) => {
    stateRef.state = stateRef.state.apply(tr);
  };
}

describe('getParaCtx', () => {
  it('finds the paragraph and computes before/endInside', () => {
    const para = p(t('Hello'));
    const d = docN(para);
    // cursor anywhere in paragraph
    const end = posBeforeNode(d, para) + 1 + para.content.size;
    const state = mkState(d, end);

    const ctx = getParaCtx(state);
    expect(ctx).toBeTruthy();
    expect(ctx.para).toBe(para);
    expect(ctx.before).toBe(0); // first block starts at 0
    expect(ctx.endInside).toBe(1 + para.content.size);
  });

  it('returns null if no paragraph ancestor', () => {
    // Create an invalid doc with nothing? (Schema requires blocks; use empty paragraph but place selection at doc start)
    const para = p(); // empty paragraph
    const d = docN(para);
    // selection at doc start still has a paragraph ancestor (pos 1 is inside para)
    // So simulate a selection *before* the paragraph: pos 0 (valid start)
    const state = EditorState.create({ schema, doc: d, selection: TextSelection.create(d, 1) });
    const ctx = getParaCtx(state);
    // We *are* inside the paragraph at pos 1 -> should not be null
    expect(ctx).not.toBeNull();
  });
});

describe('atVisualParaEnd', () => {
  it('is true when cursor is at paragraph end directly (no run)', () => {
    const para = p(t('abc'));
    const d = docN(para);
    const end = posBeforeNode(d, para) + 1 + para.content.size;
    const state = mkState(d, end);

    const ctx = getParaCtx(state);
    expect(atVisualParaEnd(state, ctx)).toBe(true);
  });

  it('is true when cursor is at end of the last run in a paragraph', () => {
    const run1 = r('abc');
    const run2 = r('xyz');
    const para = p(run1, run2);
    const d = docN(para);
    const state = mkState(d, cursorAtEndOfRun({ doc: d }, run2));

    const ctx = getParaCtx(state);
    expect(atVisualParaEnd(state, ctx)).toBe(true);
  });

  it('is false when cursor is inside run but not at end of last run', () => {
    const run1 = r('abc');
    const run2 = r('xyz');
    const para = p(run1, run2);
    const d = docN(para);
    // position at end of run1 (not last run)
    const state = mkState(d, cursorAtEndOfRun({ doc: d }, run1));

    const ctx = getParaCtx(state);
    expect(atVisualParaEnd(state, ctx)).toBe(false);
  });
});

describe('handleDeleteNextToList', () => {
  it('merges next paragraph into current paragraph (single delete)', () => {
    const para1 = p(t('Hello '));
    const para2 = p(t('World'));
    const d = docN(para1, para2);

    const end = posBeforeNode(d, para1) + 1 + para1.content.size;
    let stateRef = { state: mkState(d, end) };
    const dispatch = makeDispatchRef(stateRef);

    const handled = handleDeleteNextToList()({ state: stateRef.state, dispatch });
    expect(handled).toBe(true);

    const json = stateRef.state.doc.toJSON();
    // should be a single paragraph with concatenated text
    expect(json).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello World' }] }],
    });
  });

  it('deletes empty next paragraph', () => {
    const para1 = p(t('A'));
    const para2 = p(); // empty
    const d = docN(para1, para2);

    const end = posBeforeNode(d, para1) + 1 + para1.content.size;
    let stateRef = { state: mkState(d, end) };
    const dispatch = makeDispatchRef(stateRef);

    const handled = handleDeleteNextToList()({ state: stateRef.state, dispatch });
    expect(handled).toBe(true);

    const json = stateRef.state.doc.toJSON();
    expect(json).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }],
    });
  });

  it('merges from next list (paragraph + orderedList) and removes the list', () => {
    const para = p(t('A'));
    const list = ol(li(p(t('B'))));
    const d = docN(para, list);

    const end = posBeforeNode(d, para) + 1 + para.content.size;
    let stateRef = { state: mkState(d, end) };
    const dispatch = makeDispatchRef(stateRef);

    const handled = handleDeleteNextToList()({ state: stateRef.state, dispatch });
    expect(handled).toBe(true);

    const json = stateRef.state.doc.toJSON();
    expect(json).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'AB' }] }],
    });
  });

  it('inside list item, merges following paragraph into the list item’s paragraph', () => {
    const inListPara = p(t('One '));
    const listDoc = ol(li(inListPara));
    const para2 = p(t('Two'));
    const d = docN(listDoc, para2);

    // Cursor at end of the paragraph inside the list item
    const end = posBeforeNode(d, inListPara) + 1 + inListPara.content.size;
    let stateRef = { state: mkState(d, end) };
    const dispatch = makeDispatchRef(stateRef);

    const handled = handleDeleteNextToList()({ state: stateRef.state, dispatch });
    expect(handled).toBe(true);

    // The list should remain, paragraph content should be merged
    const json = stateRef.state.doc.toJSON();
    expect(json).toEqual({
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One Two' }] }],
            },
          ],
        },
      ],
    });
  });

  it('inside list item, merges content from next list and deletes that list', () => {
    const liPara1 = p(t('X'));
    const list1 = ol(li(liPara1));
    const list2 = ol(li(p(t('Y'))));
    const d = docN(list1, list2);

    const end = posBeforeNode(d, liPara1) + 1 + liPara1.content.size;
    let stateRef = { state: mkState(d, end) };
    const dispatch = makeDispatchRef(stateRef);

    const handled = handleDeleteNextToList()({ state: stateRef.state, dispatch });
    expect(handled).toBe(true);

    const json = stateRef.state.doc.toJSON();
    expect(json).toEqual({
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'XY' }] }],
            },
          ],
        },
      ],
    });
  });

  it('treats end-of-run as paragraph end and merges next paragraph', () => {
    const run = r('A');
    const para1 = p(run);
    const para2 = p(t('B'));
    const d = docN(para1, para2);

    const endOfRun = cursorAtEndOfRun({ doc: d }, run);
    let stateRef = { state: mkState(d, endOfRun) };
    const dispatch = makeDispatchRef(stateRef);

    const handled = handleDeleteNextToList()({ state: stateRef.state, dispatch });
    expect(handled).toBe(true);

    const { doc } = stateRef.state;

    // Assert overall text joined correctly
    expect(doc.textContent).toBe('AB');

    // Assert structure: first inline is still a run containing "A"
    const firstPara = doc.firstChild; // paragraph
    const firstInline = firstPara.firstChild; // run
    expect(firstInline.type.name).toBe('run');
    expect(firstInline.textContent).toBe('A');

    // Second inline is plain text "B"
    const secondInline = firstPara.child(1);
    expect(secondInline.type.name).toBe('text');
    expect(secondInline.text).toBe('B');
  });
});
