import { Plugin, PluginKey } from 'prosemirror-state';
import { Extension } from '@core/Extension.js';
import { TrackInsertMarkName, TrackDeleteMarkName } from '../track-changes/constants.js';
import { Decoration, DecorationSet } from "prosemirror-view";
import { comments_module_events } from '@harbour-enterprises/common';

export const CommentsPluginKey = new PluginKey('comments');

export const CommentsPlugin = Extension.create({
  name: 'comments',

  addCommands() {
    return {
      insertComment:
        (conversation) =>
        ({ tr, dispatch }) => {
          const { selection } = tr;
          const { $from, $to } = selection;

          const { commentId: threadId } = conversation;
          const commentStartNodeAttrs = {
            'w:id': threadId,
            internal: true,
          };
          const startNode = this.editor.schema.nodes.commentRangeStart.create(commentStartNodeAttrs);
          const endNode = this.editor.schema.nodes.commentRangeEnd.create({ 'w:id': threadId });
          tr.insert($from.pos, startNode);
          tr.insert($to.pos + 2, endNode);
          dispatch(tr);
          return true;
        },
      
      setActiveComment: ({ commentId, importedId }) => ({ tr, dispatch, state }) => {
        let activeThreadId = importedId;
        if (importedId === undefined || importedId === null) activeThreadId = commentId;
        tr.setMeta(CommentsPluginKey, { type: 'setActiveComment', activeThreadId });
        return true;
      },

      setCommentInternal: ({ commentId, importedId, isInternal}) => ({ tr, dispatch, state }) => {
        const { doc } = state;
        let foundStartNode;
        let foundPos;

        // Find the commentRangeStart node that matches the comment ID
        doc.descendants((node, pos) => { 
          if (foundStartNode) return;
          const { name } = node.type;
          if (name !== 'commentRangeStart') return;

          const wid = node.attrs['w:id']
          if (wid == commentId || wid == importedId) {
            foundStartNode = node;
            foundPos = pos;
          }
        });

        // If no matching node, return false
        if (!foundStartNode) return false;

        // Otherwise, set the internal attribute to the new value
        tr.setNodeMarkup(foundPos, undefined, {
          ...foundStartNode.attrs,
          internal: isInternal,
        });
  
        // Let comments plugin know we need to update
        tr.setMeta(CommentsPluginKey, {type: 'setCommentInternal' });

        dispatch(tr);
        return true;
      }
    };
  },

  addPmPlugins() {
    const editor = this.editor;
    let hasInitialized = false;
    const commentsPlugin = new Plugin({
      key: CommentsPluginKey,
      state: {
        init(_, { doc, selection }) {
          return {
            decorations: DecorationSet.empty,
            activeThreadId: null,
            externalColor: '#B1124B',
            internalColor: '#078383',
          };
        },
        apply(tr, oldState, _, newEditorState) {
          if (!editor.options.isCommentsEnabled) return { ...oldState };
          let activeThreadId;
          let isForcingUpdate = false;
          const { selection } = tr;
          const doc = newEditorState.doc;

          const meta = tr.getMeta(CommentsPluginKey);

          // If we have plugin meta, we will force update
          if (meta?.type === 'force') isForcingUpdate = true;

          // If we have a new active comment ID, we will update it
          if (meta?.type === 'setActiveComment') activeThreadId = meta.activeThreadId;

          // If the document hasn't changed, return the old state
          if (!isForcingUpdate && hasInitialized && !tr.docChanged && !tr.selectionSet) return { ...oldState }

          // If the selection changes, check if we're inside a comment
          if (!isForcingUpdate && hasInitialized && !tr.docChanged && tr.selectionSet) {
            const previousSelectionId = oldState.activeThreadId;
            activeThreadId = getActiveCommentId(doc, selection);

            // If the comment selection didn't change, return the old state
            if (previousSelectionId === activeThreadId) return { ...oldState };

            // Otherwise, we update the active comment ID
            const update = {
              type: comments_module_events.SELECTED,
              activeCommentId: activeThreadId ? activeThreadId : null
            };

            editor.emit('commentsUpdate', update);
          }

          // Generate decorations for comment highlights
          const { decorations } = processDocumentComments(editor, doc, activeThreadId) || {};
          const decorationSet = DecorationSet.create(doc, decorations);
          const previousDecorations = oldState.decorations;
          if (!isForcingUpdate && hasInitialized && previousDecorations.eq(decorationSet)) return { ...oldState };
    
          // Emit the comment-positions event which signals that comments might have changed
          // SuperDoc will use this to update floating comments as necessary
          if (hasInitialized) editor.emit('comment-positions');

          hasInitialized = true;
          return {
            ...oldState,
            activeThreadId,
            decorations: decorationSet,
          };
        },
      },
      props: {
        decorations(state) {
          return this.getState(state).decorations;
        }
      }
    });
    return [commentsPlugin];
  },
});

