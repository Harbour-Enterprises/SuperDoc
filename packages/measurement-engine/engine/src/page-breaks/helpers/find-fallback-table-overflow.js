import { isTableNode, findBreakPosInTable } from './index.js';

/**
 * Scan the document for a table to use as a fallback overflow candidate.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {number} startPos Document position where the search begins.
 * @param {number} boundaryY Page boundary in pixels.
 * @param {number} [minPos=0] Minimum permissible break position.
 * @returns {{breakPoint:ReturnType<typeof findBreakPosInTable>,overflowBlock:{node:import('prosemirror-model').Node,pos:number,rect:DOMRect|null}}|null}
 */
export function findFallbackTableOverflow(view, startPos, boundaryY, minPos = 0) {
  const doc = view?.state?.doc;
  if (!view || !doc) return null;

  const results = {
    inspectedTables: 0,
  };

  if (Array.isArray(globalThis.__paginationTableLogs)) {
    globalThis.__paginationTableLogs.push({ stage: 'fallback-start', startPos, boundaryY, minPos });
  }

  let detected = null;

  doc.descendants((node, pos) => {
    if (detected) return false;
    if (!isTableNode(node)) return true;

    results.inspectedTables += 1;

    const overflow = findBreakPosInTable(view, pos, node, boundaryY, Math.max(minPos, startPos));
    if (!overflow || !overflow.primary) {
      return true;
    }

    let rect = null;
    try {
      const dom = view?.nodeDOM?.(pos);
      if (dom && typeof dom.getBoundingClientRect === 'function') {
        rect = dom.getBoundingClientRect();
      }
    } catch {}

    detected = {
      breakPoint: overflow,
      overflowBlock: {
        node,
        pos,
        rect,
      },
    };
    return false;
  });

  if (!detected) {
    const info = {
      startPos,
      boundaryY,
      inspectedTables: results.inspectedTables,
    };
    if (Array.isArray(globalThis.__paginationTableLogs)) {
      globalThis.__paginationTableLogs.push({ stage: 'fallback-miss', info });
    }
  }

  return detected;
}
