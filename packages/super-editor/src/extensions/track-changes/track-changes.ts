import { Extension } from '@core/Extension.js';
import { Slice } from 'prosemirror-model';
import { Mapping, ReplaceStep, AddMarkStep, RemoveMarkStep } from 'prosemirror-transform';
import { TrackDeleteMarkName, TrackInsertMarkName, TrackFormatMarkName } from './constants.js';
import { TrackChangesBasePlugin, TrackChangesBasePluginKey } from './plugins/index.js';
import { getTrackChanges } from './trackChangesHelpers/getTrackChanges.js';
import { collectTrackedChanges, isTrackedChangeActionAllowed } from './permission-helpers.js';
import { CommentsPluginKey } from '../comment/comments-plugin.js';
import type { EditorState } from 'prosemirror-state';
import type { Mark as PmMark, Node as PmNode } from 'prosemirror-model';
import type { Command, CommandProps } from '@core/types/ChainedCommands.js';

type FormatChange = { type: string; attrs: Record<string, unknown> };
type TrackedChange = { mark: PmMark; from: number; to: number };

export const TrackChanges = Extension.create({
  name: 'trackChanges',

  addCommands() {
    return {
      acceptTrackedChangesBetween:
        (from: number, to: number): Command =>
        ({ state, dispatch, editor }: CommandProps) => {
          const trackedChanges = collectTrackedChanges({ state, from, to });
          if (!isTrackedChangeActionAllowed({ editor, action: 'accept', trackedChanges })) return false;

          const { tr, doc } = state;

          // if (from === to) {
          //   to += 1;
          // }

          // tr.setMeta('acceptReject', true);
          tr.setMeta('inputType', 'acceptReject');

          const map = new Mapping();

          doc.nodesBetween(from, to, (node: PmNode, pos: number) => {
            if (node.marks && node.marks.find((mark) => mark.type.name === TrackDeleteMarkName)) {
              const deletionStep = new ReplaceStep(
                map.map(Math.max(pos, from)),
                map.map(Math.min(pos + node.nodeSize, to)),
                Slice.empty,
              );

              tr.step(deletionStep);
              map.appendMap(deletionStep.getMap());
            } else if (node.marks && node.marks.find((mark) => mark.type.name === TrackInsertMarkName)) {
              const insertionMark = node.marks.find((mark) => mark.type.name === TrackInsertMarkName);
              if (insertionMark) {
                tr.step(
                  new RemoveMarkStep(
                    map.map(Math.max(pos, from)),
                    map.map(Math.min(pos + node.nodeSize, to)),
                    insertionMark,
                  ),
                );
              }
            } else if (node.marks && node.marks.find((mark) => mark.type.name === TrackFormatMarkName)) {
              const formatChangeMark = node.marks.find((mark) => mark.type.name === TrackFormatMarkName);
              if (formatChangeMark) {
                tr.step(
                  new RemoveMarkStep(
                    map.map(Math.max(pos, from)),
                    map.map(Math.min(pos + node.nodeSize, to)),
                    formatChangeMark,
                  ),
                );
              }
            }
          });

          if (tr.steps.length) {
            dispatch?.(tr);
          }

          return true;
        },

      rejectTrackedChangesBetween:
        (from: number, to: number): Command =>
        ({ state, dispatch, editor }: CommandProps) => {
          const trackedChanges = collectTrackedChanges({ state, from, to });
          if (!isTrackedChangeActionAllowed({ editor, action: 'reject', trackedChanges })) return false;

          const { tr, doc } = state;

          // tr.setMeta('acceptReject', true);
          tr.setMeta('inputType', 'acceptReject');

          const map = new Mapping();

          doc.nodesBetween(from, to, (node: PmNode, pos: number) => {
            if (node.marks && node.marks.find((mark) => mark.type.name === TrackDeleteMarkName)) {
              const deletionMark = node.marks.find((mark) => mark.type.name === TrackDeleteMarkName);
              if (deletionMark) {
                tr.step(
                  new RemoveMarkStep(
                    map.map(Math.max(pos, from)),
                    map.map(Math.min(pos + node.nodeSize, to)),
                    deletionMark,
                  ),
                );
              }
            } else if (node.marks && node.marks.find((mark) => mark.type.name === TrackInsertMarkName)) {
              const deletionStep = new ReplaceStep(
                map.map(Math.max(pos, from)),
                map.map(Math.min(pos + node.nodeSize, to)),
                Slice.empty,
              );

              tr.step(deletionStep);
              map.appendMap(deletionStep.getMap());
            } else if (node.marks && node.marks.find((mark) => mark.type.name === TrackFormatMarkName)) {
              const formatChangeMark = node.marks.find((mark) => mark.type.name === TrackFormatMarkName);

              if (formatChangeMark) {
                const before = (formatChangeMark.attrs as { before: FormatChange[]; after: FormatChange[] }).before;
                const after = (formatChangeMark.attrs as { before: FormatChange[]; after: FormatChange[] }).after;

                before.forEach((oldMark) => {
                  tr.step(
                    new AddMarkStep(
                      map.map(Math.max(pos, from)),
                      map.map(Math.min(pos + node.nodeSize, to)),
                      state.schema.marks[oldMark.type].create(oldMark.attrs),
                    ),
                  );
                });

                after.forEach((newMark) => {
                  const markToRemove = node.marks.find((mark) => mark.type.name === newMark.type);
                  if (!markToRemove) return;
                  tr.step(
                    new RemoveMarkStep(
                      map.map(Math.max(pos, from)),
                      map.map(Math.min(pos + node.nodeSize, to)),
                      markToRemove,
                    ),
                  );
                });

                tr.step(
                  new RemoveMarkStep(
                    map.map(Math.max(pos, from)),
                    map.map(Math.min(pos + node.nodeSize, to)),
                    formatChangeMark,
                  ),
                );
              }
            }
          });

          if (tr.steps.length) {
            dispatch?.(tr);
          }

          return true;
        },

      acceptTrackedChange:
        ({ trackedChange }: { trackedChange: { start: number; end: number } }): Command =>
        ({ commands }: CommandProps) => {
          const cmds = commands as unknown as { acceptTrackedChangesBetween?: (from: number, to: number) => boolean };
          const { start: from, end: to } = trackedChange;
          return Boolean(cmds.acceptTrackedChangesBetween?.(from, to));
        },

      acceptTrackedChangeBySelection:
        (): Command =>
        ({ state, commands }: CommandProps) => {
          const cmds = commands as unknown as { acceptTrackedChangesBetween?: (from: number, to: number) => boolean };
          const { from, to } = state.selection;
          return Boolean(cmds.acceptTrackedChangesBetween?.(from, to));
        },

      acceptTrackedChangeFromToolbar:
        (): Command =>
        ({ state, commands }: CommandProps) => {
          const cmds = commands as unknown as {
            acceptTrackedChangeById?: (id: string) => boolean;
            acceptTrackedChangeBySelection?: () => boolean;
          };
          const commentsPluginState = CommentsPluginKey.getState(state);
          const activeThreadId = commentsPluginState?.activeThreadId;

          if (activeThreadId && commentsPluginState?.trackedChanges?.[activeThreadId]) {
            return Boolean(cmds.acceptTrackedChangeById?.(activeThreadId));
          } else {
            return Boolean(cmds.acceptTrackedChangeBySelection?.());
          }
        },

      acceptTrackedChangeById:
        (id: string): Command =>
        ({ state, tr, commands }: CommandProps) => {
          const cmds = commands as unknown as { acceptTrackedChangesBetween?: (from: number, to: number) => boolean };
          const toResolve = getChangesByIdToResolve(state, id) || [];

          return toResolve
            .map(({ from, to }) => {
              const mappedFrom = tr.mapping.map(from);
              const mappedTo = tr.mapping.map(to);
              return cmds.acceptTrackedChangesBetween?.(mappedFrom, mappedTo);
            })
            .every((result) => Boolean(result));
        },

      acceptAllTrackedChanges:
        (): Command =>
        ({ state, commands }: CommandProps) => {
          const cmds = commands as unknown as { acceptTrackedChangesBetween?: (from: number, to: number) => boolean };
          const from = 0,
            to = state.doc.content.size;
          return Boolean(cmds.acceptTrackedChangesBetween?.(from, to));
        },

      rejectTrackedChangeById:
        (id: string): Command =>
        ({ state, tr, commands }: CommandProps) => {
          const cmds = commands as unknown as { rejectTrackedChangesBetween?: (from: number, to: number) => boolean };
          const toReject = getChangesByIdToResolve(state, id) || [];

          return toReject
            .map(({ from, to }) => {
              const mappedFrom = tr.mapping.map(from);
              const mappedTo = tr.mapping.map(to);
              return cmds.rejectTrackedChangesBetween?.(mappedFrom, mappedTo);
            })
            .every((result) => Boolean(result));
        },

      rejectTrackedChange:
        ({ trackedChange }: { trackedChange: { start: number; end: number } }): Command =>
        ({ commands }: CommandProps) => {
          const cmds = commands as unknown as { rejectTrackedChangesBetween?: (from: number, to: number) => boolean };
          const { start: from, end: to } = trackedChange;
          return Boolean(cmds.rejectTrackedChangesBetween?.(from, to));
        },

      rejectTrackedChangeOnSelection:
        (): Command =>
        ({ state, commands }: CommandProps) => {
          const cmds = commands as unknown as { rejectTrackedChangesBetween?: (from: number, to: number) => boolean };
          const { from, to } = state.selection;
          return Boolean(cmds.rejectTrackedChangesBetween?.(from, to));
        },

      rejectTrackedChangeFromToolbar:
        (): Command =>
        ({ state, commands }: CommandProps) => {
          const cmds = commands as unknown as {
            rejectTrackedChangeById?: (id: string) => boolean;
            rejectTrackedChangeOnSelection?: () => boolean;
          };
          const commentsPluginState = CommentsPluginKey.getState(state);
          const activeThreadId = commentsPluginState?.activeThreadId;

          if (activeThreadId && commentsPluginState?.trackedChanges?.[activeThreadId]) {
            return Boolean(cmds.rejectTrackedChangeById?.(activeThreadId));
          } else {
            return Boolean(cmds.rejectTrackedChangeOnSelection?.());
          }
        },

      rejectAllTrackedChanges:
        (): Command =>
        ({ state, commands }: CommandProps) => {
          const cmds = commands as unknown as { rejectTrackedChangesBetween?: (from: number, to: number) => boolean };
          const from = 0,
            to = state.doc.content.size;
          return Boolean(cmds.rejectTrackedChangesBetween?.(from, to));
        },

      toggleTrackChanges:
        (): Command =>
        ({ state }: CommandProps) => {
          const trackChangeState = TrackChangesBasePluginKey.getState(state);
          if (trackChangeState === undefined) return false;
          state.tr.setMeta(TrackChangesBasePluginKey, {
            type: 'TRACK_CHANGES_ENABLE',
            value: !trackChangeState.isTrackChangesActive,
          });
          return true;
        },

      enableTrackChanges:
        (): Command =>
        ({ state }: CommandProps) => {
          state.tr.setMeta(TrackChangesBasePluginKey, {
            type: 'TRACK_CHANGES_ENABLE',
            value: true,
          });
          return true;
        },

      disableTrackChanges:
        (): Command =>
        ({ state }: CommandProps) => {
          state.tr.setMeta(TrackChangesBasePluginKey, {
            type: 'TRACK_CHANGES_ENABLE',
            value: false,
          });
          return true;
        },

      toggleTrackChangesShowOriginal:
        (): Command =>
        ({ state }: CommandProps) => {
          const trackChangeState = TrackChangesBasePluginKey.getState(state);
          if (trackChangeState === undefined) return false;
          state.tr.setMeta(TrackChangesBasePluginKey, {
            type: 'SHOW_ONLY_ORIGINAL',
            value: !trackChangeState.onlyOriginalShown,
          });
          return true;
        },

      enableTrackChangesShowOriginal:
        (): Command =>
        ({ state }: CommandProps) => {
          state.tr.setMeta(TrackChangesBasePluginKey, {
            type: 'SHOW_ONLY_ORIGINAL',
            value: true,
          });
          return true;
        },

      disableTrackChangesShowOriginal:
        (): Command =>
        ({ state }: CommandProps) => {
          state.tr.setMeta(TrackChangesBasePluginKey, {
            type: 'SHOW_ONLY_ORIGINAL',
            value: false,
          });
          return true;
        },

      toggleTrackChangesShowFinal:
        (): Command =>
        ({ state }: CommandProps) => {
          const trackChangeState = TrackChangesBasePluginKey.getState(state);
          if (trackChangeState === undefined) return false;
          state.tr.setMeta(TrackChangesBasePluginKey, {
            type: 'SHOW_ONLY_MODIFIED',
            value: !trackChangeState.onlyModifiedShown,
          });
          return true;
        },

      enableTrackChangesShowFinal:
        (): Command =>
        ({ state }: CommandProps) => {
          state.tr.setMeta(TrackChangesBasePluginKey, {
            type: 'SHOW_ONLY_MODIFIED',
            value: true,
          });
          return true;
        },
    };
  },

  addPmPlugins() {
    return [TrackChangesBasePlugin()];
  },
});

