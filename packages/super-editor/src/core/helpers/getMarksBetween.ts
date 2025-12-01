import { getMarkRange } from './getMarkRange.js';
import type { Node as PmNode, Mark } from 'prosemirror-model';

type MarkWithRange = {
  mark: Mark;
  from: number;
  to: number;
};

export function getMarksBetween(from: number, to: number, doc: PmNode): MarkWithRange[] {
  const marks: MarkWithRange[] = [];

  // get all inclusive marks on empty selection
  if (from === to) {
    doc
      .resolve(from)
      .marks()
      .forEach((mark) => {
        const $pos = doc.resolve(from - 1);
        const range = getMarkRange($pos, mark.type);

        if (!range) {
          return;
        }

        marks.push({
          mark,
          ...range,
        });
      });
  } else {
    doc.nodesBetween(from, to, (node, pos) => {
      if (!node || node?.nodeSize === undefined) {
        return;
      }

      marks.push(
        ...node.marks.map((mark) => ({
          from: pos,
          to: pos + node.nodeSize,
          mark,
        })),
      );
    });
  }

  return marks;
}
