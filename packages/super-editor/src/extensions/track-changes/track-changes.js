import { Extension } from '@core/Extension.js';
import { Slice } from 'prosemirror-model';
import { Mapping, ReplaceStep, AddMarkStep, RemoveMarkStep } from 'prosemirror-transform';
import { TrackDeleteMarkName, TrackInsertMarkName, TrackFormatMarkName } from './constants.js';
import { TrackChangesBasePlugin, TrackChangesBasePluginKey } from './plugins/index.js';
import { getTrackChanges } from './trackChangesHelpers/getTrackChanges.js';
import { collectTrackedChanges, isTrackedChangeActionAllowed } from './permission-helpers.js';
import { CommentsPluginKey } from '../comment/comments-plugin.js';

export const TrackChanges = Extension.create({
  name: 'trackChanges',

  addCommands() {
    return {
      acceptTrackedChangesBetween:
        (from, to) =>
        ({ state, dispatch, editor }) => {
          const trackedChanges = collectTrackedChanges({ state, from, to });
          if (!isTrackedChangeActionAllowed({ editor, action: 'accept', trackedChanges })) return false;

          let { tr, doc } = state;

          // if (from === to) {
          //   to += 1;
          // }

          // tr.setMeta('acceptReject', true);
          tr.setMeta('inputType', 'acceptReject');

          const map = new Mapping();

          // Collect all unique deletion mark IDs within the range for later processing
          const deletionMarksInSelection = new Map();
          doc.nodesBetween(from, to, (node, pos) => {
            if (!node.marks) return;
            const deletionMark = node.marks.find((mark) => mark.type.name === TrackDeleteMarkName);
            if (!deletionMark) return;

            const nodeFrom = pos;
            const nodeTo = pos + node.nodeSize;
            const existingRange = deletionMarksInSelection.get(deletionMark.attrs.id);

            if (existingRange) {
              existingRange.from = Math.min(existingRange.from, nodeFrom);
              existingRange.to = Math.max(existingRange.to, nodeTo);
            } else {
              deletionMarksInSelection.set(deletionMark.attrs.id, { from: nodeFrom, to: nodeTo });
            }
          });

          // Process insertions and format changes FIRST (they just remove marks, don't change document structure)
          // Skip nodes that have deletion marks since those will be handled separately
          doc.nodesBetween(from, to, (node, pos) => {
            if (!node.marks) return;

            // Skip nodes with deletion marks - they will be processed in deletion step
            if (node.marks.find((mark) => mark.type.name === TrackDeleteMarkName)) {
              return;
            }

            if (node.marks.find((mark) => mark.type.name === TrackInsertMarkName)) {
              const insertionMark = node.marks.find((mark) => mark.type.name === TrackInsertMarkName);
              tr.step(
                new RemoveMarkStep(
                  map.map(Math.max(pos, from)),
                  map.map(Math.min(pos + node.nodeSize, to)),
                  insertionMark,
                ),
              );
            } else if (node.marks.find((mark) => mark.type.name === TrackFormatMarkName)) {
              const formatChangeMark = node.marks.find((mark) => mark.type.name === TrackFormatMarkName);
              tr.step(
                new RemoveMarkStep(
                  map.map(Math.max(pos, from)),
                  map.map(Math.min(pos + node.nodeSize, to)),
                  formatChangeMark,
                ),
              );
            }
          });

          // Process deletions AFTER insertions/format changes
          // For each deletion mark ID, find ALL nodes with that ID (not just in the range)
          // This ensures we capture the full extent of deletions that span multiple nodes
          const deletionRanges = [];
          for (const [markId, selectionRange] of deletionMarksInSelection.entries()) {
            const deletionChanges = getTrackChanges(state, markId)
              .filter(({ mark }) => mark.type.name === TrackDeleteMarkName)
              .sort((a, b) => a.from - b.from);

            if (!deletionChanges.length) {
              continue;
            }

            // Merge adjacent/overlapping deletion ranges
            const mergedRanges = [];
            deletionChanges.forEach(({ from: changeFrom, to: changeTo }) => {
              const lastRange = mergedRanges[mergedRanges.length - 1];
              if (!lastRange) {
                mergedRanges.push({ from: changeFrom, to: changeTo });
                return;
              }

              if (changeFrom <= lastRange.to) {
                // Overlapping or adjacent
                lastRange.to = Math.max(lastRange.to, changeTo);
                return;
              }

              // Check if there's only whitespace between ranges (should merge)
              const gapText = state.doc.textBetween(lastRange.to, changeFrom, '\n');
              if (!gapText.trim()) {
                lastRange.to = Math.max(lastRange.to, changeTo);
                return;
              }

              // Separate range
              mergedRanges.push({ from: changeFrom, to: changeTo });
            });

            // Filter to only ranges that overlap with the selection
            const overlappingRanges = mergedRanges.filter(
              (range) => range.from < selectionRange.to && range.to > selectionRange.from,
            );

            if (overlappingRanges.length) {
              overlappingRanges.forEach((range) => deletionRanges.push(range));
            }
          }

          // Sort deletion ranges and process them (in reverse order to maintain position accuracy)
          deletionRanges.sort((a, b) => b.from - a.from);

          for (const range of deletionRanges) {
            const deleteFrom = map.map(range.from);
            const deleteTo = map.map(range.to);

            // Delete the entire range in one operation
            const deletionStep = new ReplaceStep(deleteFrom, deleteTo, Slice.empty);
            tr.step(deletionStep);
            map.appendMap(deletionStep.getMap());
          }

          if (tr.steps.length) {
            dispatch(tr);
          }

          return true;
        },

      rejectTrackedChangesBetween:
        (from, to) =>
        ({ state, dispatch, editor }) => {
          const trackedChanges = collectTrackedChanges({ state, from, to });
          if (!isTrackedChangeActionAllowed({ editor, action: 'reject', trackedChanges })) return false;

          const { tr, doc } = state;

          // tr.setMeta('acceptReject', true);
          tr.setMeta('inputType', 'acceptReject');

          const map = new Mapping();

          doc.nodesBetween(from, to, (node, pos) => {
            if (node.marks && node.marks.find((mark) => mark.type.name === TrackDeleteMarkName)) {
              const deletionMark = node.marks.find((mark) => mark.type.name === TrackDeleteMarkName);

              tr.step(
                new RemoveMarkStep(
                  map.map(Math.max(pos, from)),
                  map.map(Math.min(pos + node.nodeSize, to)),
                  deletionMark,
                ),
              );
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

              formatChangeMark.attrs.before.forEach((oldMark) => {
                tr.step(
                  new AddMarkStep(
                    map.map(Math.max(pos, from)),
                    map.map(Math.min(pos + node.nodeSize, to)),
                    state.schema.marks[oldMark.type].create(oldMark.attrs),
                  ),
                );
              });

              formatChangeMark.attrs.after.forEach((newMark) => {
                tr.step(
                  new RemoveMarkStep(
                    map.map(Math.max(pos, from)),
                    map.map(Math.min(pos + node.nodeSize, to)),
                    node.marks.find((mark) => mark.type.name === newMark.type),
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
          });

          if (tr.steps.length) {
            dispatch(tr);
          }

          return true;
        },

      acceptTrackedChange:
        ({ trackedChange }) =>
        ({ commands }) => {
          const { start: from, end: to } = trackedChange;
          return commands.acceptTrackedChangesBetween(from, to);
        },

      acceptTrackedChangeBySelection:
        () =>
        ({ state, commands }) => {
          const { from, to } = state.selection;
          return commands.acceptTrackedChangesBetween(from, to);
        },

      acceptTrackedChangeFromToolbar:
        () =>
        ({ state, commands }) => {
          const commentsPluginState = CommentsPluginKey.getState(state);
          const activeThreadId = commentsPluginState?.activeThreadId;

          if (activeThreadId && commentsPluginState?.trackedChanges?.[activeThreadId]) {
            return commands.acceptTrackedChangeById(activeThreadId);
          } else {
            return commands.acceptTrackedChangeBySelection();
          }
        },

      acceptTrackedChangeById:
        (id) =>
        ({ state, tr, commands }) => {
          const toResolve = getChangesByIdToResolve(state, id) || [];

          return toResolve
            .map(({ from, to }) => {
              let mappedFrom = tr.mapping.map(from);
              let mappedTo = tr.mapping.map(to);
              return commands.acceptTrackedChangesBetween(mappedFrom, mappedTo);
            })
            .every((result) => result);
        },

      acceptAllTrackedChanges:
        () =>
        ({ state, commands }) => {
          const from = 0,
            to = state.doc.content.size;
          return commands.acceptTrackedChangesBetween(from, to);
        },

      rejectTrackedChangeById:
        (id) =>
        ({ state, tr, commands }) => {
          const toReject = getChangesByIdToResolve(state, id) || [];

          return toReject
            .map(({ from, to }) => {
              let mappedFrom = tr.mapping.map(from);
              let mappedTo = tr.mapping.map(to);
              return commands.rejectTrackedChangesBetween(mappedFrom, mappedTo);
            })
            .every((result) => result);
        },

      rejectTrackedChange:
        ({ trackedChange }) =>
        ({ commands }) => {
          const { start: from, end: to } = trackedChange;
          return commands.rejectTrackedChangesBetween(from, to);
        },

      rejectTrackedChangeOnSelection:
        () =>
        ({ state, commands }) => {
          const { from, to } = state.selection;
          return commands.rejectTrackedChangesBetween(from, to);
        },

      rejectTrackedChangeFromToolbar:
        () =>
        ({ state, commands }) => {
          const commentsPluginState = CommentsPluginKey.getState(state);
          const activeThreadId = commentsPluginState?.activeThreadId;

          if (activeThreadId && commentsPluginState?.trackedChanges?.[activeThreadId]) {
            return commands.rejectTrackedChangeById(activeThreadId);
          } else {
            return commands.rejectTrackedChangeOnSelection();
          }
        },

      rejectAllTrackedChanges:
        () =>
        ({ state, commands }) => {
          const from = 0,
            to = state.doc.content.size;
          return commands.rejectTrackedChangesBetween(from, to);
        },

      toggleTrackChanges:
        () =>
        ({ state }) => {
          const trackChangeState = TrackChangesBasePluginKey.getState(state);
          if (trackChangeState === undefined) return false;
          state.tr.setMeta(TrackChangesBasePluginKey, {
            type: 'TRACK_CHANGES_ENABLE',
            value: !trackChangeState.isTrackChangesActive,
          });
          return true;
        },

      enableTrackChanges:
        () =>
        ({ state }) => {
          state.tr.setMeta(TrackChangesBasePluginKey, {
            type: 'TRACK_CHANGES_ENABLE',
            value: true,
          });
          return true;
        },

      disableTrackChanges:
        () =>
        ({ state }) => {
          state.tr.setMeta(TrackChangesBasePluginKey, {
            type: 'TRACK_CHANGES_ENABLE',
            value: false,
          });
          return true;
        },

      toggleTrackChangesShowOriginal:
        () =>
        ({ state }) => {
          const trackChangeState = TrackChangesBasePluginKey.getState(state);
          if (trackChangeState === undefined) return false;
          state.tr.setMeta(TrackChangesBasePluginKey, {
            type: 'SHOW_ONLY_ORIGINAL',
            value: !trackChangeState.onlyOriginalShown,
          });
          return true;
        },

      enableTrackChangesShowOriginal:
        () =>
        ({ state }) => {
          state.tr.setMeta(TrackChangesBasePluginKey, {
            type: 'SHOW_ONLY_ORIGINAL',
            value: true,
          });
          return true;
        },

      disableTrackChangesShowOriginal:
        () =>
        ({ state }) => {
          state.tr.setMeta(TrackChangesBasePluginKey, {
            type: 'SHOW_ONLY_ORIGINAL',
            value: false,
          });
          return true;
        },

      toggleTrackChangesShowFinal:
        () =>
        ({ state }) => {
          const trackChangeState = TrackChangesBasePluginKey.getState(state);
          if (trackChangeState === undefined) return false;
          state.tr.setMeta(TrackChangesBasePluginKey, {
            type: 'SHOW_ONLY_MODIFIED',
            value: !trackChangeState.onlyModifiedShown,
          });
          return true;
        },

      enableTrackChangesShowFinal:
        () =>
        ({ state }) => {
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

const getChangesByIdToResolve = (state, id) => {
  const trackedChanges = getTrackChanges(state);
  const changeIndex = trackedChanges.findIndex(({ mark }) => mark.attrs.id === id);
  if (changeIndex === -1) return;

  const matchingChange = trackedChanges[changeIndex];
  const matchingId = matchingChange.mark.attrs.id;

  const getSegmentSize = ({ from, to }) => to - from;
  const areDirectlyConnected = (left, right) => {
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

  const isComplementaryPair = (firstType, secondType) =>
    (firstType === TrackDeleteMarkName && secondType === TrackInsertMarkName) ||
    (firstType === TrackInsertMarkName && secondType === TrackDeleteMarkName);

  const linkedBefore = [];
  const linkedAfter = [];

  const collectDirection = (direction, collection) => {
    let currentIndex = changeIndex;
    let currentChange = matchingChange;

    while (true) {
      const neighborIndex = currentIndex + direction;
      const neighbor = trackedChanges[neighborIndex];

      if (!neighbor) {
        break;
      }

      const [left, right] = direction < 0 ? [neighbor, currentChange] : [currentChange, neighbor];

      if (!areDirectlyConnected(left, right)) {
        break;
      }

      const sharesId = neighbor.mark.attrs.id === matchingId;
      const complementary = isComplementaryPair(currentChange.mark.type.name, neighbor.mark.type.name);

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
