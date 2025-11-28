import { Plugin } from 'prosemirror-state';
import { decodeRPrFromMarks } from '@converter/styles.js';

/**
 * Normalizes and merges overlapping ranges so they can be processed once.
 * @param {Array<{from: number, to: number}>} ranges
 * @param {number} docSize
 * @returns {Array<{from: number, to: number}>}
 */
const mergeRanges = (ranges, docSize) => {
  if (!ranges.length) return [];
  const sorted = ranges
    .map(({ from, to }) => ({
      from: Math.max(0, from),
      to: Math.min(docSize, to),
    }))
    .filter(({ from, to }) => from < to)
    .sort((a, b) => a.from - b.from);

  const merged = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.from <= last.to) {
      last.to = Math.max(last.to, range.to);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
};

/**
 * Extracts changed ranges from a batch of transactions.
 * @param {Array<import('prosemirror-state').Transaction>} trs
 * @param {number} docSize
 * @returns {Array<{from: number, to: number}>}
 */
const collectChangedRanges = (trs, docSize) => {
  const ranges = [];
  trs.forEach((tr) => {
    if (!tr.docChanged) return;
    tr.mapping.maps.forEach((map) => {
      map.forEach((oldStart, oldEnd, newStart, newEnd) => {
        if (newStart !== oldStart || oldEnd !== newEnd) {
          ranges.push({ from: newStart, to: newEnd });
        }
      });
    });
  });
  return mergeRanges(ranges, docSize);
};

/**
 * Re-maps ranges through the provided transaction mappings to keep them aligned with the latest doc.
 * @param {Array<{from: number, to: number}>} ranges
 * @param {Array<import('prosemirror-state').Transaction>} transactions
 * @param {number} docSize
 * @returns {Array<{from: number, to: number}>}
 */
const mapRangesThroughTransactions = (ranges, transactions, docSize) => {
  let mapped = ranges;
  transactions.forEach((tr) => {
    mapped = mapped
      .map(({ from, to }) => {
        const mappedFrom = tr.mapping.map(from, -1);
        const mappedTo = tr.mapping.map(to, 1);
        if (mappedFrom >= mappedTo) return null;
        return { from: mappedFrom, to: mappedTo };
      })
      .filter(Boolean);
  });
  return mergeRanges(mapped, docSize);
};

/**
 * Creates a transaction that wraps bare text nodes in run nodes within the provided ranges.
 * @param {import('prosemirror-state').EditorState} state
 * @param {Array<{from: number, to: number}>} ranges
 * @param {import('prosemirror-model').NodeType | undefined} runType
 * @returns {import('prosemirror-state').Transaction | null}
 */
const buildWrapTransaction = (state, ranges, runType) => {
  if (!ranges.length) return null;

  const replacements = [];

  ranges.forEach(({ from, to }) => {
    state.doc.nodesBetween(from, to, (node, pos, parent, index) => {
      if (!node.isText || !parent || parent.type === runType) return;

      const match = parent.contentMatchAt ? parent.contentMatchAt(index) : null;
      if (match && !match.matchType(runType)) return;
      if (!match && !parent.type.contentMatch.matchType(runType)) return;

      const runProperties = decodeRPrFromMarks(node.marks);
      const runNode = runType.create({ runProperties }, node);
      replacements.push({ from: pos, to: pos + node.nodeSize, runNode });
    });
  });

  if (!replacements.length) return null;

  const tr = state.tr;
  replacements.sort((a, b) => b.from - a.from).forEach(({ from, to, runNode }) => tr.replaceWith(from, to, runNode));

  return tr.docChanged ? tr : null;
};

/**
 * Plugin that wraps bare text nodes in run nodes, including text inserted via IME
 * composition. While composing we collect changed ranges, and on compositionend
 * we immediately wrap without waiting for additional input.
 *
 * @returns {Plugin}
 */
export const wrapTextInRunsPlugin = () => {
  let view = null;
  let pendingRanges = [];

  const flush = () => {
    if (!view) return;
    const runType = view.state.schema.nodes.run;
    if (!runType) {
      pendingRanges = [];
      return;
    }
    const tr = buildWrapTransaction(view.state, pendingRanges, runType);
    pendingRanges = [];
    if (tr) {
      view.dispatch(tr);
    }
  };

  const onCompositionEnd = () => {
    // Defer so ProseMirror applies the composition-ending transaction first.
    if (typeof globalThis === 'undefined') return;
    globalThis.queueMicrotask(flush);
  };

  return new Plugin({
    view(editorView) {
      view = editorView;
      editorView.dom.addEventListener('compositionend', onCompositionEnd);
      return {
        destroy() {
          editorView.dom.removeEventListener('compositionend', onCompositionEnd);
          view = null;
          pendingRanges = [];
        },
      };
    },

    appendTransaction(transactions, _oldState, newState) {
      const docSize = newState.doc.content.size;
      const runType = newState.schema.nodes.run;
      if (!runType) return null;

      // Keep pending ranges up to date across the transaction batch
      pendingRanges = mapRangesThroughTransactions(pendingRanges, transactions, docSize);
      const changedRanges = collectChangedRanges(transactions, docSize);
      pendingRanges = mergeRanges([...pendingRanges, ...changedRanges], docSize);

      if (view?.composing) {
        return null;
      }

      const tr = buildWrapTransaction(newState, pendingRanges, runType);
      pendingRanges = [];
      return tr;
    },
  });
};
