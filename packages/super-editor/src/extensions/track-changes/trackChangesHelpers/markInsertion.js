import { TrackInsertMarkName, TrackDeleteMarkName } from '../constants.js';
import { generateTrackedChangeId } from './generateTrackedChangeId.js';

/**
 * Mark insertion.
 * @param {Object} options
 * @param {Object} options.tr Transaction.
 * @param {number} options.from From position.
 * @param {number} options.to To position.
 * @param {Object} options.user User object ({ name, email }).
 * @param {string} options.date Date.
 * @returns {Object} Insertion mark.
 */
export const markInsertion = ({ tr, from, to, user, date }) => {
  tr.removeMark(from, to, tr.doc.type.schema.marks[TrackDeleteMarkName]);
  tr.removeMark(from, to, tr.doc.type.schema.marks[TrackInsertMarkName]);

  // Use smart ID generation based on logical grouping rules
  const id = generateTrackedChangeId({
    tr,
    from,
    to,
    changeType: 'insert',
    user,
  });

  const insertionMark = tr.doc.type.schema.marks[TrackInsertMarkName].create({
    id,
    author: user.name,
    authorEmail: user.email,
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
