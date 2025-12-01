import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import type { Transaction, EditorState, Selection } from 'prosemirror-state';
import type { Node as PmNode, Mark } from 'prosemirror-model';
import { Extension } from '@core/Extension.js';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { removeCommentsById, getHighlightColor } from './comments-helpers.js';
import { CommentMarkName } from './comments-constants.js';

// Example tracked-change keys, if needed
import { TrackInsertMarkName, TrackDeleteMarkName, TrackFormatMarkName } from '../track-changes/constants.js';
import { TrackChangesBasePluginKey } from '../track-changes/plugins/index.js';
import { comments_module_events } from '@superdoc/common';
import { translateFormatChangesToEnglish } from './comments-helpers.js';
import { normalizeCommentEventPayload, updatePosition } from './helpers/index.js';
import { v4 as uuidv4 } from 'uuid';
import type { Editor } from '@core/Editor.js';

const TRACK_CHANGE_MARKS = [TrackInsertMarkName, TrackDeleteMarkName, TrackFormatMarkName];

export const CommentsPluginKey = new PluginKey('comments');

interface CommentMeta {
  type?: string;
  event?: string;
  activeThreadId?: string | null;
  forceUpdate?: boolean;
  decorations?: DecorationSet;
  allCommentPositions?: CommentPositionMap;
}

interface PluginState {
  activeThreadId: string | null;
  externalColor: string;
  internalColor: string;
  decorations: DecorationSet;
  allCommentPositions: CommentPositionMap;
  allCommentIds: string[];
  changedActiveThread: boolean;
  trackedChanges: Record<string, TrackedChangeRecord>;
}

type CommentPositionMap = Record<
  string,
  {
    threadId: string;
    start: number;
    end: number;
    bounds: { top: number; bottom: number; left: number; right: number };
  }
>;

type TrackedMarkMatch = { from: number; to: number; mark: Mark };

interface TrackedChangeMeta {
  insertedMark?: Mark;
  deletionMark?: Mark;
  formatMark?: Mark;
  step?: unknown;
  deletionNodes?: PmNode[];
}

interface TrackedChangeRecord {
  insertion?: string;
  deletion?: string;
  format?: string;
}