/**
 * Check if this node is a tracked changes node
 * @param {Node} node The node to check
 * @returns {Node | null} Either a tracked change node (insert, delete) or null
 */
const getTrackedChangeNode = (node) => {
  const nodeMarks = node.marks;
  const trackedChangeMark = nodeMarks?.find((mark) => mark.type.name === TrackInsertMarkName);
  const trackedDeleteMark = nodeMarks?.find((mark) => mark.type.name === TrackDeleteMarkName);
  return trackedChangeMark || trackedDeleteMark;
};

/**
 * Process tracking for tracked changes nodes
 * @param {EditorView} view The current editor view
 * @param {Object} allCommentPositions The current positions of nodes being tracked
 * @param {Node} node The current node to consider
 * @param {Number} pos The position of the node
 * @returns {void} allCommentPositions is modified in place
 */
const trackTrackedChangeNodes = (view, allCommentPositions, node, pos) => {
  // Check for tracked changes

  const changeMark = getTrackedChangeNode(node);
  if (changeMark) {
    const wid = changeMark.attrs.wid;
    if (wid) {
      try {
        const domPos = view.coordsAtPos(pos);
        if (!allCommentPositions[wid]) allCommentPositions[wid] = {};
        allCommentPositions[wid].threadId = wid;
        allCommentPositions[wid].top = domPos.top;
        allCommentPositions[wid].left = domPos.left;
        allCommentPositions[wid].bottom = domPos.bottom;
        allCommentPositions[wid].right = domPos.right;
        allCommentPositions[wid].type = 'trackedChange';
        allCommentPositions[wid].wid = wid;
        allCommentPositions[wid].start = pos;
        allCommentPositions[wid].end = node.nodeSize + pos;

        if (changeMark.type.name === TrackInsertMarkName) {
          allCommentPositions[wid].insertion = node.textContent;
        }

        if (changeMark.type.name === TrackDeleteMarkName) {
          allCommentPositions[wid].deletion = node.textContent;
        }
      } catch (e) {}
    }
  }
};

/**
 * Update tracked positions of comment or track changes nodes
 * @param {String} threadId The ID of the comment thread
 * @param {EditorView} view Current editor view
 * @param {Number} pos The position of the node to consider
 * @returns {Object} The updated positions of the node
 */
const updatePositions = (view, pos, currentPos) => {
  const coords = view.coordsAtPos(pos);
  const existingTop = currentPos.top || 0;
  const existingLeft = currentPos.left || 0;
  const existingRight = currentPos.right || 0;
  const existingBottom = currentPos.bottom || 0;

  return {
    top: Math.min(coords.top, existingTop),
    left: Math.min(coords.left, existingLeft),
    right: Math.max(coords.right, existingRight),
    bottom: Math.max(coords.bottom, existingBottom),
  };
};

/**
 * Main function to track comment and tracked change nodes
 *
 * @param {EditorView} view The current editor view
 * @param {Object} allCommentPositions The current positions of nodes being tracked
 * @param {Node} node The current node to consider
 * @param {Number} pos The position of the node
 * @returns {void} allCommentPositions is modified in place
 */
