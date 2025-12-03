import type { Mark } from 'prosemirror-model';

/**
 * Represents a single tracked change in the document
 */
export interface Change {
  /** Start position of the change */
  from: number;
  /** End position of the change */
  to: number;
  /** ProseMirror mark containing the change metadata */
  mark: Mark;
}

/**
 * Represents a grouped change that may combine insertion, deletion, and formatting
 */
export interface GroupedChange {
  /** Start position of the grouped change */
  from: number;
  /** End position of the grouped change */
  to: number;
  /** Optional insertion mark */
  insertedMark?: Change;
  /** Optional deletion mark */
  deletionMark?: Change;
  /** Optional formatting mark */
  formatMark?: Change;
}

/**
 * Valid mark property keys for grouped changes
 */
type MarkKey = 'insertedMark' | 'deletionMark' | 'formatMark';

/**
 * Track changes helper
 * Combines replace transactions which are represented by insertion + deletion
 *
 * This function groups consecutive tracked changes that share the same ID and
 * are adjacent in the document. When two changes with the same ID are found
 * at adjacent positions, they are combined into a single GroupedChange object.
 *
 * @param changes - Array of tracked changes from the document
 * @returns Grouped track changes array with combined adjacent changes
 *
 * @example
 * const changes = [
 *   { from: 0, to: 5, mark: insertMark },
 *   { from: 5, to: 10, mark: deleteMark }
 * ];
 * const grouped = groupChanges(changes);
 * // Returns: [{ from: 0, to: 10, insertedMark: {...}, deletionMark: {...} }]
 */
export const groupChanges = (changes: Change[]): GroupedChange[] => {
  const markMetaKeys: Record<string, MarkKey> = {
    trackInsert: 'insertedMark',
    trackDelete: 'deletionMark',
    trackFormat: 'formatMark',
  };
  const grouped: GroupedChange[] = [];

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
