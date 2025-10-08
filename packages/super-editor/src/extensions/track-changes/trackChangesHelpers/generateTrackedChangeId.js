import { v4 as uuidv4 } from 'uuid';
import { TrackInsertMarkName, TrackDeleteMarkName } from '../constants.js';

/**
 * Generate a tracked change ID based on logical grouping rules:
 * 1. Adjacent additions with same author can share ID (line breaks don't separate)
 * 2. Adjacent deletion + insertion pairs share ID (replacements)
 * 3. Adjacent deletions with same author can share ID (whitespace doesn't separate)
 * 4. Insertions continue across line breaks (like Google Docs)
 * 5. Deletions continue across whitespace and line breaks
 *
 * @param {Object} options
 * @param {Object} options.tr - ProseMirror transaction
 * @param {number} options.from - Start position of the change
 * @param {number} options.to - End position of the change
 * @param {string} options.changeType - 'insert' or 'delete'
 * @param {Object} options.user - User object with email
 * @returns {string} UUID for the tracked change
 */
export const generateTrackedChangeId = ({ tr, from, to, changeType, user }) => {
  const adjacentChanges = findAdjacentTrackedChanges(tr, from, to, changeType, user);

  // Reuse ID if adjacent changes are logically connected
  if (adjacentChanges.length > 0) {
    const canReuseId = adjacentChanges.every((change) => canShareTrackedChangeId(tr, from, to, change, changeType));

    if (canReuseId) {
      return adjacentChanges[0].id;
    }
  }

  return uuidv4();
};

/**
 * Find tracked changes adjacent to the given position range
 * Enhanced to look for changes across line breaks and whitespace
 */
function findAdjacentTrackedChanges(tr, from, to, changeType, user) {
  const { doc } = tr;
  const adjacentChanges = [];
  // Search range set to 10, can be changed if needed
  const searchRange = 10;
  const checkRanges = [
    {
      start: Math.max(0, from - searchRange),
      end: from,
      direction: 'before',
    },
    {
      start: to,
      end: Math.min(doc.content.size, to + searchRange),
      direction: 'after',
    },
  ];

  checkRanges.forEach(({ start, end, direction }) => {
    doc.nodesBetween(start, end, (node, nodePos) => {
      node.marks?.forEach((mark) => {
        if (isTrackedChangeMark(mark) && mark.attrs.authorEmail === user.email) {
          const canConnect =
            direction === 'before'
              ? !hasRegularContentBetween(tr, nodePos, nodePos + node.nodeSize, from, to, changeType)
              : !hasRegularContentBetween(tr, from, to, nodePos, nodePos + node.nodeSize, changeType);

          if (canConnect) {
            adjacentChanges.push({
              id: mark.attrs.id,
              type: mark.type.name,
              position: nodePos,
              direction,
              mark,
            });
          }
        }
      });
    });
  });

  return adjacentChanges;
}

/**
 * Determine if two tracked changes can share the same ID
 */
function canShareTrackedChangeId(tr, from, to, adjacentChange, changeType) {
  const markName = changeType === 'insert' ? TrackInsertMarkName : TrackDeleteMarkName;
  const oppositeMarkName = changeType === 'insert' ? TrackDeleteMarkName : TrackInsertMarkName;

  // Rule 1: Same type changes can share ID if adjacent and same author
  if (adjacentChange.type === markName) {
    return !hasRegularContentBetween(tr, from, to, adjacentChange.position, adjacentChange.position + 1, changeType);
  }

  // Rule 2: Opposite type changes can share ID (deletion + insertion = replacement)
  if (adjacentChange.type === oppositeMarkName) {
    const replacementChangeType = 'delete';
    return !hasRegularContentBetween(
      tr,
      from,
      to,
      adjacentChange.position,
      adjacentChange.position + 1,
      replacementChangeType,
    );
  }

  return false;
}

/**
 * Check if there's regular (non-tracked) content between two ranges
 * - For insertions: line breaks don't separate tracked changes
 * - For deletions: whitespace (including line breaks) don't separate tracked changes
 */
function hasRegularContentBetween(tr, from1, to1, from2, to2, changeType = 'insert') {
  const { doc } = tr;
  const start = Math.min(to1, to2);
  const end = Math.max(from1, from2);

  if (start >= end) return false; // No gap between ranges

  let hasRegularContent = false;

  doc.nodesBetween(start, end, (node) => {
    // Skip if this node has tracked change marks
    const hasTrackedMarks = node.marks && node.marks.some((mark) => isTrackedChangeMark(mark));
    if (hasTrackedMarks) {
      return;
    }

    // For line breaks and paragraph boundaries do not separate tracked changes
    if (node.type.name === 'lineBreak' || node.type.name === 'hardBreak') {
      if (changeType === 'insert') {
        return;
      }
      // For deletions, line breaks are also allowed
      if (changeType === 'delete') {
        return;
      }
    }

    // For paragraph nodes (when hitting Enter creates new paragraph)
    // Empty paragraphs or paragraphs with only whitespace are allowed
    if (node.type.name === 'paragraph') {
      if (!node.textContent || node.textContent.trim() === '') {
        return;
      }
    }

    // For text nodes
    if (node.isText) {
      // For deletions: whitespace (spaces, tabs, newlines) doesn't separate
      if (changeType === 'delete' && /^\s*$/.test(node.text || '')) {
        return;
      }

      // For insertions: only completely empty text nodes are allowed
      if (changeType === 'insert' && (!node.text || node.text === '')) {
        return;
      }

      // If we get here, it's regular text content
      hasRegularContent = true;
      return false;
    }

    // For other inline nodes without tracked marks, consider them regular content
    if (node.isInline) {
      hasRegularContent = true;
      return false;
    }
  });

  return hasRegularContent;
}

/**
 * Check if a mark is a tracked change mark
 */
function isTrackedChangeMark(mark) {
  return mark.type.name === TrackInsertMarkName || mark.type.name === TrackDeleteMarkName;
}

/**
 * Simplified version that just returns the ID for a given tracked change
 * This replaces the complex getChangesByIdToResolve logic
 */
export const getTrackedChangeById = (state, id) => {
  const trackedChanges = [];

  state.doc.descendants((node, pos) => {
    node.marks?.forEach((mark) => {
      if (isTrackedChangeMark(mark) && mark.attrs.id === id) {
        trackedChanges.push({
          mark,
          from: pos,
          to: pos + node.nodeSize,
        });
      }
    });
  });

  return trackedChanges;
};