const trackCommentNodes = ({ allCommentPositions, decorations, node, pos, editor, activeThreadId }) => {
  const commentIds = new Set();
  const threadId = node.attrs['w:id'];

  if (threadId && node.type.name === 'commentRangeStart') {
    commentIds.add(threadId);

    allCommentPositions[threadId] = {
      threadId,
      start: pos,
      end: null,
      internal: node.attrs.internal,
    };
  } else if (node.type.name === 'commentRangeEnd') {
    const currentItem = allCommentPositions[threadId];
    if (!currentItem) return;
    currentItem.end = pos + node.nodeSize;

    const isInternal = currentItem.internal;
    const color = getHighlightColor({ activeThreadId, threadId, isInternal, editor });
    const deco = Decoration.inline(
      currentItem.start,
      currentItem.end + 1,
      {
        style: `background-color: ${color};`,
        class: 'comment-highlight',
        'data-thread-id': threadId,
      }
    );
    decorations.push(deco);
  };
};

/**
 * Get the highlight color for a comment or tracked changes node
 * 
 * @param {Object} param0 
 * @param {String} param0.activeThreadId The active comment ID
 * @param {String} param0.threadId The current thread ID
 * @param {Boolean} param0.isInternal Whether the comment is internal or external
 * @param {EditorView} param0.editor The current editor view
 * @returns {String} The color to use for the highlight
 */
const getHighlightColor = ({ activeThreadId, threadId, isInternal, editor }) => {
  if (!editor.options.isInternal && isInternal) return 'transparent';
  const pluginState = CommentsPluginKey.getState(editor.state);
  const color = isInternal ? pluginState.internalColor : pluginState.externalColor;
  const alpha = activeThreadId == threadId ? '44' : '22';
  return `${color}${alpha}`;
}

/**
 * Iterate through the document to track comment and tracked changes nodes
 * @param {*} editor The current editor instance
 * @param {*} doc The current document
 * @returns {Object} The positions of all tracked nodes where keys are the thread IDs
 */
const processDocumentComments = (editor, doc, activeThreadId) => {
  const { view } = editor;
  const allCommentPositions = {};
  const decorations = [];

  // Both of the funcitons below alter coordinates in allCommentPositions
  doc.descendants((node, pos) => {
    // Try to track comment nodes
    trackCommentNodes({
      allCommentPositions, decorations, node, pos, editor, activeThreadId,
    });

    // Try to track any tracked changes nodes
    // trackTrackedChangeNodes(view, allCommentPositions, node, pos);

  });

  return {
    decorations,
  };
};

/**
 * This is run when a new selection is set (tr.selectionSet) to return the active comment ID, if any
 * If there are multiple, only return the first one
 *
 * @param {Object} doc The current document
 * @param {Selection} selection The current selection
 * @returns {String | null} The active comment ID, if any
 */
const getActiveCommentId = (doc, selection) => {
  if (!selection) return;
  const { $from, $to } = selection;

  // We only need to check for active comment ID if the selection is empty
  if ($from.pos !== $to.pos) return;

  const nodeAtPos = doc.nodeAt($from.pos);
  if (!nodeAtPos) return;

  // If we have a tracked change, we can return it right away
  const trackedChangeNode = getTrackedChangeNode(nodeAtPos);
  if (trackedChangeNode) {
    return trackedChangeNode.attrs.wid;
  }

  // Otherwise, we need to check for comment nodes
  const overlaps = [];
  let found = false;
  
  // Look for commentRangeStart nodes before the current position
  // There could be overlapping comments so we need to track all of them
  doc.descendants((node, pos) => {
    if (found) return;
    if (node.type.name === 'commentRangeStart') {
      // Track nodes that overlap with the selection
      if ($from.pos >= pos) {
        node.attrs['w:id']
        overlaps.push({
          node,
          pos,
        });
      }
    }

    if (pos > $from.pos) {
      found = true;
    }
  });

  let closest = null;
  let closestCommentRangeStart = null;
  // Get the closest commentRangeStart node to the current position
  overlaps.forEach(({ pos, node }) => {
    if (!closest) closest = $from.pos - pos;

    const diff = $from.pos - pos;
    if (diff >= 0 && diff <= closest) {
      closestCommentRangeStart = node;
      closest = diff;
    }
  });

  return closestCommentRangeStart?.attrs['w:id'];
};
