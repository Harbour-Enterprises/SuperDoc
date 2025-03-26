import { Plugin, PluginKey } from 'prosemirror-state'
import { Extension } from '@core/Extension.js'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { removeCommentsById, getHighlightColor } from './comments-helpers.js'
import { CommentMarkName } from './comments-constants.js'
import { PaginationPluginKey } from '../pagination/pagination-helpers.js';


// Example tracked-change keys, if needed
import {
  TrackInsertMarkName,
  TrackDeleteMarkName,
  TrackFormatMarkName,
} from '../track-changes/constants.js'
import { TrackChangesBasePluginKey } from '../track-changes/plugins/index.js'
import { comments_module_events } from '@harbour-enterprises/common'
import { translateFormatChangesToEnglish } from './comments-helpers.js'

const TRACK_CHANGE_MARKS = [TrackInsertMarkName, TrackDeleteMarkName, TrackFormatMarkName];

export const CommentsPluginKey = new PluginKey('comments')

export const CommentsPlugin = Extension.create({
  name: 'comments',

  addCommands() {
    return {
      insertComment:
        (conversation) =>
        ({ tr, dispatch, state }) => {
          const { selection } = tr
          const { $from, $to } = selection
          const { commentId, isInternal } = conversation

          tr.setMeta(CommentsPluginKey, { event: 'add' })
          tr.addMark(
            $from.pos,
            $to.pos,
            this.editor.schema.marks[CommentMarkName].create({
              commentId,
              internal: isInternal,
            })
          )

          dispatch(tr)
          return true;
        },

      removeComment:
        ({ commentId, importedId }) =>
        ({ tr, dispatch, state }) => {
          tr.setMeta(CommentsPluginKey, { event: 'deleted' });
          removeCommentsById({ commentId, importedId, state, tr, dispatch });
        },

      setActiveComment:
        ({ commentId }) =>
        ({ tr, dispatch }) => {
          let activeThreadId = commentId;
          tr.setMeta(CommentsPluginKey, { type: 'setActiveComment', activeThreadId });
          return true;
        },

      setCommentInternal:
        ({ commentId, isInternal }) =>
        ({ tr, dispatch, state }) => {
          const { doc } = state;
          let foundStartNode;
          let foundPos;

          // Find the commentRangeStart node that matches the comment ID
          tr.setMeta(CommentsPluginKey, { event: 'update' })
          doc.descendants((node, pos) => {
            if (foundStartNode) return;

            const { marks = [] } = node;
            const commentMark = marks.find((mark) => mark.type.name === CommentMarkName);

            if (commentMark) {
              const { attrs } = commentMark;
              const wid = attrs.commentId;
              if (wid === commentId) {
                foundStartNode = node;
                foundPos = pos;
              }
            }
          })

          // If no matching node, return false
          if (!foundStartNode) return false

          // Update the mark itself
          tr.addMark(
            foundPos,
            foundPos + foundStartNode.nodeSize,
            this.editor.schema.marks[CommentMarkName].create({
              commentId,
              internal: isInternal,
            })
          )

          tr.setMeta(CommentsPluginKey, { type: 'setCommentInternal' })
          dispatch(tr)
          return true
        },

      resolveComment:
        ({ commentId }) =>
        ({ tr, dispatch, state }) => {
          tr.setMeta(CommentsPluginKey, { event: 'update' })
          removeCommentsById({ commentId, state, tr, dispatch })
        },
    }
  },

  addPmPlugins() {
    const editor = this.editor
    let shouldUpdate;
    let activeThreadId;

    const commentsPlugin = new Plugin({
      key: CommentsPluginKey,

      state: {
        init() {
          return {
            activeThreadId: null,
            externalColor: '#B1124B',
            internalColor: '#078383',
            decorations: DecorationSet.empty,
            allCommentPositions: {},
            allCommentIds: [],
            changedActiveThread: false,
            trackedChanges: {},
          }
        },

        apply(tr, pluginState, _, newEditorState) {

          const paginationMeta = tr.getMeta(PaginationPluginKey);
          const isPaginationInit = paginationMeta?.isReadyToInit;
          if (isPaginationInit) shouldUpdate = true;

          const meta = tr.getMeta(CommentsPluginKey);
          const { type } = meta || {};

          if (type === 'force') shouldUpdate = true;

          if (!isPaginationInit && !shouldUpdate && meta && meta.decorations) {
            return {
              ...pluginState,
              decorations: meta.decorations,
              allCommentPositions: meta.allCommentPositions,
            }
          };

          // If this is a tracked change transaction, handle separately
          const trackedChangeMeta = tr.getMeta(TrackChangesBasePluginKey);
          const currentTrackedChanges = pluginState.trackedChanges;
          if (trackedChangeMeta) {
            pluginState.trackedChanges = handleTrackedChangeTransaction(
              trackedChangeMeta,
              currentTrackedChanges,
              newEditorState,
              editor,
            );
          };          

          // Check for changes in the actively selected comment
          const trChangedActiveComment = meta?.type === 'setActiveComment';
        if ((!tr.docChanged && tr.selectionSet) || trChangedActiveComment) {
            const { selection } = tr;
            let currentActiveThread = getActiveCommentId(newEditorState.doc, selection);
            if (trChangedActiveComment) currentActiveThread = meta.activeThreadId;

            const previousSelectionId = activeThreadId;
            if (previousSelectionId !== currentActiveThread) {
              activeThreadId = currentActiveThread;
              const update = {
                type: comments_module_events.SELECTED,
                activeCommentId: activeThreadId ? activeThreadId : null
              };

              shouldUpdate = true;
              editor.emit('commentsUpdate', update);

              const { tr: newTr } = editor.view.state;
              const { dispatch } = editor.view;
              newTr.setMeta(CommentsPluginKey, { type: 'force' });
              dispatch(newTr);
            };
          };

          return pluginState
        },
      },

      props: {
        decorations(state) {
          return this.getState(state).decorations
        },
      },

      view(editorView) {
        let prevDoc;
        let prevDecorations;

        return {
          update(view, prevState) {
            const { state } = view
            const { doc, tr } = state

            if (prevDoc && prevDoc.eq(doc) && !shouldUpdate) return;
            prevDoc = doc;
            shouldUpdate = false;

            const decorations = []
            const allCommentPositions = {}
            doc.descendants((node, pos) => {
              const { marks = [] } = node
              const commentMarks = marks.filter(
                (mark) => mark.type.name === CommentMarkName
              )

              commentMarks.forEach((commentMark) => {
                const { attrs } = commentMark
                const threadId = attrs.commentId || attrs.importedId

                const currentBounds = view.coordsAtPos(pos)

                updatePosition({
                  allCommentPositions,
                  threadId,
                  pos,
                  currentBounds,
                  node,
                });

                const isInternal = attrs.internal;

                const color = getHighlightColor({ activeThreadId, threadId, isInternal, editor });
                const deco = Decoration.inline(pos, pos + node.nodeSize, {
                  style: `background-color: ${color}`,
                  class: 'comment-highlight',
                  'data-thread-id': threadId,
                })
                decorations.push(deco)
              });

              const trackedChangeNode = getTrackedChangeNode(node);
              if (trackedChangeNode) {
                const currentBounds = view.coordsAtPos(pos);
                const { id } = trackedChangeNode.attrs;
                updatePosition({
                  allCommentPositions,
                  threadId: id,
                  pos,
                  currentBounds,
                  node,
                });
              };
            });

            const decorationSet = DecorationSet.create(doc, decorations)

            // Compare new decorations with the old state to avoid infinite loop
            const pluginState = CommentsPluginKey.getState(state)
            const oldDecorations = pluginState.decorations

            // We only dispatch if something actually changed
            const same = oldDecorations.eq(decorationSet)
            if (!same) {
              const tr = state.tr.setMeta(CommentsPluginKey, {
                decorations: decorationSet,
                allCommentPositions,
              })
              // Dispatch the transaction to update pluginState
              view.dispatch(tr)
            }

            editor.emit('comment-positions', { allCommentPositions });

            // Remember the new decorations for next time
            prevDecorations = decorationSet

          },
        }
      },
    })

    return [commentsPlugin]
  },
});

