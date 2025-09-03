// @ts-nocheck
// clipboardUtils.js

import { DOMSerializer, DOMParser } from 'prosemirror-model';

/**
 * Checks if clipboard read permission is granted and handles permission prompts.
 * Returns true if clipboard-read permission is granted. If state is "prompt" it will
 * proactively trigger a readText() call which will surface the browser permission
 * dialog to the user. Falls back gracefully in older browsers that lack the
 * Permissions API.
 * @returns {Promise<boolean>} Whether clipboard read permission is granted
 */
export async function ensureClipboardPermission() {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return false;
  }

  // Some older browsers do not expose navigator.permissions – assume granted
  if (!navigator.permissions || typeof navigator.permissions.query !== 'function') {
    return true;
  }

  try {
    // @ts-ignore – string literal is valid at runtime; TS lib DOM typing not available in .js file
    const status = await navigator.permissions.query({ name: 'clipboard-read' });

    if (status.state === 'granted') {
      return true;
    }

    if (status.state === 'prompt') {
      // Trigger a readText() to make the browser show its permission prompt.
      try {
        await navigator.clipboard.readText();
        return true;
      } catch {
        return false;
      }
    }

    // If we hit this area this is state === 'denied'
    return false;
  } catch {
    return false;
  }
}

/**
 * Serializes the current selection in the editor state to HTML and plain text for clipboard use.
 * @param {EditorState} state - The ProseMirror editor state containing the current selection.
 * @returns {{ htmlString: string, text: string }} An object with the HTML string and plain text of the selection.
 */
export function serializeSelectionToClipboard(state) {
  const { from, to } = state.selection;
  const slice = state.selection.content();
  const htmlContainer = document.createElement('div');
  htmlContainer.appendChild(DOMSerializer.fromSchema(state.schema).serializeFragment(slice.content));
  const htmlString = htmlContainer.innerHTML;
  const text = state.doc.textBetween(from, to);
  return { htmlString, text };
}

/**
 * Writes HTML and plain text data to the system clipboard.
 * Uses the Clipboard API if available, otherwise falls back to plain text.
 * @param {{ htmlString: string, text: string }} param0 - The HTML and plain text to write to the clipboard.
 * @returns {Promise<void>} A promise that resolves when the clipboard write is complete.
 */
export async function writeToClipboard({ htmlString, text }) {
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const clipboardItem = new window.ClipboardItem({
        'text/html': new Blob([htmlString], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      });
      await navigator.clipboard.write([clipboardItem]);
    } else {
      await navigator.clipboard.writeText(text);
    }
  } catch (e) {
    console.error('Error writing to clipboard', e);
  }
}

/**
 * Reads content from the system clipboard and parses it into a ProseMirror fragment.
 * Attempts to read HTML first, falling back to plain text if necessary.
 * @param {EditorState} state - The ProseMirror editor state, used for schema and parsing.
 * @returns {Promise<ProseMirrorNode|null>} A promise that resolves to a ProseMirror fragment or text node, or null if reading fails.
 */
export async function readFromClipboard(state) {
  let html = '';
  let text = '';
  const hasPermission = await ensureClipboardPermission();

  if (hasPermission && navigator.clipboard && navigator.clipboard.read) {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes('text/html')) {
          html = await (await item.getType('text/html')).text();
          break;
        } else if (item.types.includes('text/plain')) {
          text = await (await item.getType('text/plain')).text();
        }
      }
    } catch {
      // Fallback to plain text read; may still fail if permission denied
      try {
        text = await navigator.clipboard.readText();
      } catch {}
    }
  } else {
    // permissions denied or API unavailable; leave content empty
  }
  let content = null;
  if (html) {
    try {
      content = DOMParser.fromSchema(state.schema).parseSlice(
        new window.DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body,
      ).content;
    } catch (e) {
      console.error('error parsing html', e);
      // fallback to text
      content = state.schema.text(text);
    }
  }
  if (!content && text) {
    content = state.schema.text(text);
  }
  return content;
}
