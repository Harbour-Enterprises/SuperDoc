import { findFieldAnnotationsByFieldId } from '../fieldAnnotationHelpers/index.js';

/**
 * Clean up paragraphs that contain field annotations marked for deletion.
 * If a paragraph has only one field annotation and no other content,
 * it will be deleted.
 * @param {string[]} fieldsToDelete - Array of field IDs to delete.
 * @returns {function} A ProseMirror command function.
 */
export const cleanUpParagraphWithAnnotations =
  (fieldsToDelete = []) =>
  ({ dispatch, tr, state }) => {
    if (!dispatch) return true;
    const annotations = findFieldAnnotationsByFieldId(fieldsToDelete, state) || [];
    const nodesToDelete = [];
    const { doc } = state;

    annotations.forEach((annotation) => {
      let { pos, node } = annotation;
      let newPosFrom = tr.mapping.map(pos);

      const resolvedPos = doc.resolve(newPosFrom);
      const parent = resolvedPos.parent;

      let currentNode = tr.doc.nodeAt(newPosFrom);
      if (node.eq(currentNode) && parent?.children?.length < 2) {
        nodesToDelete.push({ pos: newPosFrom, node: parent });
      }
    });

    if (!nodesToDelete.length) return true;

    nodesToDelete
      .sort((a, b) => b.pos - a.pos)
      .forEach(({ pos, node }) => {
        tr.delete(pos, pos + node.nodeSize);
      });

    return true;
  };
