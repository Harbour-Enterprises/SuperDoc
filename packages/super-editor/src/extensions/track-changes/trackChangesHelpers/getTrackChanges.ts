import { TrackInsertMarkName, TrackDeleteMarkName, TrackFormatMarkName } from '../constants.js';
import { findInlineNodes } from './documentHelpers.js';
import type { EditorState } from 'prosemirror-state';
import type { Mark as PmMark } from 'prosemirror-model';

type TrackedChange = { mark: PmMark; from: number; to: number };

/**
 * Get track changes marks.
 * @param {import('prosemirror-state').EditorState} state
 * @param {string} id
 * @returns {Array} Array with track changes marks.
 */
export const getTrackChanges = (state: EditorState, id: string | null = null): TrackedChange[] => {
  const trackedChanges: TrackedChange[] = [];
  const allInlineNodes = findInlineNodes(state.doc, true);

  if (!allInlineNodes.length) {
    return trackedChanges;
  }

  allInlineNodes.forEach(({ node, pos }) => {
    const { marks } = node;
    const trackedMarks = [TrackInsertMarkName, TrackDeleteMarkName, TrackFormatMarkName];

    if (marks.length > 0) {
      marks.forEach((mark) => {
        if (trackedMarks.includes(mark.type.name)) {
          trackedChanges.push({
            mark,
            from: pos,
            to: pos + node.nodeSize,
          });
        }
      });
    }
  });

  if (id) {
    return trackedChanges.filter(({ mark }) => mark.attrs.id === id);
  }

  return trackedChanges;
};
