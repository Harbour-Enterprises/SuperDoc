/**
 * Find the closest word when double click event fires.
 * @param doc view document.
 * @param pos event position.
 * @returns position of the word.
 */
export const findWordBounds = (doc, pos) => {
  const $pos = doc.resolve(pos);
  const parent = $pos.parent;
  const offset = $pos.parentOffset;
  const text = parent.textContent;

  if (!text) return { from: pos, to: pos };

  let start = offset, end = offset;

  // Adjust start to the beginning of the word
  while (start > 0 && /\w/.test(text[start - 1])) start--;
  // Adjust end to the end of the word
  while (end < text.length && /\w/.test(text[end])) end++;

  const from = $pos.start() + start;
  const to = $pos.start() + end;

  return { from, to };
};
