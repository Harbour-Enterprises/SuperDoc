import { Node, Attribute } from '@core/index.js';
import { generateDocxListAttributes } from '@helpers/index.js';
import { wrappingInputRule } from '../../core/inputRules/wrappingInputRule.js';

/**
 * Matches a bullet list to a dash or asterisk.
 */
const inputRegex = /^\s*([-+*])\s$/;

export const BulletList = Node.create({
  name: 'bulletList',

  group: 'block list',

  content() {
    return `${this.options.itemTypeName}+`;
  },

  addOptions() {
    return {
      itemTypeName: 'listItem',
      htmlAttributes: {
        'aria-label': 'Bullet list node'
      },
      keepMarks: true,
      keepAttributes: false,
    };
  },

  parseDOM() {
    return [{ tag: 'ul' }];
  },

  renderDOM({ htmlAttributes }) {
    const attributes = Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes);
    return ['ul', attributes, 0];
  },

  addAttributes() {
    return {
      'list-style-type': {
        default: 'bullet',
        rendered: false,
      },

      listId: {
        rendered: false,
      },

      attributes: {
        rendered: false,
        keepOnSplit: true,
      },
    };
  },

  addCommands() {
    return {
      toggleBulletList: () => (props) => {
        const { commands, chain } = props;
        return commands.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks);
      },
    };
  },

  addShortcuts() {
    return {
      'Mod-Shift-8': () => {
        return this.editor.commands.toggleBulletList();
      },
    };
  },

  // Input rules.
  addInputRules() {
    let inputRule = wrappingInputRule({
      match: inputRegex,
      type: this.type,
    })

    if (this.options.keepMarks || this.options.keepAttributes) {
      inputRule = wrappingInputRule({
        match: inputRegex,
        type: this.type,
        keepMarks: this.options.keepMarks,
        keepAttributes: this.options.keepAttributes,
        getAttributes: () => { return this.editor.getAttributes('textStyle') },
        editor: this.editor,
      })
    }
    return [
      inputRule,
    ];
  },
});
