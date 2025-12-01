import type { Node as PmNode } from 'prosemirror-model';

/**
 * Find all field annotations between positions.
 */
export function findFieldAnnotationsBetween(
  from: number,
  to: number,
  doc: PmNode,
): Array<{ node: PmNode; pos: number }> {
  const fieldAnnotations: Array<{ node: PmNode; pos: number }> = [];

  doc.nodesBetween(from, to, (node: PmNode, pos: number) => {
    if (!node || node?.nodeSize === undefined) {
      return;
    }

    if (node.type.name === 'fieldAnnotation') {
      fieldAnnotations.push({
        node,
        pos,
      });
    }
  });

  return fieldAnnotations;
}
