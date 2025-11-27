import { Mark, Attribute } from '@core/index.js';
import { TrackFormatMarkName } from './constants.js';
import { parseFormatList } from './trackChangesHelpers/index.js';
import type { AttributeValue } from '@core/Attribute.js';
import type { Mark as PmMark } from 'prosemirror-model';

const trackFormatClass = 'track-format';

export const TrackFormat = Mark.create({
  name: TrackFormatMarkName,

  group: 'track',

  inclusive: false,

  addOptions() {
    return {
      htmlAttributes: {
        class: trackFormatClass,
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

      // {
      //   type: string, // the mark name
      //   attrs: object, // the mark attrs
      // }
      before: {
        default: [],
        parseDOM: (elem: HTMLElement) => {
          return parseFormatList(elem.getAttribute('data-before'));
        },
        renderDOM: (attrs: Record<string, AttributeValue>) => {
          if (!attrs.before) return {};
          return {
            'data-before': JSON.stringify(attrs.before),
          };
        },
      },

      // {
      //   type: string, // the mark name
      //   attrs: object, // the mark attrs
      // }
      after: {
        default: [],
        parseDOM: (elem: HTMLElement) => {
          return parseFormatList(elem.getAttribute('data-after'));
        },
        renderDOM: (attrs: Record<string, AttributeValue>) => {
          if (!attrs.after) return {};
          return {
            'data-after': JSON.stringify(attrs.after),
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