const updatePosition = ({
  allCommentPositions,
  threadId,
  pos,
  currentBounds,
  node,
}) => {
  if (!allCommentPositions[threadId]) {
    allCommentPositions[threadId] = {
      threadId,
      start: pos,
      end: pos + node.nodeSize,
      bounds: { ...currentBounds },
    }
  } else {
    // Adjust the positional indices
    const existing = allCommentPositions[threadId]
    existing.start = Math.min(existing.start, pos)
    existing.end = Math.max(existing.end, pos + node.nodeSize)
    existing.bounds.top = Math.min(existing.bounds.top, currentBounds.top)
    existing.bounds.bottom = Math.max(existing.bounds.bottom, currentBounds.bottom)
  }
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

const handleTrackedChangeTransaction = (trackedChangeMeta, trackedChanges, newEditorState, editor) => {
  const { deletionMark, insertedMark, formatMark, deletionNodes } = trackedChangeMeta;
  if (!deletionMark && !insertedMark && !formatMark) return;

  const newTrackedChanges = { ...trackedChanges };
  let id = insertedMark?.attrs?.id || deletionMark?.attrs?.id || formatMark?.attrs?.id;
  if (!id) return trackedChanges;

  // Maintain a map of tracked changes with their inserted/deleted ids
  let isNewChange = false;
  if (!newTrackedChanges[id]) {
    newTrackedChanges[id] = {};
    isNewChange = true;
  };

  if (insertedMark) newTrackedChanges[id].insertion = id;
  if (deletionMark) newTrackedChanges[id].deletion = deletionMark.attrs?.id;
  if (formatMark) newTrackedChanges[id].format = formatMark.attrs?.id;

  const { step } = trackedChangeMeta;
  let nodes = step?.slice?.content?.content || [];

  // Track format has no nodes, we need to find the node
  if (!nodes.length) {
    newEditorState.doc.descendants((node, pos) => {
      const hasFormatMark = node.marks.find((mark) => mark.type.name === TrackFormatMarkName);
      if (hasFormatMark) {
        nodes = [node];
        return false;
      };
    });
  }
  const emitParams = createOrUpdateTrackedChangeComment({
    documentId: editor.options.documentId,
    event: isNewChange ? 'add' : 'update',
    marks: {
      insertedMark,
      deletionMark,
      formatMark,
    },
    deletionNodes,
    nodes: nodes,
    newEditorState,
  });

  if (emitParams) editor.emit('commentsUpdate', emitParams);

  return newTrackedChanges;
};

const getTrackedChangeText = ({ node, mark, trackedChangeType, isDeletionInsertion, deletionNodes = [] }) => {
  const deletionText = deletionNodes.length ? deletionNodes[0].text : null;  

  let trackedChangeText = isDeletionInsertion ? nextNode.text : node.text;

  // If this is a format change, let's get the string of what changes were made
  const isFormatChange = trackedChangeType === TrackFormatMarkName;
  if (isFormatChange) trackedChangeText = translateFormatChangesToEnglish(mark.attrs)

  return {
    deletionText,
    trackedChangeText,
  }
};

const createOrUpdateTrackedChangeComment = ({ event, marks, deletionNodes, nodes, newEditorState, documentId }) => {
  const trackedMark = marks.insertedMark || marks.deletionMark || marks.formatMark;
  const { type, attrs } = trackedMark;
  
  const { name: trackedChangeType } = type;
  const { author, authorEmail, date } = attrs;

  let id = attrs.id;

  if (!nodes.length) return;

  const node = nodes[0];
  const isDeletionInsertion = (
    trackedChangeType === TrackDeleteMarkName && nextTrackedNode?.type?.name === TrackInsertMarkName
  );

  let existingNode;
  newEditorState.doc.descendants((node, pos) => {
    const { marks = [] } = node;
    const changeMarks = marks.filter((mark) => TRACK_CHANGE_MARKS.includes(mark.type.name));
    if (!changeMarks.length) return;

    const hasMatchingId = changeMarks.find((mark) => mark.attrs.id === id);
    if (hasMatchingId) existingNode = node;
    if (!existingNode) return false;
  });

  const { deletionText, trackedChangeText } = getTrackedChangeText({
    node: existingNode || node,
    mark: trackedMark,
    trackedChangeType,
    isDeletionInsertion,
    deletionNodes
  });

  if (!deletionText && !trackedChangeText) return;

  const params = {
    event: comments_module_events.ADD,
    type: 'trackedChange',
    documentId,
    changeId: id,
    trackedChangeType: isDeletionInsertion ? 'both' : trackedChangeType,
    trackedChangeText,
    deletedText: marks.deletionMark ? deletionText : null,
    author,
    authorEmail,
    date,
  };
  
  if (event === 'add') params.event = comments_module_events.ADD;
  else if (event === 'update') params.event = comments_module_events.UPDATE;
  return params;
};