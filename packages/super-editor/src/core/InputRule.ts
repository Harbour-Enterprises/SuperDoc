import { Plugin, PluginKey } from 'prosemirror-state';
import type { EditorState, Transaction } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { Slice, Fragment, DOMParser as PMDOMParser } from 'prosemirror-model';
import type { ResolvedPos } from 'prosemirror-model';
import { CommandService } from './CommandService.js';
import { chainableEditorState } from './helpers/chainableEditorState.js';
import { getHTMLFromFragment } from './helpers/getHTMLFromFragment.js';
import { getTextContentFromNodes } from './helpers/getTextContentFromNodes.js';
import { isRegExp } from './utilities/isRegExp.js';
import { handleDocxPaste, wrapTextsInRuns } from './inputRules/docx-paste/docx-paste.js';
import { flattenListsInHtml } from './inputRules/html/html-helpers.js';
import { handleGoogleDocsHtml } from './inputRules/google-docs-paste/google-docs-paste.js';
import type { Editor } from './Editor.js';
import type { ChainableCommandObject, CanObject, EditorCommands } from './types/ChainedCommands.js';

/**
 * Match result from input rule matching
 */
export interface InputRuleMatch extends Array<string> {
  index?: number;
  input?: string;
  data?: unknown;
  text?: string;
  replaceWith?: string;
}

/**
 * Input rule handler context
 */
export interface InputRuleHandlerContext {
  state: EditorState;
  range: {
    from: number;
    to: number;
  };
  match: InputRuleMatch;
  commands: EditorCommands;
  chain: () => ChainableCommandObject;
  can: () => CanObject;
}

/**
 * Input rule configuration
 */
export interface InputRuleConfig {
  match: RegExp | ((text: string) => InputRuleMatch | null);
  handler: (context: InputRuleHandlerContext) => unknown;
}

/**
 * Input rules plugin configuration
 */
export interface InputRulesPluginConfig {
  editor: Editor;
  rules: InputRule[];
}

/**
 * Run configuration for input rules
 */
interface RunConfig {
  editor: Editor;
  from: number;
  to: number;
  text: string;
  rules: InputRule[];
  plugin: Plugin;
}

/**
 * Metadata stored in transaction when input rule is triggered
 */
interface InputRuleMeta {
  transform: Transaction;
  from: number;
  to: number;
  text: string;
}

/**
 * Metadata for simulated input
 */
interface SimulatedInputMeta {
  text: string | Fragment;
  from: number;
}

export class InputRule {
  match: RegExp | ((text: string) => InputRuleMatch | null);
  handler: (context: InputRuleHandlerContext) => unknown;

  constructor(config: InputRuleConfig) {
    this.match = config.match;
    this.handler = config.handler;
  }
}

const inputRuleMatcherHandler = (
  text: string,
  match: RegExp | ((text: string) => InputRuleMatch | null),
): InputRuleMatch | null => {
  if (isRegExp(match)) {
    return match.exec(text) as InputRuleMatch | null;
  }

  const inputRuleMatch = match(text);

  if (!inputRuleMatch) {
    return null;
  }

  const matchedText = inputRuleMatch.text ?? inputRuleMatch.input ?? '';
  const result: InputRuleMatch = [matchedText] as InputRuleMatch;

  result.index = inputRuleMatch.index;
  result.input = text;
  result.data = inputRuleMatch.data;

  if (inputRuleMatch.replaceWith) {
    if (matchedText && !matchedText.includes(inputRuleMatch.replaceWith)) {
      console.warn('[super-editor warn]: "inputRuleMatch.replaceWith" must be part of "inputRuleMatch.text".');
    }

    result.push(inputRuleMatch.replaceWith);
  }

  return result;
};

const run = (config: RunConfig): boolean => {
  const { editor, from, to, text, rules, plugin } = config;
  const { view } = editor;

  if (view.composing) {
    return false;
  }

  const $from = view.state.doc.resolve(from);

  if (
    $from.parent.type.spec.code ||
    !!($from.nodeBefore || $from.nodeAfter)?.marks.find((mark) => mark.type.spec.code)
  ) {
    return false;
  }

  let matched = false;
  const textBefore = getTextContentFromNodes($from) + text;

  rules.forEach((rule) => {
    if (matched) {
      return;
    }

    const match = inputRuleMatcherHandler(textBefore, rule.match);

    if (!match) {
      return;
    }

    const tr = view.state.tr;
    const state = chainableEditorState(tr, view.state);
    const range = {
      from: from - (match[0].length - text.length),
      to,
    };

    const { commands, chain, can } = new CommandService({
      editor,
    });

    const handler = rule.handler({
      state,
      range,
      match,
      commands,
      chain,
      can,
    });

    // stop if there are no changes
    if (handler === null || !tr.steps.length) {
      return;
    }

    // store transform as metadata
    // so we can undo input rules within the `undoInputRules` command
    tr.setMeta(plugin, {
      transform: tr,
      from,
      to,
      text,
    } as InputRuleMeta);

    view.dispatch(tr);
    matched = true;
  });

  return matched;
};

