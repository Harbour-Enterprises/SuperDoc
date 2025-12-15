/**
 * Find tracked mark between positions by mark name and attrs.
 */
export const findTrackedMarkBetween = ({
  tr,
  from,
  to,
  markName,
  attrs = {},
  offset = 1, // To get non-inclusive marks.
}) => {
  const { doc } = tr;

  const startPos = Math.max(from - offset, 0); // $from.start()
  const endPos = Math.min(to + offset, doc.content.size); // $from.end()

  let markFound;

  doc.nodesBetween(startPos, endPos, (node, pos) => {
    if (!node || node?.nodeSize === undefined) {
      return;
    }

    const mark = node.marks.find(
      (mark) => mark.type.name === markName && Object.keys(attrs).every((attr) => mark.attrs[attr] === attrs[attr]),
    );

    if (mark && !markFound) {
      markFound = {
        from: pos,
        to: pos + node.nodeSize,
        mark,
      };
    }
  });

  const nodeAtEndPosition = doc.nodeAt(endPos);
  // We wrap text nodes inside a run node but the `nodesBetween` above only return nodes that are contained inside the range
  // Since the text will be inside a run node, it likely won't be contained within the range, so we need to do this extra check
  if (nodeAtEndPosition?.type?.name === 'run') {
    const node = nodeAtEndPosition.content?.content?.[0];
    const isTextNode = node?.type?.name === 'text';
    if (isTextNode) {
      const mark = node.marks.find(
        (mark) => mark.type.name === markName && Object.keys(attrs).every((attr) => mark.attrs[attr] === attrs[attr]),
      );

      if (mark && !markFound) {
        markFound = {
          from: endPos,
          to: endPos + node.nodeSize,
          mark,
        };
      }
    }
  }
  return markFound;
};
