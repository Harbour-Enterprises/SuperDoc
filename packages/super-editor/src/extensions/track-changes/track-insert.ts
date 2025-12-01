import { Mark, Attribute } from '@core/index.js';
import { TrackInsertMarkName } from './constants.js';
import type { AttributeValue } from '@core/Attribute.js';
import type { Mark as PmMark } from 'prosemirror-model';

const trackInsertClass = 'track-insert';

export const TrackInsert = Mark.create({
  name: TrackInsertMarkName,

  group: 'track',

  inclusive: false,

  addOptions() {
    return {
      htmlAttributes: {
        class: trackInsertClass,
      },
    };
  },

  addAttributes() {
    return {
      id: {
        default: '',
        parseDOM: (elem: HTMLElement) => elem.getAttribute('data-id'),
        renderDOM: (attrs: Record<string, AttributeValue>) => {
          if (!attrs.id) return {};
          return {
            'data-id': attrs.id,
          };
        },
      },

      author: {
        default: '',
        parseDOM: (elem: HTMLElement) => elem.getAttribute('data-author'),
        renderDOM: (attrs: Record<string, AttributeValue>) => {
          if (!attrs.author) return {};
          return {
            'data-author': attrs.author,
          };
        },
      },

      authorEmail: {
        default: '',
        parseDOM: (elem: HTMLElement) => elem.getAttribute('data-authoremail'),
        renderDOM: (attrs: Record<string, AttributeValue>) => {
          if (!attrs.authorEmail) return {};
          return {
            'data-authoremail': attrs.authorEmail,
          };
        },
      },

      authorImage: {
        default: '',
        parseDOM: (elem: HTMLElement) => elem.getAttribute('data-authorimage'),
        renderDOM: (attrs: Record<string, AttributeValue>) => {
          if (!attrs.authorImage) return {};
          return {
            'data-authorimage': attrs.authorImage,
          };
        },
      },

      date: {
        default: '',
        parseDOM: (elem: HTMLElement) => elem.getAttribute('data-date'),
        renderDOM: (attrs: Record<string, AttributeValue>) => {
          if (!attrs.date) return {};
          return {
            'data-date': attrs.date,
          };
        },
      },

      importedAuthor: {
        default: '',
        rendered: false,
      },
    };
  },

  parseDOM() {
    return false;
  },

  renderDOM({
    htmlAttributes = {} as Record<string, AttributeValue>,
  }: {
    htmlAttributes: Record<string, AttributeValue>;
    mark?: PmMark;
  }) {
    const base = (this.options as { htmlAttributes?: Record<string, AttributeValue> }).htmlAttributes || {};
    const merged = Attribute.mergeAttributes(base as Record<string, AttributeValue>, htmlAttributes || {});
    return ['span', merged, 0];
  },
});
