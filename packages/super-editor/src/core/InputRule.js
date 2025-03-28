import { Plugin, PluginKey } from 'prosemirror-state';
import { Fragment } from 'prosemirror-model';
import { CommandService } from './CommandService.js';
import { chainableEditorState } from './helpers/chainableEditorState.js';
import { getHTMLFromFragment } from './helpers/getHTMLFromFragment.js';
import { getTextContentFromNodes } from './helpers/getTextContentFromNodes.js';
import { isRegExp } from './utilities/isRegExp.js';

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
    },

    isInputRules: true,
  });
  return plugin;
}
