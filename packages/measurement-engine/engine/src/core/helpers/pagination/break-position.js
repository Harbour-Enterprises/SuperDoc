import { findBreakPosInBlock, safeCoordsAtPos } from '../../../page-breaks/helpers/index.js';

/**
 * Check if a node contains block-level children (vs only inline content).
 * @param {import('prosemirror-model').Node|null} node - ProseMirror node to check.
 * @returns {boolean} True if the node contains at least one block child.
 */
const nodeContainsBlockChildren = (node) => {
  if (!node || !node.content) return false;

  // Check if any child is a block
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child.isBlock) return true;
  }
  return false;
};

/**
 * Find break position in a leaf block and normalize the result to fitted coordinates.
 * @param {import('prosemirror-view').EditorView} view - Measurement editor view.
 * @param {number} pos - Document position of the block.
 * @param {import('prosemirror-model').Node|null} node - The block node.
 * @param {number} absoluteBoundary - Absolute Y boundary in pixels.
 * @param {number} lastBreakBase - Base position for break search.
 * @param {DOMRect} containerRect - Container bounding rectangle.
 * @param {Object} pagination - Pagination state.
 * @param {DOMRect|null} [blockRect=null] - Optional block rectangle for fallback.
 * @returns {{fittedTop:number, fittedBottom:number, pos:number, breakY:number}|null} Normalized break result with absolute Y coordinate.
 */
const findAndNormalizeBreakResult = (
  view,
  pos,
  node,
  absoluteBoundary,
  lastBreakBase,
  containerRect,
  pagination,
  blockRect = null,
) => {
  const containerTop = Number.isFinite(containerRect?.top) ? containerRect.top : 0;
  const pageLimit = absoluteBoundary - containerTop;

  // Call findBreakPosInBlock to get the break position
  const result = findBreakPosInBlock(view, pos, node, absoluteBoundary, lastBreakBase);

  // Ensure we have valid position and coordinates
  const normalized = ensureValidBreakResult(result, view, pos, pos, blockRect, containerTop);

  // Convert to relative coordinates and clamp to page boundaries
  const relativeTop = Number.isFinite(normalized.top) ? normalized.top - containerTop : pagination.pageStart;
  const relativeBottom = Number.isFinite(normalized.bottom) ? normalized.bottom - containerTop : relativeTop;

  // Clamp to page boundaries
  const safeBottom = Math.min(Math.max(relativeBottom, pagination.pageStart), pageLimit);
  const safeTop = Math.min(Math.max(relativeTop, pagination.pageStart), safeBottom);

  const finalResult = {
    fittedTop: safeTop,
    fittedBottom: safeBottom,
    pos: normalized.pos,
    breakY: normalized.top, // Absolute Y coordinate of the break for table spacing
  };
  return finalResult;
};

/**
 * Find break position within a block that contains other blocks.
 * Recursively descends into child blocks until finding the leaf block that overflows.
 *
 * @param {import('prosemirror-view').EditorView} view - Measurement editor view.
 * @param {number} containerPos - Document position of the container block.
 * @param {import('prosemirror-model').Node} containerNode - The container node with block children.
 * @param {number} absoluteBoundary - Absolute Y boundary in pixels.
 * @param {DOMRect} containerRect - Container bounding rectangle.
 * @param {Object} pagination - Pagination state.
 * @returns {{fittedTop:number, fittedBottom:number, pos:number, breakY:number}|null} Break metadata with absolute Y coordinate or null.
 */
