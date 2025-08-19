import { Node, Attribute } from '@core/index.js';
import { generateBlockUniqueId } from '@core/utilities/sdBlockUniqueId.js';

export const Heading = Node.create({
  name: 'heading',

  group: 'block',

  content: 'inline*',

  defining: true,

  addOptions() {
    return {
      levels: [1, 2, 3, 4, 5, 6],
      htmlAttributes: {
        'aria-label': 'Heading node',
      },
    };
  },

  addAttributes() {
    return {
      level: {
        default: 1,
        rendered: false,
      },
      tabStops: { rendered: false },
      sdBlockId: {
        default: generateBlockUniqueId(this.name),
        parseHTML: (elem) => elem.getAttribute('sd-block-id'),
        renderHTML: (attrs) => {
          if (!attrs.sdBlockId) return { 'sd-block-id': generateBlockUniqueId(this.name) };
          return {
            'sd-block-id': attrs.sdBlockId,
          };
        },
      },
    };
  },

  parseDOM() {
    return this.options.levels.map((level) => ({
      tag: `h${level}`,
      attrs: { level },
    }));
  },

  renderDOM({ node, htmlAttributes }) {
    const hasLevel = this.options.levels.includes(node.attrs.level);
    const level = hasLevel ? node.attrs.level : this.options.levels[0];
    return [`h${level}`, Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addCommands() {
    return {
      setHeading:
        (attributes) =>
        ({ commands }) => {
          const containsLevel = this.options.levels.includes(attributes.level);
          if (!containsLevel) return false;
          return commands.setNode(this.name, attributes);
        },
      toggleHeading:
        (attributes) =>
        ({ commands }) => {
          const containsLevel = this.options.levels.includes(attributes.level);
          if (!containsLevel) return false;
          return commands.toggleNode(this.name, 'paragraph', attributes);
        },
    };
  },

  addShortcuts() {
    return this.options.levels.reduce(
      (items, level) => ({
        ...items,
        ...{
          [`Mod-Alt-${level}`]: () => this.editor.commands.toggleHeading({ level }),
        },
      }),
      {},
    );
  },
});
