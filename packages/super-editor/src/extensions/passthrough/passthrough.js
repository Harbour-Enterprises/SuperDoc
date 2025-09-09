import { Node } from '@core/index.js';

export const DocxPassthroughBlock = Node.create({
  name: 'docxPassthroughBlock',
  group: 'block',
  atom: true,
  selectable: false,
  defining: false,
  addAttributes() {
    return {
      originalXml: {
        default: null,
      },
    };
  },
  parseDOM() {
    return [];
  },
  renderDOM() {
    return ['div', { 'data-docx-passthrough': 'block', style: 'display:none' }];
  },
});

export const DocxPassthroughInline = Node.create({
  name: 'docxPassthroughInline',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,
  addAttributes() {
    return {
      originalXml: {
        default: null,
      },
    };
  },
  parseDOM() {
    return [];
  },
  renderDOM() {
    return ['span', { 'data-docx-passthrough': 'inline', style: 'display:none' }];
  },
});
