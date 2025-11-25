import { Node } from '@core/index.js';

const sharedAttributes = () => ({
  originalName: {
    default: null,
  },
  originalXml: {
    default: null,
  },
});

const hiddenRender = (type) => ['sd-passthrough', { 'data-sd-passthrough': type, style: 'display: none;' }];

export const PassthroughBlock = Node.create({
  name: 'passthroughBlock',
  group: 'block',
  atom: true,
  isolating: true,
  draggable: false,
  selectable: false,
  defining: true,

  parseDOM() {
    return [{ tag: 'sd-passthrough[data-sd-passthrough="block"]' }];
  },

  renderDOM() {
    return hiddenRender('block');
  },

  addAttributes() {
    return sharedAttributes();
  },
});

export const PassthroughInline = Node.create({
  name: 'passthroughInline',
  group: 'inline',
  inline: true,
  atom: true,
  isolating: true,
  draggable: false,
  selectable: false,

  parseDOM() {
    return [{ tag: 'sd-passthrough[data-sd-passthrough="inline"]' }];
  },

  renderDOM() {
    return hiddenRender('inline');
  },

  addAttributes() {
    return sharedAttributes();
  },
});