export const CommentsPlugin = Extension.create({
  name: 'comments',

  addCommands() {
    return {
      insertComment:
        (conversation: { commentId?: string; isInternal?: boolean; skipEmit?: boolean; [key: string]: unknown } = {}) =>
        ({ tr, dispatch }: { tr: Transaction; dispatch?: (tr: Transaction) => void }) => {
          const editor = this.editor;
          if (!editor) return false;
          const { selection } = tr;
          const { $from, $to } = selection;
          const skipEmit = conversation?.skipEmit;
          const resolvedCommentId = conversation?.commentId ?? uuidv4();
          const resolvedInternal = conversation?.isInternal ?? false;

          tr.setMeta(CommentsPluginKey, { event: 'add' } as CommentMeta);
          tr.addMark(
            $from.pos,
            $to.pos,
            editor.schema.marks[CommentMarkName].create({
              commentId: resolvedCommentId,
              internal: resolvedInternal,
            }),
          );

          if (dispatch) dispatch(tr);

          const shouldEmit = !skipEmit && resolvedCommentId !== 'pending';
          if (shouldEmit) {
            const commentPayload = normalizeCommentEventPayload({
              conversation,
              editorOptions: editor.options,
              fallbackCommentId: resolvedCommentId,
              fallbackInternal: resolvedInternal,
            });

            const activeCommentId =
              (commentPayload as { commentId?: string; importedId?: string }).commentId ||
              (commentPayload as { commentId?: string; importedId?: string }).importedId ||
              null;

            const event = {
              type: comments_module_events.ADD,
              comment: commentPayload,
              ...(activeCommentId && { activeCommentId }),
            };

            editor.emit('commentsUpdate', event);
          }

          return true;
        },

      removeComment:
        ({ commentId, importedId }: { commentId?: string; importedId?: string }) =>
        ({ tr, dispatch, state }: { tr: Transaction; dispatch?: (tr: Transaction) => void; state: EditorState }) => {
          tr.setMeta(CommentsPluginKey, { event: 'deleted' } as CommentMeta);
          removeCommentsById({ commentId, importedId, state, tr, dispatch });
        },

      setActiveComment:
        ({ commentId }: { commentId: string }) =>
        ({ tr }: { tr: Transaction }) => {
          tr.setMeta(CommentsPluginKey, {
            type: 'setActiveComment',
            activeThreadId: commentId,
            forceUpdate: true,
          } as CommentMeta);
          return true;
        },

      setCommentInternal:
        ({ commentId, isInternal }: { commentId: string; isInternal: boolean }) =>
        ({ tr, dispatch, state }: { tr: Transaction; dispatch?: (tr: Transaction) => void; state: EditorState }) => {
          const editor = this.editor;
          if (!editor) return false;
          const { doc } = state;
          let foundStartNode: PmNode | null = null;
          let foundPos = 0;

          // Find the commentRangeStart node that matches the comment ID
          tr.setMeta(CommentsPluginKey, { event: 'update' } as CommentMeta);
          doc.descendants((node: PmNode, pos: number) => {
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
          });

          // If no matching node, return false
          if (!foundStartNode) return false;

          // Update the mark itself (foundStartNode is confirmed non-null above)
          const nodeSize = (foundStartNode as PmNode).nodeSize;
          tr.addMark(
            foundPos,
            foundPos + nodeSize,
            editor.schema.marks[CommentMarkName].create({
              commentId,
              internal: isInternal,
            }),
          );

          tr.setMeta(CommentsPluginKey, { type: 'setCommentInternal' });
          dispatch?.(tr);
          return true;
        },

      resolveComment:
        ({ commentId }: { commentId: string }) =>
        ({ tr, dispatch, state }: { tr: Transaction; dispatch?: (tr: Transaction) => void; state: EditorState }) => {
          tr.setMeta(CommentsPluginKey, { event: 'update' } as CommentMeta);
          removeCommentsById({ commentId, state, tr, dispatch });
        },
      setCursorById:
        (id: string) =>
        ({ state, editor }: { state: EditorState; editor: Editor }) => {
          const { from } = findRangeById(state.doc, id) || {};
          if (from != null) {
            state.tr.setSelection(TextSelection.create(state.doc, from));
            editor.view.focus();
            return true;
          }
          return false;
        },
    };
  },

  addPmPlugins() {
    const editor = this.editor;
    let shouldUpdate = true;

    if (!editor || editor.options.isHeadless) return [];

    const commentsPlugin = new Plugin({
      key: CommentsPluginKey,

      state: {
        init() {
          return {
            activeThreadId: null,
            externalColor: '#B1124B',
            internalColor: '#078383',
            decorations: DecorationSet.empty,
            allCommentPositions: {} as CommentPositionMap,
            allCommentIds: [],
            changedActiveThread: false,
            trackedChanges: {},
          };
        },

        apply(tr: Transaction, pluginState: PluginState, _: EditorState, newEditorState: EditorState): PluginState {
          const meta = (tr.getMeta(CommentsPluginKey) || {}) as CommentMeta;
          const { type } = meta;

          if (type === 'force' || type === 'forceTrackChanges') shouldUpdate = true;

          if (type === 'setActiveComment') {
            shouldUpdate = true;
            pluginState.activeThreadId = meta.activeThreadId ?? null; // Update the outer scope variable
            return {
              ...pluginState,
              activeThreadId: meta.activeThreadId ?? null,
              changedActiveThread: true,
            };
          }

          if (meta && meta.decorations) {
            return {
              ...pluginState,
              decorations: meta.decorations,
              allCommentPositions: meta.allCommentPositions || {},
            };
          }

          // If this is a tracked change transaction, handle separately
          const trackedChangeMeta = tr.getMeta(TrackChangesBasePluginKey) as TrackedChangeMeta | undefined;
          const currentTrackedChanges = pluginState.trackedChanges;
          if (trackedChangeMeta) {
            const updatedTrackedChanges = handleTrackedChangeTransaction(
              trackedChangeMeta,
              currentTrackedChanges,
              newEditorState,
              editor,
            );
            if (updatedTrackedChanges) {
              pluginState.trackedChanges = updatedTrackedChanges;
            }
          }

          // Check for changes in the actively selected comment
          const trChangedActiveComment = meta?.type === 'setActiveComment';
          if ((!tr.docChanged && tr.selectionSet) || trChangedActiveComment) {
            const { selection } = tr;
            let currentActiveThread = getActiveCommentId(newEditorState.doc, selection);
            if (trChangedActiveComment) currentActiveThread = meta.activeThreadId ?? null;

            const previousSelectionId = pluginState.activeThreadId;
            if (previousSelectionId !== currentActiveThread) {
              // Update both the plugin state and the local variable
              pluginState.activeThreadId = currentActiveThread;
              const update = {
                type: comments_module_events.SELECTED,
                activeCommentId: currentActiveThread ? currentActiveThread : null,
              };

              shouldUpdate = true;
              editor.emit('commentsUpdate', update);

              const { tr: newTr } = editor.view.state;
              const { dispatch } = editor.view;
              newTr.setMeta(CommentsPluginKey, { type: 'force' });
              dispatch(newTr);
            }
          }

          return pluginState;
        },
      },

      props: {
        decorations(state: EditorState) {
          return this.getState(state)?.decorations;
        },
      },

      view() {
        let prevDoc: PmNode | null = null;
        let prevActiveThreadId: string | null = null;
        let prevAllCommentPositions: CommentPositionMap = {};
        let hasEverEmitted = false;

        return {
          update(view) {
            const { state } = view;
            const { doc, tr } = state;
            const pluginState = CommentsPluginKey.getState(state);
            const currentActiveThreadId = pluginState.activeThreadId;

            const meta = (tr.getMeta(CommentsPluginKey) || {}) as CommentMeta;
            if (meta?.type === 'setActiveComment' || meta?.forceUpdate) {
              shouldUpdate = true;
            }

            const docChanged = !prevDoc || !prevDoc.eq(doc);
            if (docChanged) shouldUpdate = true;

            const activeThreadChanged = prevActiveThreadId !== currentActiveThreadId;
            if (activeThreadChanged) {
              shouldUpdate = true;
              prevActiveThreadId = currentActiveThreadId;
            }

            // If only active thread changed after first render, reuse cached positions
            const isInitialLoad = prevDoc === null;
            const onlyActiveThreadChanged = !isInitialLoad && !docChanged && activeThreadChanged;

            if (!shouldUpdate) return;
            prevDoc = doc;
            shouldUpdate = false;

            const decorations: Decoration[] = [];
            const allCommentPositions: CommentPositionMap = onlyActiveThreadChanged
              ? prevAllCommentPositions
              : ({} as CommentPositionMap);
            doc.descendants((node: PmNode, pos: number) => {
              const { marks = [] } = node;
              const commentMarks = marks.filter((mark) => mark.type.name === CommentMarkName);

              let hasActive = false;
              commentMarks.forEach((commentMark) => {
                const { attrs } = commentMark;
                const threadId = attrs.commentId || attrs.importedId;

                if (!onlyActiveThreadChanged) {
                  const currentBounds = view.coordsAtPos(pos);

                  updatePosition({
                    allCommentPositions,
                    threadId,
                    pos,
                    currentBounds,
                    node,
                  });
                }

                const isInternal = attrs.internal;
                if (!hasActive) hasActive = currentActiveThreadId === threadId;

                // Get the color based on current activeThreadId
                const color = getHighlightColor({
                  activeThreadId: currentActiveThreadId,
                  threadId,
                  isInternal,
                  editor,
                });

                const deco = Decoration.inline(pos, pos + node.nodeSize, {
                  style: `background-color: ${color};`,
                  'data-thread-id': threadId,
                  class: 'sd-editor-comment-highlight',
                });

                // Ignore inner marks if we need to show an outer active one
                if (hasActive && currentActiveThreadId !== threadId) return;
                decorations.push(deco);
              });

              const trackedChangeMark = findTrackedMark({
                doc,
                from: pos,
                to: pos + node.nodeSize,
              });

              if (trackedChangeMark) {
                if (!onlyActiveThreadChanged) {
                  const currentBounds = view.coordsAtPos(pos);
                  const { id } = trackedChangeMark.mark.attrs;
                  updatePosition({
                    allCommentPositions,
                    threadId: id,
                    pos,
                    currentBounds,
                    node,
                  });
                }

                // Add decoration for tracked changes when activated
                const isActiveTrackedChange = currentActiveThreadId === trackedChangeMark.mark.attrs.id;
                if (isActiveTrackedChange) {
                  const trackedChangeDeco = Decoration.inline(pos, pos + node.nodeSize, {
                    style: `border-width: 2px;`,
                    'data-thread-id': trackedChangeMark.mark.attrs.id,
                    class: 'sd-editor-tracked-change-highlight',
                  });

                  decorations.push(trackedChangeDeco);
                }
              }
            });

            const decorationSet = DecorationSet.create(doc, decorations);

            // Compare new decorations with the old state to avoid infinite loop
            const oldDecorations = pluginState.decorations;

            // We only dispatch if something actually changed
            const same = oldDecorations.eq(decorationSet);
            if (!same) {
              const tr = state.tr.setMeta(CommentsPluginKey, {
                decorations: decorationSet,
                allCommentPositions,
                forceUpdate: true,
              });
              // Dispatch the transaction to update pluginState
              view.dispatch(tr);
            }

            // Only emit comment-positions if they changed
            if (!onlyActiveThreadChanged) {
              const positionsChanged = hasPositionsChanged(prevAllCommentPositions, allCommentPositions);
              const hasComments = Object.keys(allCommentPositions).length > 0;
              // Emit positions if they changed OR if this is the first emission with comments present.
              // This ensures positions are emitted on initial load even when only the active thread changes.
              const shouldEmitPositions = positionsChanged || (!hasEverEmitted && hasComments);

              if (shouldEmitPositions) {
                prevAllCommentPositions = allCommentPositions;
                hasEverEmitted = true;
                editor.emit('comment-positions', { allCommentPositions });
              }
            }
          },
        };
      },
    });

    return [commentsPlugin];
  },
});

