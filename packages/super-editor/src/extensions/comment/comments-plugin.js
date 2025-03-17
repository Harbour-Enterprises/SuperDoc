import { Plugin, PluginKey } from 'prosemirror-state';
import { Extension } from '@core/Extension.js';
import { TrackInsertMarkName, TrackDeleteMarkName, TrackFormatMarkName } from '../track-changes/constants.js';
import { Decoration, DecorationSet } from "prosemirror-view";
import { comments_module_events } from '@harbour-enterprises/common';
import { removeCommentsById, translateFormatChangesToEnglish } from './comments-helpers.js';
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

          tr.setMeta(CommentsPluginKey, { event: 'add' });
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
        tr.setMeta(CommentsPluginKey, { event: 'deleted' });
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
        tr.setMeta(CommentsPluginKey, { event: 'update' });
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
        tr.setMeta(CommentsPluginKey, { event: 'update' });
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
            allCommentIds: [],
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
          const { decorations, allCommentIds } = processDocumentComments(editor, doc, activeThreadId, oldState) || {};
          const decorationSet = DecorationSet.create(doc, decorations);

          // Emit the comment-positions event which signals that comments might have changed
          // SuperDoc will use this to update floating comments as necessary
          editor.emit('comment-positions', allCommentIds);

          hasInitialized = true;
          return {
            ...oldState,
            activeThreadId,
            allCommentIds,
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
  const trackedFormatMark = nodeMarks?.find((mark) => mark.type.name === TrackFormatMarkName);
  return trackedChangeMark || trackedDeleteMark || trackedFormatMark;
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
  activeThreadId,
  pluginState,
}) => {
  // Check if it contains the commentMarkName
  const { marks = [] } = node;

  // Check if this is a comment node (ie: has commentMark)
  const commentMarks = marks.filter((mark) => mark.type.name === CommentMarkName);
  commentMarks.forEach((commentMark) => {
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
  });

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
  
    let trackedChangeText = isDeletionInsertion ? nextNode.text : node.text;
  
    // If this is a format change, let's get the string of what changes were made
    const isFormatChange = trackedChangeType === TrackFormatMarkName;
    if (isFormatChange) trackedChangeText = translateFormatChangesToEnglish(trackChangeNode.attrs)

    const params = {
      type: 'trackedChange',
      documentId: editor.options.documentId,
      changeId: id,
      trackedChangeType: isDeletionInsertion ? 'both' : trackedChangeType,
      trackedChangeText,
      deletedText: trackedChangeType === TrackDeleteMarkName ? node?.text : null,
      author,
      authorEmail,
      date,
    };

    // Check if this is a new tracked change, or if it's already been seen
    if (!pluginState.allCommentIds.includes(id)) {
      params.event = comments_module_events.ADD;
    } else {
      params.event = comments_module_events.UPDATE;
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
const processDocumentComments = (editor, doc, activeThreadId, pluginState) => {
  const allCommentPositions = {};
  const decorations = [];
  const linkedNodes = {};

  doc.descendants((node, pos) => {
    trackCommentNodes({
      allCommentPositions, linkedNodes, decorations, node, pos, editor, doc, activeThreadId, pluginState,
    });
  });

  // Get all current thread IDs in the document
  const allCommentIds = Object.keys(allCommentPositions).map((threadId) => threadId);

  return {
    decorations,
    linkedNodes,
    allCommentIds, 
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

    // node goes from `pos` to `end = pos + node.nodeSize`
    const end = pos + node.nodeSize;

    // If $from.pos is outside this node’s range, skip it
    if ($from.pos < pos || $from.pos >= end) {
      return;
    }

    // Now we know $from.pos is within this node’s start/end
    const { marks = [] } = node;
    const commentMark = marks.find((mark) => mark.type.name === CommentMarkName);
    if (commentMark) {
      overlaps.push({
        node,
        pos,
        size: node.nodeSize,
      });
    }

    // If we've passed the position, we can stop
    if (pos > $from.pos) {
      found = true;
    }
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


