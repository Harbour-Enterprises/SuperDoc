// @ts-check
import { OxmlNode } from '@core/index.js';
import { Attribute } from '@core/index.js';
import { splitRun } from './commands/index.js';

export const RunNode = OxmlNode.create({
  name: 'run',

  oXmlName: 'w:r',

  group: 'inline',

  atom: false,

  // Allow explicit line and hard breaks inside runs, like Word
  content: '(text | lineBreak | hardBreak)*',

  inline: true,

  selectable: false,

  childToAttributes: ['runProperties'],

  parseDOM() {
    return [{ tag: 'span[data-w-run]' }];
  },

  renderDOM({ htmlAttributes }) {
    const baseAttrs = Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes);
    return ['span', baseAttrs, 0];
  },

  addOptions() {
    return {
      htmlAttributes: {
        'data-w-run': 'true',
      },
    };
  },

  addAttributes() {
    return {
      runProperties: {
        default: null,
        rendered: false,
        keepOnSplit: true,
      },
    };
  },

  addCommands() {
    return {
      splitRun,
    };
  },
});
