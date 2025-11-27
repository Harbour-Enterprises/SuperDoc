import { Attribute, Node } from '@core/index.js';
import type { DOMOutputSpec } from 'prosemirror-model';
import dotsLoader from '@superdoc/common/icons/dots-loader.svg';
import { AiLoaderNodeName } from './ai-constants.js';

export const AiLoaderNode = Node.create({
  name: AiLoaderNodeName,

  excludeFromSummaryJSON: true,

  group: 'inline',

  inline: true,

  atom: true,

  selectable: false,

  draggable: false,

  addOptions() {
    return {
      htmlAttributes: {
        class: 'sd-ai-loader',
        contentEditable: 'false',
        'aria-label': 'AI loader node',
      },
    };
  },

  parseDOM() {
    return [{ tag: 'span.sd-ai-loader' }];
  },

  renderDOM(...args: unknown[]): DOMOutputSpec {
    const { htmlAttributes } = (args[0] || {}) as { htmlAttributes?: Record<string, unknown> };
    const span = document.createElement('span');
    const options = this.options as { htmlAttributes?: Record<string, unknown> };
    Object.entries(Attribute.mergeAttributes(options.htmlAttributes || {}, htmlAttributes || {})).forEach(([k, v]) =>
      span.setAttribute(k, String(v)),
    );

    const img = document.createElement('img');
    img.src = dotsLoader;
    img.alt = 'loading...';
    img.width = 100;
    img.height = 50;
    span.appendChild(img);
    return span;
  },
});