const findBreakInBlockContainer = (view, containerPos, containerNode, absoluteBoundary, containerRect, pagination) => {
  if (!containerNode || containerNode.childCount === 0) return null;

  const docSize = view.state?.doc?.content?.size ?? Infinity;
  let offset = containerPos + 1; // Start after opening tag

  // Iterate over child blocks
  for (let i = 0; i < containerNode.childCount; i++) {
    const childNode = containerNode.child(i);
    const childPos = offset;
    const childEnd = Math.min(childPos + childNode.nodeSize - 1, docSize);

    // Get the DOM element and its bounding rect for more accurate measurement
    let childRect = null;
    try {
      const childDOM = view.nodeDOM(childPos);
      if (childDOM && typeof childDOM.getBoundingClientRect === 'function') {
        childRect = childDOM.getBoundingClientRect();
      }
    } catch {}

    // Get coordinates at start and end of child block
    const childStartCoords = safeCoordsAtPos(view, childPos);
    const childEndCoords = safeCoordsAtPos(view, childEnd);

    // Determine child's top and bottom boundaries
    // Prefer DOM rect for accuracy, fallback to coords
    const childTop = Number.isFinite(childRect?.top)
      ? childRect.top
      : Number.isFinite(childStartCoords?.top)
        ? childStartCoords.top
        : null;

    const childBottom = Number.isFinite(childRect?.bottom)
      ? childRect.bottom
      : Number.isFinite(childEndCoords?.bottom)
        ? childEndCoords.bottom
        : null;

    // Skip if we can't determine boundaries
    if (!Number.isFinite(childTop) || !Number.isFinite(childBottom)) {
      offset += childNode.nodeSize;
      continue;
    }

    // Check if this child crosses the page boundary
    // A child crosses if it starts before AND ends after the boundary
    const childStartsBeforeBoundary = childTop <= absoluteBoundary;
    const childEndsAfterBoundary = childBottom > absoluteBoundary;

    if (childStartsBeforeBoundary && childEndsAfterBoundary) {
      // This child crosses the boundary
      if (nodeContainsBlockChildren(childNode)) {
        // Child contains more blocks - recurse deeper
        const result = findBreakInBlockContainer(
          view,
          childPos,
          childNode,
          absoluteBoundary,
          containerRect,
          pagination,
        );
        if (result) {
          return result;
        }

        // If recursion didn't find anything, it means the container (e.g., cell) crosses
        // but its content (e.g., paragraph) doesn't. This happens when there's padding/spacing.
        // The container's visual rendering extends beyond the boundary due to padding.
        // We should break BEFORE this container to push it entirely to the next page.

        // Find the first leaf block in this container to get its coordinates
        let firstLeafPos = childPos;
        let currentNode = childNode;
        let currentPos = childPos;

        while (nodeContainsBlockChildren(currentNode) && currentNode.childCount > 0) {
          const firstChild = currentNode.child(0);
          firstLeafPos = currentPos + 1;
          currentNode = firstChild;
          currentPos = firstLeafPos;
        }

        // Get coordinates of the first leaf to determine break position
        const firstLeafCoords = safeCoordsAtPos(view, firstLeafPos);
        const firstLeafTop = firstLeafCoords?.top ?? childTop;

        // If the first leaf starts before the boundary, break right before it
        // This pushes the entire container to the next page
        if (Number.isFinite(firstLeafTop) && firstLeafTop <= absoluteBoundary) {
          const containerTop = Number.isFinite(containerRect?.top) ? containerRect.top : 0;
          const relativeTop = Math.max(firstLeafTop - containerTop, pagination.pageStart);
          const pageLimit = absoluteBoundary - containerTop;
          const safeBottom = Math.min(relativeTop, pageLimit);
          const safeTop = Math.min(Math.max(relativeTop, pagination.pageStart), safeBottom);

          // Break right before this container (at childPos or slightly before)
          const breakPos = Math.max(childPos - 1, pagination?.lastBreakPos ?? 0);

          return {
            fittedTop: safeTop,
            fittedBottom: safeBottom,
            pos: breakPos,
            breakY: firstLeafTop,
          };
        }

        // If still no result, continue to next sibling
      } else {
        // Leaf block - find break position within it
        const lastBreakBase = Number.isFinite(pagination?.lastBreakPos) ? pagination.lastBreakPos + 1 : childPos + 1;
        return findAndNormalizeBreakResult(
          view,
          childPos,
          childNode,
          absoluteBoundary,
          lastBreakBase,
          containerRect,
          pagination,
          childRect,
        );
      }
    }

    offset += childNode.nodeSize;
  }

  return null;
};

/**
 * Determine an exact break position for a DOM block that exceeds the current page boundary.
 * @param {Object} options - Options for calculating the break.
 * @param {import('prosemirror-view').EditorView} options.view - Measurement editor view.
 * @param {HTMLElement} options.block - DOM block under inspection.
 * @param {DOMRect} options.containerRect - Bounding rect of the measurement container.
 * @param {number} options.pageLimit - Current page lower boundary in pixels.
 * @param {Object} options.pagination - Pagination state accumulator.
 * @returns {{fittedTop:number, fittedBottom:number, pos:number, breakY:number}|null} Break metadata with absolute Y coordinate or null when unavailable.
 */