/**
 * Create an input rules plugin. When enabled, it will cause text
 * input that matches any of the given rules to trigger the rule's
 * action.
 */
export const inputRulesPlugin = ({ editor, rules }: InputRulesPluginConfig): Plugin => {
  const plugin: Plugin = new Plugin({
    key: new PluginKey('inputRulesPlugin'),

    state: {
      init(): InputRuleMeta | null {
        return null;
      },

      apply(tr: Transaction, prev: InputRuleMeta | null, _oldState: EditorState): InputRuleMeta | null {
        const stored = tr.getMeta(plugin) as InputRuleMeta | undefined;

        if (stored) {
          return stored;
        }

        // if InputRule is triggered by insertContent()
        const simulatedInputMeta = tr.getMeta('applyInputRules') as SimulatedInputMeta | undefined;
        const isSimulatedInput = !!simulatedInputMeta;

        if (isSimulatedInput) {
          setTimeout(() => {
            let { text } = simulatedInputMeta;

            if (typeof text !== 'string') {
              text = getHTMLFromFragment(Fragment.from(text), _oldState.schema);
            }

            const { from } = simulatedInputMeta;
            const to = from + (text as string).length;

            run({
              editor,
              from,
              to,
              text: text as string,
              rules,
              plugin,
            });
          });
        }

        return tr.selectionSet || tr.docChanged ? null : prev;
      },
    },

    props: {
      handleTextInput(view: EditorView, from: number, to: number, text: string): boolean {
        return run({
          editor,
          from,
          to,
          text,
          rules,
          plugin,
        });
      },

      // add support for input rules to trigger on enter
      // this is useful for example for code blocks
      handleKeyDown(view: EditorView, event: KeyboardEvent): boolean {
        if (event.key !== 'Enter') {
          return false;
        }

        const { $cursor } = view.state.selection as { $cursor?: ReturnType<typeof view.state.doc.resolve> };

        if ($cursor) {
          return run({
            editor,
            from: $cursor.pos,
            to: $cursor.pos,
            text: '\n',
            rules,
            plugin,
          });
        }

        return false;
      },

      // Paste handler
      handlePaste(view: EditorView, event: ClipboardEvent, slice: Slice): boolean {
        const clipboard = event.clipboardData;
        const html = clipboard?.getData('text/html') || '';

        // Allow specialised plugins (e.g., field-annotation) first shot.
        const fieldAnnotationContent = slice.content.content.filter((item) => item.type.name === 'fieldAnnotation');
        if (fieldAnnotationContent.length) {
          return false;
        }

        const result = handleClipboardPaste({ editor, view }, html);
        return result;
      },
    },

    isInputRules: true,
  });
  return plugin;
};

export function isWordHtml(html: string): boolean {
  return /class=["']?Mso|xmlns:o=["']?urn:schemas-microsoft-com|<!--\[if gte mso|<meta[^>]+name=["']?Generator["']?[^>]+Word/i.test(
    html,
  );
}

function isGoogleDocsHtml(html: string): boolean {
  return /docs-internal-guid-/.test(html);
}

/**
 * Finds the first paragraph ancestor of a resolved position.
 *
 * @param {ResolvedPos} $from The resolved position to search from.
 * @returns {{ node: Node | null, depth: number }} The paragraph node and its depth, or null if not found.
 */
function findParagraphAncestor($from: ResolvedPos) {
  for (let d = $from.depth; d >= 0; d--) {
    const node = $from.node(d);
    if (node.type.name === 'paragraph') {
      return { node, depth: d };
    }
  }
  return { node: null, depth: -1 };
}

/**
 * Handle HTML paste events.
 *
 * @param html The HTML string to be pasted.
 * @param editor The editor instance.
 * @param source HTML content source
 * @returns Returns true if the paste was handled.
 */
