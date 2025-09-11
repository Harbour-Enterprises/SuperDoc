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

    // Optional visual boundary for debugging run nodes
    const showBoundaries =
      this.options.showBoundaries === true || (typeof window !== 'undefined' && window.SUPERDOC_SHOW_RUNS === true);

    const boundaryAttrs = showBoundaries
      ? {
          'data-run-boundary': 'true',
          style: this.options.boundaryStyle || 'outline: 1px dashed rgba(255,0,0,.85); outline-offset: -1px',
        }
      : undefined;

    return ['span', Attribute.mergeAttributes(baseAttrs, boundaryAttrs), 0];
  },

  addOptions() {
    return {
      htmlAttributes: {
        'data-w-run': 'true',
      },
      // Set to true to show visual run boundaries. Can also toggle via window.SUPERDOC_SHOW_RUNS = true
      showBoundaries: false,
      // Customize the style used for the boundary visualization
      boundaryStyle: 'outline: 1px dashed rgba(255,0,0,.85); outline-offset: -1px',
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
