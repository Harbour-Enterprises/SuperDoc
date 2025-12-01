import { v4 as uuidv4 } from 'uuid';
import { TrackInsertMarkName, TrackDeleteMarkName } from '../constants.js';
import { findTrackedMarkBetween, type TrackedMark } from './findTrackedMarkBetween.js';
import type { Transaction } from 'prosemirror-state';
import type { Mark as PmMark } from 'prosemirror-model';
import type { User } from '@core/types/EditorConfig.js';

/**
 * Mark insertion.
 * @param {Transaction} options.tr Transaction.
 * @param {number} options.from From position.
 * @param {number} options.to To position.
 * @param {object} options.user User object ({ name, email }).
 * @param {string} options.date Date.
 * @returns {Mark} Insertion mark.
 */
export const markInsertion = ({
  tr,
  from,
  to,
  user,
  date,
}: {
  tr: Transaction;
  from: number;
  to: number;
  user: User;
  date: string;
}): PmMark => {
  tr.removeMark(from, to, tr.doc.type.schema.marks[TrackDeleteMarkName]);
  tr.removeMark(from, to, tr.doc.type.schema.marks[TrackInsertMarkName]);

  const trackedMark: TrackedMark | undefined = findTrackedMarkBetween({
    tr,
    from,
    to,
    markName: TrackInsertMarkName,
    attrs: { authorEmail: user.email },
  });

  const id = trackedMark ? (trackedMark.mark.attrs.id as string) : uuidv4();

  const insertionMark = tr.doc.type.schema.marks[TrackInsertMarkName].create({
    id,
    author: user.name,
    authorEmail: user.email,
    authorImage: user.image,
    date,
  });

  tr.addMark(from, to, insertionMark);

  // Add insertion mark also to block nodes (figures, text blocks) but not table cells/rows and lists.
  tr.doc.nodesBetween(from, to, (node, pos) => {
    if (pos < from || ['bulletList', 'orderedList'].includes(node.type.name)) {
      return true;
    } else if (node.isInline || ['tableRow', 'tableCell'].includes(node.type.name)) {
      return false;
    }

    if (node.attrs.track) {
      // Skip for now.
    }

    if (node.type.name === 'table') {
      // A table was inserted. We don't add track marks to elements inside of it.
      return false;
    }
  });

  return insertionMark;
};
