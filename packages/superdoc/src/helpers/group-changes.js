/**
 * Track changes helper
 * Combines replace transactions which are represented by insertion + deletion
 *
 * @param {Array} changes - Array of tracked changes from the editor
 * @returns {Array} Grouped track changes array with combined replacements
 */

export const groupChanges = (changes) => {
  const markMetaKeys = {
    trackInsert: 'insertedMark',
    trackDelete: 'deletionMark',
    trackFormat: 'formatMark',
  };
  const grouped = [];

  for (let i = 0; i < changes.length; i++) {
    const c1 = changes[i];
    const c2 = changes[i + 1];
    const c1Key = markMetaKeys[c1.mark.type.name];

    if (c1 && c2 && c1.to === c2.from && c1.mark.attrs.id === c2.mark.attrs.id) {
      const c2Key = markMetaKeys[c2.mark.type.name];
      grouped.push({
        from: c1.from,
        to: c2.to,
        [c1Key]: c1,
        [c2Key]: c2,
      });
      i++;
    } else {
      grouped.push({
        from: c1.from,
        to: c1.to,
        [c1Key]: c1,
      });
    }
  }
  return grouped;
};
