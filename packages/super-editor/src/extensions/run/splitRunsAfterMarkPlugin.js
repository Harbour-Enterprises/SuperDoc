import { Plugin, TextSelection } from 'prosemirror-state';
import { Fragment, Mark } from 'prosemirror-model';
import { AddMarkStep, RemoveMarkStep, Mapping } from 'prosemirror-transform';

/**
 * Plugin that ensures each run node contains a single mark set by splitting runs
 * after mark add/remove steps and remapping selection to the resulting structure.
 *
 * @returns {Plugin} ProseMirror plugin that normalizes runs after mark changes.
 */
export const splitRunsAfterMarkPlugin = new Plugin({
  appendTransaction(transactions, _old, newState) {
    // Collect mark-step ranges, mapped to the final doc
    const markRanges = [];
    let mappingToFinal = new Mapping();

    for (let ti = transactions.length - 1; ti >= 0; ti--) {
      const tr = transactions[ti];
      tr.steps.forEach((step) => {
        if (!(step instanceof AddMarkStep || step instanceof RemoveMarkStep)) return;
        const fromAfterTr = tr.mapping.map(step.from, 1);
        const toAfterTr = tr.mapping.map(step.to, -1);
        markRanges.push({
          from: mappingToFinal.map(fromAfterTr, 1),
          to: mappingToFinal.map(toAfterTr, -1),
        });
      });
      const composed = new Mapping();
      composed.appendMapping(tr.mapping);
      composed.appendMapping(mappingToFinal);
      mappingToFinal = composed;
    }

    if (!markRanges.length) return null;

    const runType = newState.schema.nodes['run'];
    if (!runType) return null;

    const runPositions = new Set();
    const docSize = newState.doc.content.size;
    markRanges.forEach(({ from, to }) => {
      // Validate positions are within document bounds and in correct order
      // Position mapping after insertText can produce invalid ranges when text length changes
      if (from < 0 || to < 0 || from > docSize || to > docSize || from > to) {
        return;
      }
      newState.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type === runType) runPositions.add(pos);
      });
    });

    if (!runPositions.size) return null;

    const tr = newState.tr;
    const originalSelection = newState.selection;
    const isTextSelection = originalSelection instanceof TextSelection;
    let preservedAnchor = isTextSelection ? originalSelection.anchor : null;
    let preservedHead = isTextSelection ? originalSelection.head : null;
    const anchorAssoc = preservedAnchor != null && preservedHead != null && preservedAnchor <= preservedHead ? -1 : 1;
    const headAssoc = preservedAnchor != null && preservedHead != null && preservedHead >= preservedAnchor ? 1 : -1;

    // Map an offset inside the original run's content to a position inside the replacement fragment.
    // Used for preserving selection positions.
    /**
     * Maps an offset within a run's content to the corresponding position in the replacement fragment.
     *
     * @param {number} startPos Document position of the run being replaced.
     * @param {Fragment} replacement Replacement fragment containing newly split runs.
     * @param {number} offset Offset inside the original run's content.
     * @returns {number} Position inside the replacement fragment matching the original offset.
     */
    const mapOffsetThroughReplacement = (startPos, replacement, offset) => {
      let currentPos = startPos;
      let remaining = offset;
      let mapped = null;

      replacement.forEach((node) => {
        if (mapped != null) return;
        const contentSize = node.content.size;

        if (remaining <= contentSize) {
          mapped = currentPos + 1 + remaining;
          return;
        }

        remaining -= contentSize;
        currentPos += node.nodeSize;
      });

      return mapped ?? currentPos;
    };

    // Rewrite each run so that each mark set gets its own run
    Array.from(runPositions)
      .sort((a, b) => b - a) // process from end to keep positions valid
      .forEach((pos) => {
        const mappedPos = tr.mapping.map(pos);
        const runNode = tr.doc.nodeAt(mappedPos);
        if (!runNode) return;

        const groups = [];
        let current = [];
        let currentMarks = null;

        // Split the run's children into groups with the same mark set
        runNode.forEach((child) => {
          if (child.isText) {
            if (currentMarks && Mark.sameSet(currentMarks, child.marks)) {
              current.push(child);
            } else {
              if (current.length) groups.push(Fragment.from(current));
              current = [child];
              currentMarks = child.marks;
            }
          } else {
            if (current.length) groups.push(Fragment.from(current));
            groups.push(Fragment.from(child));
            current = [];
            currentMarks = null;
          }
        });
        if (current.length) groups.push(Fragment.from(current));
        if (groups.length <= 1) return;

        // Create replacement runs
        const replacement = Fragment.from(
          groups.map((content) => runType.create(runNode.attrs, content, runNode.marks)),
        );
        tr.replaceWith(mappedPos, mappedPos + runNode.nodeSize, replacement);

        // Update preserved selection positions
        const stepMap = tr.mapping.maps[tr.mapping.maps.length - 1];
        const mapSelectionPos = (pos, assoc) => {
          if (pos == null) return null;
          if (pos < mappedPos || pos > mappedPos + runNode.nodeSize) {
            return stepMap.map(pos, assoc);
          }
          const offsetInRun = pos - (mappedPos + 1);
          return mapOffsetThroughReplacement(mappedPos, replacement, offsetInRun);
        };

        preservedAnchor = mapSelectionPos(preservedAnchor, anchorAssoc);
        preservedHead = mapSelectionPos(preservedHead, headAssoc);
      });

    if (tr.docChanged && originalSelection) {
      if (originalSelection instanceof TextSelection && preservedAnchor != null && preservedHead != null) {
        tr.setSelection(TextSelection.create(tr.doc, preservedAnchor, preservedHead));
      } else {
        tr.setSelection(originalSelection.map(tr.doc, tr.mapping));
      }
    }

    return tr.docChanged ? tr : null;
  },
});
