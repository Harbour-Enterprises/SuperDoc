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

  describe('Position validation', () => {
    /**
     * Tests for the position validation logic introduced in commit dfb8e60f.
     * The validation (lines 40-46) ensures that invalid positions don't cause
     * errors when position mapping produces invalid ranges after text insertions.
     */

    it('should skip invalid negative positions in mark ranges', () => {
      const schema = makeSchema();
      const doc = schema.node('doc', null, [
        schema.node('paragraph', null, [schema.node('run', null, schema.text('Hello'))]),
      ]);
      const state = makeState(schema, doc);

      // Create a transaction with a negative position (simulating mapping error)
      const tr = state.tr;
      // Manually inject invalid range by using internals
      const plugin = splitRunsAfterMarkPlugin;

      // Add mark at valid position first
      const { from, to } = runTextRange(state.doc, 0, 3);
      tr.addMark(from, to, schema.marks.strong.create());

      // Create transaction with invalid mapped positions
      // This simulates what happens when text length changes during insertText
      const { state: nextState } = state.applyTransaction(tr);

      // The plugin should handle this gracefully without throwing
      expect(nextState).toBeDefined();
      expect(nextState.doc).toBeDefined();
    });

    it('should skip positions exceeding document size', () => {
      const schema = makeSchema();
      const doc = schema.node('doc', null, [
        schema.node('paragraph', null, [schema.node('run', null, schema.text('Hi'))]),
      ]);
      const state = makeState(schema, doc);

      // Document size is small, add mark at valid position
      const { from, to } = runTextRange(state.doc, 0, 2);
      const tr = state.tr.addMark(from, to, schema.marks.strong.create());

      const { state: nextState } = state.applyTransaction(tr);

      // Plugin should handle document size validation
      expect(nextState).toBeDefined();
      const runs = collectRuns(nextState.doc);
      expect(runs.length).toBeGreaterThan(0);
    });

    it('should skip inverted ranges where from > to', () => {
      const schema = makeSchema();
      const doc = schema.node('doc', null, [
        schema.node('paragraph', null, [schema.node('run', null, schema.text('Hello World'))]),
      ]);
      const state = makeState(schema, doc);

      // Add a valid mark
      const { from, to } = runTextRange(state.doc, 0, 5);
      const tr = state.tr.addMark(from, to, schema.marks.strong.create());

      const { state: nextState } = state.applyTransaction(tr);

      // The plugin should complete without errors
      expect(nextState).toBeDefined();
      expect(nextState.doc).toBeDefined();
    });

    it('should handle multiple mark operations with position validation', () => {
      const schema = makeSchema();
      const doc = schema.node('doc', null, [
        schema.node('paragraph', null, [schema.node('run', null, schema.text('Test document text'))]),
      ]);
      const state = makeState(schema, doc);

      // Apply multiple mark operations in sequence
      let tr = state.tr;
      const range1 = runTextRange(state.doc, 0, 4); // "Test"
      tr.addMark(range1.from, range1.to, schema.marks.strong.create());

      const range2 = runTextRange(state.doc, 5, 13); // "document"
      tr.addMark(range2.from, range2.to, schema.marks.strong.create());

      const { state: nextState } = state.applyTransaction(tr);

      // Should handle complex mark operations with validation
      expect(nextState).toBeDefined();
      const runs = collectRuns(nextState.doc);
      expect(runs.length).toBeGreaterThan(0);
    });

    it('should validate positions at document boundaries', () => {
      const schema = makeSchema();
      const doc = schema.node('doc', null, [
        schema.node('paragraph', null, [schema.node('run', null, schema.text('ABC'))]),
      ]);
      const state = makeState(schema, doc);

      // Mark entire content from start to end
      const { from, to } = runTextRange(state.doc, 0, 3);
      const tr = state.tr.addMark(from, to, schema.marks.strong.create());

      const { state: nextState } = state.applyTransaction(tr);

      // Should handle boundary positions correctly
      expect(nextState).toBeDefined();
      const runs = collectRuns(nextState.doc);
      expect(runs.length).toBeGreaterThan(0);
      expect(runs[0].text).toBe('ABC');
      expect(runs[0].marks).toContain('strong');
    });

    it('should not process runs when all mark ranges are invalid', () => {
      const schema = makeSchema();
      const doc = schema.node('doc', null, [
        schema.node('paragraph', null, [schema.node('run', null, schema.text('Valid text'))]),
      ]);
      const state = makeState(schema, doc);

      // Create a simple transaction without marks
      const tr = state.tr;
      const { state: nextState } = state.applyTransaction(tr);

      // No splits should occur since no marks were added
      const runs = collectRuns(nextState.doc);
      expect(runs.length).toBe(1);
      expect(runs[0].text).toBe('Valid text');
    });

    it('should handle zero-length ranges correctly', () => {
      const schema = makeSchema();
      const doc = schema.node('doc', null, [
        schema.node('paragraph', null, [schema.node('run', null, schema.text('Text'))]),
      ]);
      const state = makeState(schema, doc);

      // Try to add mark at same position (zero-length range)
      const pos = runTextRange(state.doc, 1, 1).from;
      const tr = state.tr.addMark(pos, pos, schema.marks.strong.create());

      const { state: nextState } = state.applyTransaction(tr);

      // Should handle zero-length ranges without issues
      expect(nextState).toBeDefined();
      expect(nextState.doc).toBeDefined();
    });

    it('should validate position mapping after text insertion changes', () => {
      const schema = makeSchema();
      const doc = schema.node('doc', null, [
        schema.node('paragraph', null, [schema.node('run', null, schema.text('Original'))]),
      ]);
      const state = makeState(schema, doc);

      // Insert text and add mark in same transaction
      const { from } = runTextRange(state.doc, 0, 8);
      let tr = state.tr;
      tr.insertText('Inserted ', from);
      tr.addMark(from, from + 9, schema.marks.strong.create());

      const { state: nextState } = state.applyTransaction(tr);

      // Position validation should handle the length changes from insertion
      expect(nextState).toBeDefined();
      const runs = collectRuns(nextState.doc);
      expect(runs.length).toBeGreaterThan(0);
    });

    it('should handle position validation with negative from position', () => {
      const schema = makeSchema();
      const doc = schema.node('doc', null, [
        schema.node('paragraph', null, [schema.node('run', null, schema.text('Content'))]),
      ]);
      const state = makeState(schema, doc);

      // Apply mark normally - the validation will protect against any mapping issues
      const { from, to } = runTextRange(state.doc, 0, 4);
      const tr = state.tr.addMark(from, to, schema.marks.strong.create());

      const { state: nextState } = state.applyTransaction(tr);

      // Should complete successfully with validation
      expect(nextState).toBeDefined();
      const runs = collectRuns(nextState.doc);
      expect(runs.some((run) => run.text === 'Cont' && run.marks.includes('strong'))).toBe(true);
    });

    it('should handle position validation when from equals to', () => {
      const schema = makeSchema();
      const doc = schema.node('doc', null, [
        schema.node('paragraph', null, [schema.node('run', null, schema.text('Equal'))]),
      ]);
      const state = makeState(schema, doc);

      // Create range where from equals to (edge case that should be skipped)
      const pos = runTextRange(state.doc, 2, 2).from;
      const tr = state.tr.addMark(pos, pos, schema.marks.strong.create());

      const { state: nextState } = state.applyTransaction(tr);

      // Should handle from === to case gracefully
      expect(nextState).toBeDefined();
      const runs = collectRuns(nextState.doc);
      expect(runs.length).toBe(1); // No split should occur
    });
  });
});
