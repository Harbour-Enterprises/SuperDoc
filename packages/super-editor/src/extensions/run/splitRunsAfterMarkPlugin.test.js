import { describe, expect, it } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { splitRunsAfterMarkPlugin } from './splitRunsAfterMarkPlugin.js';

const makeSchema = () =>
  new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: { group: 'block', content: 'inline*' },
      run: { inline: true, group: 'inline', content: 'inline*' },
      text: { group: 'inline' },
    },
    marks: {
      strong: {
        toDOM: () => ['strong', 0],
        parseDOM: [{ tag: 'strong' }],
      },
    },
  });

const collectRuns = (doc) => {
  const runs = [];
  doc.descendants((node, pos, parent) => {
    if (node.type.name === 'run' && parent?.type.name === 'paragraph') {
      const firstText = node.firstChild;
      runs.push({
        pos,
        text: node.textContent,
        marks: firstText ? firstText.marks.map((m) => m.type.name) : [],
      });
    }
  });
  return runs;
};

const runTextRange = (doc, startIndex, endIndex) => {
  const run = collectRuns(doc)[0];
  if (!run) throw new Error('Run not found in doc');
  const textStart = run.pos + 1;
  return { from: textStart + startIndex, to: textStart + endIndex };
};

const makeState = (schema, doc, selection) =>
  EditorState.create({
    schema,
    doc,
    selection,
    plugins: [splitRunsAfterMarkPlugin],
  });

describe('splitRunsAfterMarkPlugin', () => {
  it('splits a run when a mark is added to part of its text', () => {
    const schema = makeSchema();
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.node('run', null, schema.text('Hello'))]),
    ]);
    const state = makeState(schema, doc);

    const { from, to } = runTextRange(state.doc, 1, 4); // "ell"
    const tr = state.tr.addMark(from, to, schema.marks.strong.create());
    const { state: nextState, transactions } = state.applyTransaction(tr);

    expect(transactions.length).toBeGreaterThan(1);
    const runs = collectRuns(nextState.doc);
    expect(runs.map((run) => run.text)).toEqual(['H', 'ell', 'o']);
    expect(runs.map((run) => run.marks)).toEqual([[], ['strong'], []]);
  });

  it('preserves a text selection inside a run while splitting', () => {
    const schema = makeSchema();
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.node('run', null, schema.text('Hello'))]),
    ]);

    const markRange = runTextRange(doc, 1, 4);
    const selection = TextSelection.create(doc, markRange.from, markRange.to);
    const state = makeState(schema, doc, selection);
    const beforeSelectionText = state.doc.textBetween(0, state.selection.from);

    const tr = state.tr.addMark(markRange.from, markRange.to, schema.marks.strong.create());
    const { state: nextState } = state.applyTransaction(tr);

    const runs = collectRuns(nextState.doc);
    const ellRun = runs.find((run) => run.text === 'ell');

    expect(ellRun).toBeDefined();
    expect(nextState.doc.textBetween(0, nextState.selection.from)).toBe(beforeSelectionText);
    expect(nextState.doc.textBetween(nextState.selection.from, nextState.selection.to)).toBe('ell');
    expect(runs.map((run) => run.text)).toEqual(['H', 'ell', 'o']);
  });

  it('splits a run after removing a mark from a portion of its text', () => {
    const schema = makeSchema();
    const strong = schema.marks.strong.create();
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.node('run', null, schema.text('Hello', [strong]))]),
    ]);
    const state = makeState(schema, doc);

    const { from, to } = runTextRange(state.doc, 1, 4); // remove mark from "ell"
    const tr = state.tr.removeMark(from, to, schema.marks.strong);
    const { state: nextState, transactions } = state.applyTransaction(tr);

    expect(transactions.length).toBeGreaterThan(1);
    const runs = collectRuns(nextState.doc);
    expect(runs.map((run) => run.text)).toEqual(['H', 'ell', 'o']);
    expect(runs.map((run) => run.marks)).toEqual([['strong'], [], ['strong']]);
  });
});