export function handleHtmlPaste(html: string, editor: Editor, _source?: string): boolean {
  const cleanedHtml = htmlHandler(html, editor);

  let doc = PMDOMParser.fromSchema(editor.schema).parse(cleanedHtml);

  doc = wrapTextsInRuns(doc);

  const { dispatch, state } = editor.view;
  if (!dispatch) {
    return false;
  }

  // Check if we're pasting into an existing paragraph
  // Need to check ancestors since cursor might be inside a run node within a paragraph
  const { $from } = state.selection;

  // Find if any ancestor is a paragraph
  const { node: paragraphNode } = findParagraphAncestor($from);

  const isInParagraph = paragraphNode !== null;

  // Check if the pasted content is a single paragraph
  const isSingleParagraph = doc.childCount === 1 && doc.firstChild?.type.name === 'paragraph';

  if (isInParagraph && isSingleParagraph) {
    // Extract the contents of the paragraph and paste only those
    const paragraphContent = doc.firstChild!.content;
    // Use replaceSelection instead of replaceSelectionWith for fragments
    const tr = state.tr.replaceSelection(new Slice(paragraphContent, 0, 0));
    dispatch(tr);
  } else if (isInParagraph) {
    // For multi-paragraph paste, use replaceSelection with a proper Slice
    // This preserves the paragraph structure instead of flattening with \n
    // Create a slice from the doc's content (the paragraphs)
    const slice = new Slice(doc.content, 0, 0);

    const tr = state.tr.replaceSelection(slice);
    dispatch(tr);
  } else {
    // Use the original behavior for other cases
    dispatch(state.tr.replaceSelectionWith(doc, true));
  }

  return true;
}

/**
 * Handle HTML content before it is inserted into the editor.
 * This function is used to clean and sanitize HTML content,
 * converting em units to pt and removing unnecessary tags.
 * @param html The HTML string to be processed.
 * @param editor The editor instance.
 * @returns The processed HTML string.
 */
export function htmlHandler(html: string, editor: Editor): DocumentFragment {
  const flatHtml = flattenListsInHtml(html, editor);
  const htmlWithPtSizing = convertEmToPt(flatHtml);
  return sanitizeHtml(htmlWithPtSizing);
}

/**
 * Process the HTML string to convert em units to pt units in font-size
 *
 * @param html The HTML string to be processed.
 * @returns The processed HTML string with em units converted to pt units.
 */
export const convertEmToPt = (html: string): string => {
  return html.replace(/font-size\s*:\s*([\d.]+)em/gi, (_match, emValue: string) => {
    const em = parseFloat(emValue);
    const pt = Math.round(em * 12 * 100) / 100; // e.g. 1.5×12 = 18.00
    return `font-size: ${pt}pt`;
  });
};

/**
 *  Cleans and sanitizes HTML content by removing unnecessary tags, entities, and extra whitespace.
 *
 * @param html The HTML string to be processed.
 * @returns The processed HTML string with em units converted to pt units.
 */
export function cleanHtmlUnnecessaryTags(html: string): string {
  return html
    .replace(/<o:p>.*?<\/o:p>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<span[^>]*>\s*<\/span>/gi, '')
    .replace(/<p[^>]*>\s*<\/p>/gi, '')
    .trim();
}

/**
 * Recursive function to sanitize HTML and remove forbidden tags.
 * @param html The HTML string to be sanitized.
 * @param forbiddenTags The list of forbidden tags to remove from the HTML.
 * @returns The sanitized HTML as a DocumentFragment.
 */
export function sanitizeHtml(
  html: string,
  forbiddenTags: string[] = ['meta', 'svg', 'script', 'style', 'button'],
): DocumentFragment {
  const container = document.createElement('div');
  container.innerHTML = html;

  const walkAndClean = (node: Element): void => {
    const children = Array.from(node.children);
    for (const child of children) {
      if (forbiddenTags.includes(child.tagName.toLowerCase())) {
        child.remove();
        continue;
      }

      // Remove linebreaktype here - we don't want it when pasting HTML
      if (child.hasAttribute('linebreaktype')) {
        child.removeAttribute('linebreaktype');
      }

      walkAndClean(child);
    }
  };

  walkAndClean(container);
  return container as unknown as DocumentFragment;
}

/**
 * Reusable paste-handling utility that replicates the logic formerly held only
 * inside the `inputRulesPlugin` paste handler. This allows other components
 * (e.g. slash-menu items) to invoke the same paste logic without duplicating
 * code.
 *
 * @param params
 * @param params.editor  The SuperEditor instance.
 * @param params.view    The ProseMirror view associated with the editor.
 * @param html           HTML clipboard content (may be empty).
 * @returns              Whether the paste was handled.
 */
export function handleClipboardPaste({ editor, view }: { editor: Editor; view: EditorView }, html: string): boolean {
  let source: string;

  if (!html) {
    source = 'plain-text';
  } else if (isWordHtml(html)) {
    source = 'word-html';
  } else if (isGoogleDocsHtml(html)) {
    source = 'google-docs';
  } else {
    source = 'browser-html';
  }

  switch (source) {
    case 'plain-text':
      // Let native/plain text paste fall through so ProseMirror handles it.
      // Will hit the Fallback when boolean is returned false
      return false;
    case 'word-html':
      if (editor.options.mode === 'docx') {
        return handleDocxPaste(html, editor, view);
      }
      break;
    case 'google-docs':
      return handleGoogleDocsHtml(html, editor, view);
    // falls through to browser-html handling when not in DOCX mode
    case 'browser-html':
      return handleHtmlPaste(html, editor);
  }

  return false;
}
