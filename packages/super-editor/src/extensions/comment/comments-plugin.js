import { Plugin, PluginKey } from 'prosemirror-state';
import { Extension } from '@core/Extension.js';
import { TrackInsertMarkName, TrackDeleteMarkName } from '../track-changes/constants.js';
import { Decoration, DecorationSet } from "prosemirror-view";
import { comments_module_events } from '@harbour-enterprises/common';
import { removeCommentsById, getCommentPositionsById } from './comments-helpers.js';
import { CommentMarkName } from './comments-constants.js';

export const CommentsPluginKey = new PluginKey('comments');

export const CommentsPlugin = Extension.create({
  name: 'comments',

  addCommands() {
    return {
      insertComment:
        (conversation) =>
        ({ tr, dispatch, state }) => {
          const { selection } = tr;
          const { $from, $to } = selection;
          const { commentId, isInternal } = conversation;

          tr.addMark(
            $from.pos,
            $to.pos,
            this.editor.schema.marks[CommentMarkName].create({
              commentId,
              internal: isInternal
            })
          );

          dispatch(tr);
          return true;
        },

      removeComment: ({ commentId, importedId }) => ({ tr, dispatch, state }) => {
        removeCommentsById({ commentId, importedId, state, tr, dispatch });
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

          const { marks = [] } = node;
          const commentMark = marks.find((mark) => mark.type.name === CommentMarkName);

          if (commentMark) {
            const { attrs } = commentMark;
            const wid = attrs.commentId || attrs.importedId;
            if (wid == commentId || wid == importedId) {
              foundStartNode = node;
              foundPos = pos;
            }
          }
        });

        // If no matching node, return false
        if (!foundStartNode) return false;

        // Update the mark itself
        tr.addMark(
          foundPos,
          foundPos + foundStartNode.nodeSize,
          this.editor.schema.marks[CommentMarkName].create({
            commentId,
            internal: isInternal,
          })
        );
  
        // Let comments plugin know we need to update
        tr.setMeta(CommentsPluginKey, { type: 'setCommentInternal' });
        dispatch(tr);
        return true;
      },

      resolveComment: ({ commentId, importedId }) => ({ tr, dispatch, state }) => {
        removeCommentsById({ commentId, importedId, state, tr, dispatch });
      },

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
          if (meta?.type === 'setActiveComment') {
            isForcingUpdate = true;
            activeThreadId = meta.activeThreadId;
          }

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

          // Emit the comment-positions event which signals that comments might have changed
          // SuperDoc will use this to update floating comments as necessary
          if (hasInitialized) editor.emit('comment-positions');

          if (!isForcingUpdate && hasInitialized && previousDecorations.eq(decorationSet)) return { ...oldState };

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
  if (!node) return;
  const nodeMarks = node.marks;
  const trackedChangeMark = nodeMarks?.find((mark) => mark.type.name === TrackInsertMarkName);
  const trackedDeleteMark = nodeMarks?.find((mark) => mark.type.name === TrackDeleteMarkName);
  return trackedChangeMark || trackedDeleteMark;
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
const trackCommentNodes = ({
  allCommentPositions,
  linkedNodes,
  decorations,
  node,
  pos,
  editor,
  doc,
  activeThreadId
}) => {
  // Check if it contains the commentMarkName
  const { marks = [] } = node;

  // Check if this is a comment node (ie: has commentMark)
  const commentMark = marks.find((mark) => mark.type.name === CommentMarkName);
  if (commentMark) {
    const { attrs } = commentMark;
    const threadId = attrs.commentId || attrs.importedId;
    const isInternal = attrs.internal;
    const color = getHighlightColor({ activeThreadId, threadId, isInternal, editor });
    const deco = Decoration.inline(
      pos,
      pos + node.nodeSize,
      {
        style: `background-color: ${color};`,
        class: 'comment-highlight',
        'data-thread-id': threadId,
      }
    );
    decorations.push(deco);

    allCommentPositions[threadId] = {
      threadId,
      start: pos,
      end: pos + node.nodeSize,
      internal: isInternal,
    };
  };

  const trackChangeNode = getTrackedChangeNode(node);
  if (trackChangeNode) {
    const nextNode = doc.nodeAt(pos + node.nodeSize);
    const nextTrackedNode = getTrackedChangeNode(nextNode);

    const { attrs, type } = trackChangeNode;
    const { name: trackedChangeType } = type;
    const { author, authorEmail, date } = attrs;

    let id = attrs.id;

    const isDeletionInsertion = (
      trackedChangeType === TrackDeleteMarkName && nextTrackedNode?.type?.name === TrackInsertMarkName
    );
    if (isDeletionInsertion) linkedNodes[nextTrackedNode.attrs.id] = id;

    // If we've already seen this linked item, we can skip it
    if (linkedNodes[id]) return;

    allCommentPositions[id] = {
      threadId: id,
      start: pos,
      end: pos + node.nodeSize,
    };

    const params = {
      type: 'trackedChange',
      changeId: id,
      trackedChangeType: isDeletionInsertion ? 'both' : trackedChangeType,
      trackedChangeText: isDeletionInsertion ? nextNode.text : node.text,
      deletedText: trackedChangeType === TrackDeleteMarkName ? node?.text : null,
    }
    editor.emit('commentsUpdate', params)
  }
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
  const linkedNodes = {};

  doc.descendants((node, pos) => {
    trackCommentNodes({
      allCommentPositions, linkedNodes, decorations, node, pos, editor, doc, activeThreadId,
    });
  });

  return {
    decorations,
    linkedNodes,
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

    const { marks = [] } = node;
    const commentMark = marks.find((mark) => mark.type.name === CommentMarkName);
    if (commentMark) {
      overlaps.push({
        node,
        pos
      })
    }

    // If we have passed the current position, we can stop
    if (pos > $from.pos) found = true;
  });

  // Get the closest commentRangeStart node to the current position
  let closest = null;
  let closestCommentRangeStart = null;
  overlaps.forEach(({ pos, node }) => {
    if (!closest) closest = $from.pos - pos;

    const diff = $from.pos - pos;
    if (diff >= 0 && diff <= closest) {
      closestCommentRangeStart = node;
      closest = diff;
    }
  });

  const { marks: closestMarks = [] } = closestCommentRangeStart || {};
  const closestCommentMark = closestMarks.find((mark) => mark.type.name === CommentMarkName);
  return closestCommentMark?.attrs?.commentId || closestCommentMark?.attrs?.importedId;
};