/**
 * Compares two comment position objects to determine if they have changed.
 * Uses shallow comparison of position coordinates for efficiency.
 */
const hasPositionsChanged = (prevPositions: CommentPositionMap, currPositions: CommentPositionMap): boolean => {
  const prevKeys = Object.keys(prevPositions);
  const currKeys = Object.keys(currPositions);

  if (prevKeys.length !== currKeys.length) return true;

  for (const key of currKeys) {
    const prev = prevPositions[key];
    const curr = currPositions[key];

    if (!prev || !prev.bounds || !curr.bounds) {
      return true;
    }

    if (prev.bounds.top !== curr.bounds.top || prev.bounds.left !== curr.bounds.left) {
      return true;
    }
  }

  return false;
};

/**
 * This is run when a new selection is set (tr.selectionSet) to return the active comment ID, if any.
 * If there are multiple, only return the first one.
 */
const getActiveCommentId = (doc: PmNode, selection: Selection | null) => {
  if (!selection) return;
  const { $from, $to } = selection;

  // We only need to check for active comment ID if the selection is empty
  if ($from.pos !== $to.pos) return;

  const nodeAtPos = doc.nodeAt($from.pos);
  if (!nodeAtPos) return;

  // If we have a tracked change, we can return it right away
  const trackedChangeMark = findTrackedMark({
    doc,
    from: $from.pos,
    to: $to.pos,
  });

  if (trackedChangeMark) {
    return trackedChangeMark.mark.attrs.id;
  }

  // Otherwise, we need to check for comment nodes
  const overlaps: Array<{ node: PmNode; pos: number; size: number }> = [];
  let found = false;

  // Look for commentRangeStart nodes before the current position
  // There could be overlapping comments so we need to track all of them
  doc.descendants((node, pos) => {
    if (found) return;

    // node goes from `pos` to `end = pos + node.nodeSize`
    const end = pos + node.nodeSize;

    // If $from.pos is outside this node's range, skip it
    if ($from.pos < pos || $from.pos >= end) {
      return;
    }

    // Now we know $from.pos is within this node's start/end
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
  let closest: number | null = null;
  let closestCommentRangeStart: PmNode | null = null;
  overlaps.forEach(({ pos, node }) => {
    if (closest === null) closest = $from.pos - pos;

    const diff = $from.pos - pos;
    if (diff >= 0 && diff <= closest) {
      closestCommentRangeStart = node;
      closest = diff;
    }
  });

  const matchedNode = closestCommentRangeStart as PmNode | null;
  const closestMarks: readonly Mark[] = matchedNode?.marks ?? [];
  const closestCommentMark = closestMarks.find((mark: Mark) => mark.type.name === CommentMarkName);
  return closestCommentMark?.attrs?.commentId || closestCommentMark?.attrs?.importedId;
};

const findTrackedMark = ({
  doc,
  from,
  to,
  offset = 1, // To get non-inclusive marks.
}: {
  doc: PmNode;
  from: number;
  to: number;
  offset?: number;
}): TrackedMarkMatch | undefined => {
  const startPos = Math.max(from - offset, 0);
  const endPos = Math.min(to + offset, doc.content.size);

  let markFound: TrackedMarkMatch | undefined;

  doc.nodesBetween(startPos, endPos, (node: PmNode, pos: number) => {
    if (!node || node?.nodeSize === undefined) {
      return;
    }

    const mark = node.marks.find((mark) => TRACK_CHANGE_MARKS.includes(mark.type.name));

    if (mark && !markFound) {
      markFound = {
        from: pos,
        to: pos + node.nodeSize,
        mark,
      };
    }
  });

  return markFound;
};

const handleTrackedChangeTransaction = (
  trackedChangeMeta: TrackedChangeMeta,
  trackedChanges: Record<string, TrackedChangeRecord>,
  newEditorState: EditorState,
  editor: Editor,
): Record<string, TrackedChangeRecord> | undefined => {
  const { insertedMark, deletionMark, formatMark, deletionNodes } = trackedChangeMeta;

  if (!insertedMark && !deletionMark && !formatMark) {
    return;
  }

  const newTrackedChanges = { ...trackedChanges };
  const rawId = insertedMark?.attrs?.id ?? deletionMark?.attrs?.id ?? formatMark?.attrs?.id;
  if (rawId === undefined || rawId === null || rawId === '') {
    return trackedChanges;
  }
  const id = String(rawId);

  // Maintain a map of tracked changes with their inserted/deleted ids
  let isNewChange = false;
  if (!newTrackedChanges[id]) {
    newTrackedChanges[id] = {} as TrackedChangeRecord;
    isNewChange = true;
  }

  if (insertedMark) newTrackedChanges[id].insertion = id;
  if (deletionMark) newTrackedChanges[id].deletion = String(deletionMark.attrs?.id ?? '');
  if (formatMark) newTrackedChanges[id].format = String(formatMark.attrs?.id ?? '');

  const { step } = trackedChangeMeta;
  const stepSlice = (step as { slice?: { content?: { content?: PmNode[] } } })?.slice;
  let nodes: PmNode[] = stepSlice?.content?.content || [];

  // Track format has no nodes, we need to find the node
  if (!nodes.length) {
    newEditorState.doc.descendants((node) => {
      const hasFormatMark = node.marks.find((mark) => mark.type.name === TrackFormatMarkName);
      if (hasFormatMark) {
        nodes = [node];
        return false;
      }
    });
  }

  const emitParams = createOrUpdateTrackedChangeComment({
    documentId: editor.options.documentId ?? undefined,
    event: isNewChange ? 'add' : 'update',
    marks: {
      insertedMark,
      deletionMark,
      formatMark,
    },
    _deletionNodes: deletionNodes,
    nodes,
    newEditorState,
  });

  if (emitParams) editor.emit('commentsUpdate', emitParams);

  return newTrackedChanges;
};

const getTrackedChangeText = ({
  nodes,
  mark,
  trackedChangeType,
  isDeletionInsertion,
}: {
  nodes: PmNode[];
  mark: Mark;
  trackedChangeType: string;
  isDeletionInsertion: boolean;
}) => {
  let trackedChangeText = '';
  let deletionText = '';

  if (trackedChangeType === TrackInsertMarkName) {
    trackedChangeText = nodes.reduce((acc, node) => {
      if (!node.marks.find((nodeMark) => nodeMark.type.name === mark.type.name)) return acc;
      acc += node?.text || node?.textContent || '';
      return acc;
    }, '');
  }

  // If this is a format change, let's get the string of what changes were made
  if (trackedChangeType === TrackFormatMarkName) {
    trackedChangeText = translateFormatChangesToEnglish(mark.attrs);
  }

  if (trackedChangeType === TrackDeleteMarkName || isDeletionInsertion) {
    deletionText = nodes.reduce((acc, node) => {
      if (!node.marks.find((nodeMark) => nodeMark.type.name === TrackDeleteMarkName)) return acc;
      acc += node?.text || node?.textContent || '';
      return acc;
    }, '');
  }

  return {
    deletionText,
    trackedChangeText,
  };
};

const createOrUpdateTrackedChangeComment = ({
  event,
  marks,
  _deletionNodes,
  nodes,
  newEditorState,
  documentId,
}: {
  event: string;
  marks: { insertedMark?: Mark; deletionMark?: Mark; formatMark?: Mark };
  _deletionNodes?: PmNode[];
  nodes: PmNode[];
  newEditorState: EditorState;
  documentId?: string;
}) => {
  const trackedMark = marks.insertedMark || marks.deletionMark || marks.formatMark;
  if (!trackedMark) return;

  const { type, attrs } = trackedMark;

  const { name: trackedChangeType } = type;
  const { author, authorEmail, authorImage, date, importedAuthor } = attrs;
  const id = attrs.id;

  const node = nodes[0];
  const isDeletionInsertion = !!(marks.insertedMark && marks.deletionMark);

  const nodesWithMark: PmNode[] = [];
  newEditorState.doc.descendants((node) => {
    const { marks = [] } = node;
    const changeMarks = marks.filter((mark) => TRACK_CHANGE_MARKS.includes(mark.type.name));
    if (!changeMarks.length) return;
    const hasMatchingId = changeMarks.find((mark) => mark.attrs.id === id);
    if (hasMatchingId) nodesWithMark.push(node);
  });

  const { deletionText, trackedChangeText } = getTrackedChangeText({
    nodes: nodesWithMark.length ? nodesWithMark : [node],
    mark: trackedMark,
    trackedChangeType,
    isDeletionInsertion,
  });

  if (!deletionText && !trackedChangeText) {
    return;
  }

  const params: {
    event: string;
    type: string;
    documentId?: string;
    changeId: string;
    trackedChangeType: string;
    trackedChangeText: string;
    deletedText: string | null;
    author: unknown;
    authorEmail: unknown;
    authorImage?: unknown;
    date: unknown;
    importedAuthor?: { name: unknown };
  } = {
    event: comments_module_events.ADD,
    type: 'trackedChange',
    documentId,
    changeId: id,
    trackedChangeType: isDeletionInsertion ? 'both' : trackedChangeType,
    trackedChangeText,
    deletedText: marks.deletionMark ? deletionText : null,
    author,
    authorEmail,
    ...(authorImage && { authorImage }),
    date,
    ...(importedAuthor && {
      importedAuthor: {
        name: importedAuthor,
      },
    }),
  };

  if (event === 'add') params.event = comments_module_events.ADD;
  else if (event === 'update') params.event = comments_module_events.UPDATE;

  return params;
};

function findRangeById(doc: PmNode, id: string): { from: number; to: number } | null {
  let from: number | null = null;
  let to: number | null = null;
  doc.descendants((node, pos) => {
    const trackedMark = node.marks.find((m) => TRACK_CHANGE_MARKS.includes(m.type.name) && m.attrs.id === id);
    if (trackedMark) {
      if (from === null || pos < from) from = pos;
      if (to === null || pos + node.nodeSize > to) to = pos + node.nodeSize;
    }
    const commentMark = node.marks.find(
      (m) => m.type.name === CommentMarkName && (m.attrs.commentId === id || m.attrs.importedId === id),
    );
    if (commentMark) {
      if (from === null || pos < from) from = pos;
      if (to === null || pos + node.nodeSize > to) to = pos + node.nodeSize;
    }
  });
  return from !== null && to !== null ? { from, to } : null;
}

export const __test__ = {
  getActiveCommentId,
  findTrackedMark,
  handleTrackedChangeTransaction,
  getTrackedChangeText,
  createOrUpdateTrackedChangeComment,
  findRangeById,
};
