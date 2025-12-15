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

    // const dfs = (node) => {
    //   const mark = node.marks.find(
    //     (mark) => mark.type.name === markName && Object.keys(attrs).every((attr) => mark.attrs[attr] === attrs[attr]),
    //   );

    //   if (mark) {
    //     return mark;
    //   }

    //   // In ProseMirror, node.content is a Fragment, children are in node.content.content
    //   const children = node.content?.content;
    //   if (Array.isArray(children)) {
    //     for (const child of children) {
    //       const found = dfs(child);
    //       if (found) {
    //         console.log('found on node:', child);
    //         return found;
    //       }
    //     }
    //   }

    //   return null;
    // };

    // const mark = dfs(node);

    if (mark && !markFound) {
      markFound = {
        from: pos,
        to: pos + node.nodeSize,
        mark,
      };
    }
  });

  const nodeAtEndPosition = doc.nodeAt(endPos);
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
