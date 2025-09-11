// @ts-check
import { OxmlNode } from '@core/index.js';
import { Attribute } from '@core/index.js';
import { splitRun } from './commands/index.js';

export const RunNode = OxmlNode.create({
  name: 'run',

  oXmlName: 'w:r',

  group: 'inline',

  atom: false,

  // Allow any inline content inside runs (text, images, tabs, annotations, breaks, etc.)
  // This matches how Word wraps many inline constructs inside <w:r>.
  content: 'inline*',

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
