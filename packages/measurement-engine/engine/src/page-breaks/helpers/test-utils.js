const CALL_HISTORY_KEY = Symbol('callHistory');
const CALL_COUNT_KEY = Symbol('callCounts');

export const PX = 96; // mirrors PIXELS_PER_INCH in constants

/**
 * Build a lightweight fake EditorView for pagination tests.
 *
 * @param {Object} [options] Mock configuration.
 * @param {Map<number, any>|undefined} [options.coordsMap] Coordinates lookup used by `coordsAtPos`.
 * @param {Map<number, any>|undefined} [options.nodeRects] Rectangles returned by `nodeDOM`.
 * @param {number} [options.domTop=0] Fake DOM top coordinate.
 * @param {Function} [options.nodeDomResolver] Custom nodeDOM resolver.
 * @param {Object} [options.state] Optional ProseMirror-like state.
 * @returns {Object} Mocked editor view.
 */
export function createMockView({
  coordsMap = new Map(),
  nodeRects = new Map(),
  domTop = 0,
  nodeDomResolver,
  state,
} = {}) {
  const callCounts = new Map();
  const callHistory = [];
  const defaultDocSize = Math.max(0, Math.max(...coordsMap.keys(), 0)) + 2;
  const doc = state?.doc ?? createMockDoc([], { size: defaultDocSize });
  if (typeof doc.resolve !== 'function') {
    doc.resolve = (pos) => {
      const clampedPos = Math.max(0, Math.min(pos, Math.max(0, doc.content?.size ?? 0)));
      return {
        pos: clampedPos,
        depth: 1,
        start: () => 0,
        end: () => Math.max(0, doc.content?.size ?? 0),
      };
    };
  }

  if (typeof doc.nodeAt !== 'function') {
    doc.nodeAt = () => null;
  }

  return {
    dom: {
      getBoundingClientRect: () => ({ top: domTop }),
    },
    coordsAtPos: (pos) => {
      if (!coordsMap.has(pos)) return undefined;
      const entry = coordsMap.get(pos);
      if (typeof entry === 'function') {
        const current = callCounts.get(pos) ?? 0;
        callCounts.set(pos, current + 1);
        callHistory.push({ pos, call: current });
        return entry(current);
      }
      const current = callCounts.get(pos) ?? 0;
      callCounts.set(pos, current + 1);
      callHistory.push({ pos, call: current });
      return entry;
    },
    nodeDOM: (pos) => {
      if (nodeDomResolver) return nodeDomResolver(pos);
      if (!nodeRects.has(pos)) throw new Error('nodeDOM not found');
      const rect = nodeRects.get(pos);
      if (typeof rect === 'function') {
        return rect();
      }
      return {
        getBoundingClientRect: () => rect,
      };
    },
    state: state ?? { doc },
    [CALL_COUNT_KEY]: callCounts,
    [CALL_HISTORY_KEY]: callHistory,
  };
}

/**
 * Retrieve the recorded coords lookup history from a mock view.
 *
 * @param {Object} view Mock view returned from `createMockView`.
 * @returns {Array<{pos:number,call:number}>} Recorded call entries.
 */
export function getCallHistory(view) {
  return view?.[CALL_HISTORY_KEY] ?? [];
}

/**
 * Read how many times the provided position was queried in `coordsAtPos`.
 *
 * @param {Object} view Mock view returned from `createMockView`.
 * @param {number} pos Document position that was sampled.
 * @returns {number} Number of recorded calls.
 */
export function getCallCount(view, pos) {
  return view?.[CALL_COUNT_KEY]?.get(pos) ?? 0;
}

/**
 * Produce a simple document-like object to drive `doc.descendants` traversal in tests.
 *
 * @param {Array<{node:Object,pos:number}>} nodes Nodes exposed to the traversal callback.
 * @param {{size?:number}} [options] Additional configuration.
 * @returns {{content:{size:number},descendants:Function}} Mock document.
 */
export function createMockDoc(nodes = [], { size = 100 } = {}) {
  return {
    content: { size },
    descendants(callback) {
      for (const { node, pos } of nodes) {
        const shouldContinue = callback(node, pos);
        if (shouldContinue === false) break;
      }
    },
  };
}