export const getExactBreakPosition = ({ view, block, containerRect, pageLimit, pagination }) => {
  if (!view || !block) return null;

  const blockRect = typeof block.getBoundingClientRect === 'function' ? block.getBoundingClientRect() : null;
  const containerTop = Number.isFinite(containerRect?.top) ? containerRect.top : 0;
  const containerLeft = Number.isFinite(containerRect?.left) ? containerRect.left : 0;
  const absoluteBoundary = containerTop + pageLimit;

  // Try multiple strategies to find block position
  const blockPos =
    tryGetPositionFromDOM(view, block) ?? tryGetPositionFromCoords(view, blockRect, containerLeft, absoluteBoundary);

  if (!Number.isFinite(blockPos)) return null;

  // Resolve the block node
  const doc = view.state?.doc ?? null;
  let { node: blockNode, pos: searchPos } = resolveBlockNode(doc, blockPos);

  // Special case: if DOM block is a TABLE but we found a tableRow, find the table node
  if (block.tagName === 'TABLE' && blockNode?.type?.name === 'tableRow' && Number.isFinite(searchPos) && doc) {
    try {
      const $pos = doc.resolve(searchPos);
      // Look for table node in parent chain
      for (let d = $pos.depth; d > 0; d--) {
        const node = $pos.node(d);
        if (node.type?.name === 'table') {
          blockNode = node;
          searchPos = $pos.before(d);
          break;
        }
      }
    } catch {
      // If resolve fails, continue with original blockNode
    }
  }

  // Check if this node contains block children (e.g., table, tableRow, tableCell)
  if (nodeContainsBlockChildren(blockNode)) {
    // Recursively find which child block overflows
    return findBreakInBlockContainer(view, searchPos, blockNode, absoluteBoundary, containerRect, pagination);
  }

  // Leaf block with inline content - find break position within it
  const lastBreakBase = Number.isFinite(pagination?.lastBreakPos) ? pagination.lastBreakPos + 1 : blockPos + 1;
  return findAndNormalizeBreakResult(
    view,
    searchPos,
    blockNode,
    absoluteBoundary,
    lastBreakBase,
    containerRect,
    pagination,
    blockRect,
  );
};

const getCoordinateWithFallback = (coords, coordKey, blockRect, rectKey, containerValue) => {
  if (Number.isFinite(coords?.[coordKey])) return coords[coordKey];
  if (Number.isFinite(blockRect?.[rectKey])) return blockRect[rectKey];
  return containerValue;
};

const tryGetPositionFromDOM = (view, block) => {
  if (typeof view.posAtDOM !== 'function') return null;
  try {
    const pos = view.posAtDOM(block, 0);
    return Number.isFinite(pos) ? pos : null;
  } catch {
    return null;
  }
};

const tryGetPositionFromCoords = (view, blockRect, containerLeft, absoluteBoundary) => {
  if (typeof view.posAtCoords !== 'function') return null;

  const probeLeft = Number.isFinite(blockRect?.left) ? blockRect.left : containerLeft;
  const probeTopCandidate = Number.isFinite(blockRect?.bottom) ? blockRect.bottom : absoluteBoundary;
  const probeTop = Math.min(probeTopCandidate, absoluteBoundary);

  try {
    const coords = view.posAtCoords({ left: probeLeft, top: probeTop });
    return coords && Number.isFinite(coords.pos) ? coords.pos : null;
  } catch {
    return null;
  }
};

const resolveBlockNode = (doc, pos) => {
  if (!doc || typeof doc.nodeAt !== 'function' || !Number.isFinite(pos)) {
    return { node: null, pos };
  }

  let blockNode = doc.nodeAt(pos);
  if (blockNode) return { node: blockNode, pos };

  // Try previous position
  if (pos > 0) {
    const prevNode = doc.nodeAt(pos - 1);
    if (prevNode) return { node: prevNode, pos: pos - 1 };
  }

  return { node: null, pos };
};

const ensureValidBreakResult = (result, view, initialBlockPos, searchPos, blockRect, containerTop) => {
  if (result && typeof result === 'object') {
    const pos = Number.isFinite(result.pos) ? result.pos : initialBlockPos;
    const coords = safeCoordsAtPos(view, pos);

    const top = getCoordinateWithFallback(
      result.top !== undefined ? result : coords,
      'top',
      blockRect,
      'top',
      containerTop,
    );

    const bottom = getCoordinateWithFallback(
      result.bottom !== undefined ? result : coords,
      'bottom',
      blockRect,
      'bottom',
      top,
    );

    return { pos, top, bottom };
  }

  // No result - create fallback
  const fallbackPos = Number.isFinite(initialBlockPos) ? initialBlockPos : searchPos;
  const coords = safeCoordsAtPos(view, fallbackPos);

  const top = getCoordinateWithFallback(coords, 'top', blockRect, 'top', containerTop);
  const bottom = getCoordinateWithFallback(coords, 'bottom', blockRect, 'bottom', top);

  return { pos: fallbackPos, top, bottom };
};