// For reference.
// const trackChangesCallback = (action, acceptedChanges, revertedChanges, editor) => {
//   const id = acceptedChanges.modifiers[0]?.id || revertedChanges.modifiers[0]?.id;
//   if (action === 'accept') {
//     editor.emit('trackedChangesUpdate', { action, id });
//   } else {
//     editor.emit('trackedChangesUpdate', { action, id });
//   }
// };

const getChangesByIdToResolve = (state: EditorState, id: string) => {
  const trackedChanges = getTrackChanges(state) as TrackedChange[];
  const changeIndex = trackedChanges.findIndex(({ mark }) => mark.attrs.id === id);
  if (changeIndex === -1) return;

  const matchingChange = trackedChanges[changeIndex];
  const matchingId = matchingChange.mark.attrs.id;

  const getSegmentSize = ({ from, to }: { from: number; to: number }) => to - from;
  const areDirectlyConnected = (left?: TrackedChange, right?: TrackedChange) => {
    if (!left || !right) {
      return false;
    }

    if (left.to !== right.from) {
      return false;
    }

    const hasContentBetween =
      state.doc.textBetween(left.from, right.to, '\n').length > getSegmentSize(left) + getSegmentSize(right);

    return !hasContentBetween;
  };

  const isComplementaryPair = (firstType: string, secondType: string) =>
    (firstType === TrackDeleteMarkName && secondType === TrackInsertMarkName) ||
    (firstType === TrackInsertMarkName && secondType === TrackDeleteMarkName);

  const linkedBefore: TrackedChange[] = [];
  const linkedAfter: TrackedChange[] = [];

  const collectDirection = (direction: -1 | 1, collection: TrackedChange[]) => {
    let currentIndex = changeIndex;
    let currentChange = matchingChange as TrackedChange;

    while (true) {
      const neighborIndex = currentIndex + direction;
      const neighbor = trackedChanges[neighborIndex] as TrackedChange | undefined;

      if (!neighbor) {
        break;
      }

      const [left, right] = direction < 0 ? [neighbor, currentChange] : [currentChange, neighbor];
      const sharesId = neighbor.mark.attrs.id === matchingId;
      const complementary = isComplementaryPair(currentChange.mark.type.name, neighbor.mark.type.name);

      if (!sharesId && !areDirectlyConnected(left, right)) {
        break;
      }

      if (!sharesId && !complementary) {
        break;
      }

      collection.push(neighbor);

      currentIndex = neighborIndex;
      currentChange = neighbor;

      if (!sharesId) {
        break;
      }
    }
  };

  collectDirection(-1, linkedBefore);
  collectDirection(1, linkedAfter);

  return [matchingChange, ...linkedAfter, ...linkedBefore];
};
