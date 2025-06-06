import { Plugin, PluginKey } from 'prosemirror-state';
import { Fragment, DOMParser } from 'prosemirror-model';
import { CommandService } from './CommandService.js';
import { chainableEditorState } from './helpers/chainableEditorState.js';
import { getHTMLFromFragment } from './helpers/getHTMLFromFragment.js';
import { getTextContentFromNodes } from './helpers/getTextContentFromNodes.js';
import { isRegExp } from './utilities/isRegExp.js';
import { handleDocxPaste } from './inputRules/docx-paste/docx-paste.js';


export class InputRule {
  match;
  handler;
  
  constructor(config) {
    this.match = config.match;
    this.handler = config.handler;
  }
}

const inputRuleMatcherHandler = (text, match) => {
  if (isRegExp(match)) {
    return match.exec(text);
  }

  const inputRuleMatch = match(text);

  if (!inputRuleMatch) {
    return null;
  }

  const result = [ inputRuleMatch.text ];
  
  result.index = inputRuleMatch.index;
  result.input = text;
  result.data = inputRuleMatch.data;

  if (inputRuleMatch.replaceWith) {
    if (!inputRuleMatch.text.includes(inputRuleMatch.replaceWith)) {
      console.warn(
        '[super-editor warn]: "inputRuleMatch.replaceWith" must be part of "inputRuleMatch.text".',
      );
    }

    result.push(inputRuleMatch.replaceWith);
  }

  return result;
}

const run = (config) => {
  const {
    editor, from, to, text, rules, plugin,
  } = config;
  const { view } = editor;

  if (view.composing) {
    return false;
  }

  const $from = view.state.doc.resolve(from);

  if (
    $from.parent.type.spec.code
    || !!($from.nodeBefore || $from.nodeAfter)?.marks.find(mark => mark.type.spec.code)
  ) {
    return false;
  }

  let matched = false;
  const textBefore = getTextContentFromNodes($from) + text;

  rules.forEach(rule => {
    if (matched) {
      return;
    }

    const match = inputRuleMatcherHandler(textBefore, rule.match)

    if (!match) {
      return
    }

    const tr = view.state.tr;
    const state = chainableEditorState(tr, view.state);
    const range = {
      from: from - (match[0].length - text.length),
      to,
    };

    const { commands, chain, can } = new CommandService({
      editor,
      state,
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
    });

    view.dispatch(tr);
    matched = true;
  })

  return matched;
}

/**
 * Create an input rules plugin. When enabled, it will cause text
 * input that matches any of the given rules to trigger the rule’s
 * action.
 */
export const inputRulesPlugin = ({ editor, rules }) => {
  const plugin = new Plugin({
    key: new PluginKey('inputRulesPlugin'),
    
    state: {
      init() {
        return null;
      },

      apply(tr, prev, state) {
        const stored = tr.getMeta(plugin);

        if (stored) {
          return stored;
        }

        // if InputRule is triggered by insertContent()
        const simulatedInputMeta = tr.getMeta('applyInputRules');
        const isSimulatedInput = !!simulatedInputMeta;

        if (isSimulatedInput) {
          setTimeout(() => {
            let { text } = simulatedInputMeta;

            if (typeof text !== 'string') {
              text = getHTMLFromFragment(Fragment.from(text), state.schema);
            }

            const { from } = simulatedInputMeta;
            const to = from + text.length;

            run({
              editor,
              from,
              to,
              text,
              rules,
              plugin,
            });
          })
        }

        return tr.selectionSet || tr.docChanged ? null : prev;
      },
    },
    
    props: {
      handleTextInput(view, from, to, text) {
        return run({
          editor,
          from,
          to,
          text,
          rules,
          plugin,
        })
      },
      
      // add support for input rules to trigger on enter
      // this is useful for example for code blocks
      handleKeyDown(view, event) {
        if (event.key !== 'Enter') {
          return false;
        }

        const { $cursor } = view.state.selection;

        if ($cursor) {
          return run({
            editor,
            from: $cursor.pos,
            to: $cursor.pos,
            text: '\n',
            rules,
            plugin,
          })
        }

        return false;
      },

      // Paste handler
      handlePaste(view, event, slice) {
        const clipboard = event.clipboardData;
        const html = clipboard.getData("text/html");
        const text = clipboard.getData("text/plain");
        const fieldAnnotationContent = slice.content.content.filter((item) => item.type.name === 'fieldAnnotation');

        if (fieldAnnotationContent.length) {
          // The paste event will be handled here.
          // packages/super-editor/src/extensions/field-annotation/FieldAnnotationPlugin.js
          return false;
        }

        let source;
        if (!html) {
          source = "plain-text";
        } else if (isWordHtml(html)) {
          source = "word-html";
        } else {
          source = "browser-html";
        }

        switch (source) {
          case "plain-text":
            break;
          case "word-html":
            if (editor.options.mode === "docx") {
              return handleDocxPaste(html, editor, view, plugin);
            }
          case "browser-html":
            return handleHtmlPaste(html, editor, view, plugin);
        }

        return false;
      }
    },

    isInputRules: true,
  });
  return plugin;
}

function isWordHtml(html) {
  return /class=["']?Mso|xmlns:o=["']?urn:schemas-microsoft-com|<!--\[if gte mso|<meta[^>]+name=["']?Generator["']?[^>]+Word/i.test(html);
}

/**
 * Handle HTML paste events.
 *
 * @param {String} html The HTML string to be pasted.
 * @param {Editor} editor The editor instance.
 * @returns {Boolean} Returns true if the paste was handled.
 */
const handleHtmlPaste = (html, editor, plugin) => {
  const cleanedHtml = convertEmToPt(html);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = cleanedHtml;

  const doc = DOMParser.fromSchema(editor.schema).parse(tempDiv)
  tempDiv.remove();

  const { dispatch } = editor.view;
  if (!dispatch) return false;

  dispatch(editor.view.state.tr.replaceSelectionWith(doc, true));
  return true;
};

/**
 * Process the HTML string to convert em units to pt units in font-size
 * 
 * @param {String} html The HTML string to be processed.
 * @returns {String} The processed HTML string with em units converted to pt units.
 */
export const convertEmToPt = (html) => {
  return html.replace(
    /font-size\s*:\s*([\d.]+)em/gi,
    (_, emValue) => {
      const em = parseFloat(emValue);
      const pt = Math.round(em * 12 * 100) / 100;   // e.g. 1.5×12 = 18.00
      return `font-size: ${pt}pt`;
    }
  )
};
