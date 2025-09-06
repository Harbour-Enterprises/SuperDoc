// @ts-check
import { Node } from '@core/index.js';

/**
 * Passthrough node to store content that should be passed through the editor without modification.
 */
export const PassthroughInline = Node.create({
  name: 'passthroughInline',

  inline: true,
  group: 'inline',
  atom: true,
  selectable: false,
  draggable: false,
  defining: true,
  marks: '',

  addAttributes() {
    return {
      payload: {
        default: null,
        rendered: false,
      },
    };
  },

  /**
   * Do not render this node to the DOM.
   */
  parseDOM() {
    return [];
  },

  renderDOM() {
    return [
      'span',
      {
        'data-node': 'passthroughInline',
        'aria-hidden': 'true',
        contenteditable: 'false',
        style: 'display:none !important;',
      },
    ];
  },
});
