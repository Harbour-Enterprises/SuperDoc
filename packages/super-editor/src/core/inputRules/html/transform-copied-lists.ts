/**
 * Handler for copied content which transforms list for Google Docs/Word.
 *
 * @param html The copied html content
 * @returns Result html to be inserted in clipboard data
 */

export const transformListsInCopiedContent = (html: string): string => {
  const container = document.createElement('div');
  container.innerHTML = html;

  const result: string[] = [];
  const stack: Array<{ tag: string; level: number; el: HTMLElement }> = [];

  const flushStackUntil = (level: number): void => {
    while (stack.length && stack[stack.length - 1].level >= level) {
      const top = stack.pop()!;
      if (stack.length) {
        stack[stack.length - 1].el.appendChild(top.el);
      } else {
        result.push(top.el.outerHTML);
      }
    }
  };

  Array.from(container.childNodes).forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      result.push((node as Element).outerHTML || node.textContent || '');
      return;
    }

    const element = node as HTMLElement;

    if (element.tagName.toLowerCase() === 'ol' || element.tagName.toLowerCase() === 'ul') {
      const child = getFirstElementChild(element);
      if (!child) return;

      const level = getLevel(child);
      const numFmt = child.getAttribute('data-num-fmt');
      const lvlText = child.getAttribute('data-lvl-text');
      const tag = element.tagName.toLowerCase();

      const li = child.cloneNode(true) as HTMLElement;
      li.setAttribute('aria-level', String(level + 1));
      (li.style as unknown as { 'list-style-type': string })['list-style-type'] = getListStyleType(numFmt, lvlText);

      // if current level not open, create new list
      if (!stack.length || stack[stack.length - 1].level < level) {
        const newList = document.createElement(tag);
        stack.push({ tag, level, el: newList });
      } else if (stack[stack.length - 1].level > level) {
        flushStackUntil(level + 1);
      } else if (stack[stack.length - 1].tag !== tag) {
        flushStackUntil(level);
        const newList = document.createElement(tag);
        stack.push({ tag, level, el: newList });
      }
      stack[stack.length - 1].el.appendChild(li);
    } else {
      flushStackUntil(0);
      result.push(element.outerHTML);
    }
  });

  // Flush remaining stack
  flushStackUntil(0);

  return result.join('');
};

/**
 * Returns value for list-style-type attribute of copied content
 */
export const getListStyleType = (numFmt: string | null, lvlText: string | null): string => {
  const bulletFmtMap = new Map([
    ['●', 'disc'],
    ['◦', 'circle'],
    ['▪', 'square'],
  ]);

  if (numFmt === 'bullet') return bulletFmtMap.get(lvlText || '') || 'disc';

  const fmtMap = new Map([
    ['decimal', 'decimal'],
    ['lowerLetter', 'lower-alpha'],
    ['upperLetter', 'upper-alpha'],
    ['lowerRoman', 'lower-roman'],
    ['upperRoman', 'upper-roman'],
  ]);

  return lvlText?.startsWith('0') ? 'decimal-leading-zero' : fmtMap.get(numFmt || '') || 'decimal';
};

/**
 * Get first child of Element type
 */
function getFirstElementChild(node: HTMLElement): HTMLElement | null {
  return (Array.from(node.childNodes).find((n) => n.nodeType === Node.ELEMENT_NODE) as HTMLElement) || null;
}

/**
 * Returns parsed list level
 */
export const getLevel = (node: HTMLElement): number => {
  const lvl = node.getAttribute('data-level');
  return lvl ? parseInt(lvl, 10) : 0;
};
