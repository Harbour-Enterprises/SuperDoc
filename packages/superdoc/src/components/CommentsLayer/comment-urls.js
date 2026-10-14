import { sanitizeHref } from '../../internal/toolbar/built-in/url-safety.js';

function isAbsoluteWebUrl(value) {
  if (!/^https?:\/\/[^\s/?#\\]+/i.test(value) || /[\s\\]/u.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function trimUrlPunctuation(value) {
  const closingDelimiter = { '(': ')', '[': ']', '{': '}' };
  const balance = { ')': 0, ']': 0, '}': 0 };
  for (const character of value) {
    const close = closingDelimiter[character];
    if (close) {
      balance[close] += 1;
    } else if (Object.hasOwn(balance, character)) {
      balance[character] -= 1;
    }
  }

  let end = value.length;
  while (end > 0) {
    const character = value[end - 1];
    if ('.,!?;:'.includes(character)) {
      end -= 1;
    } else if (balance[character] < 0) {
      balance[character] += 1;
      end -= 1;
    } else {
      break;
    }
  }
  return value.slice(0, end);
}

function configureLink(link, href) {
  link.setAttribute('href', href);
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');
}

/** Render links without rewriting stored comment HTML or its rich-text structure. */
export function renderCommentHtml(value) {
  if (typeof value !== 'string') return '';
  if (typeof document === 'undefined') return value;
  const template = document.createElement('template');
  template.innerHTML = value;

  for (const link of template.content.querySelectorAll('a')) {
    const safe = sanitizeHref(link.getAttribute('href'));
    // Preserve existing mail/tel links; only absolute web URLs are auto-detected.
    if (safe && (isAbsoluteWebUrl(safe.href) || /^(mailto|tel):\S+$/i.test(safe.href))) {
      configureLink(link, safe.href);
    } else {
      link.replaceWith(...link.childNodes);
    }
  }

  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  for (const node of textNodes) {
    if (node.parentElement?.closest('a, script, style, textarea, code, pre')) continue;
    const text = node.textContent;
    const fragment = document.createDocumentFragment();
    let end = 0;
    for (const match of text.matchAll(/(^|[\s([{])(https?:\/\/[^\s<>"']+)/gi)) {
      const href = trimUrlPunctuation(match[2]);
      if (!isAbsoluteWebUrl(href)) continue;
      const start = match.index + match[1].length;
      fragment.append(document.createTextNode(text.slice(end, start)));
      const link = document.createElement('a');
      configureLink(link, href);
      link.textContent = href;
      fragment.append(link);
      end = start + href.length;
    }
    if (end === 0) continue;
    fragment.append(document.createTextNode(text.slice(end)));
    node.replaceWith(fragment);
  }
  return template.innerHTML;
}
