import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { Node, Attribute, Schema } from '@core/index.js';
import { getSpacingStyleString, getMarksStyle } from '@extensions/linked-styles/index.js';

export const Paragraph = Node.create({
  name: 'paragraph',

  priority: 1000,

  group: 'block',

  content: 'inline*',

  inline: false,

  addOptions() {
    return {
      htmlAttributes: {},
    };
  },

  addAttributes() {
    return {
      spacing: {
        renderDOM: (attrs) => {
          const { spacing } = attrs;
          if (!spacing) return {};

          const style = getSpacingStyleString(spacing);
          if (style) return { style };
          return {};
        },
      },
      extraAttrs: {
        default: {},
        parseDOM: (element) => {
          const extra = {};
          Array.from(element.attributes).forEach((attr) => {
            extra[attr.name] = attr.value;
          });
          return extra;
        },
        renderDOM: (attributes) => {
          return attributes.extraAttrs || {};
        },
      },
      marksAttrs: {
        renderDOM: (attrs) => {
          const { marksAttrs } = attrs;
          if (!marksAttrs?.length) return {};

          const style = getMarksStyle(marksAttrs);
          if (style) return { style };
          return {};
        },
      },
      indent: {
        renderDOM: ({ indent }) => {
          if (!indent) return {};
          const { left, right, firstLine, hanging } = indent;

          let style = '';
          if (left) style += `margin-left: ${left}px;`;
          if (right) style += `margin-right: ${right}px;`;
          if (firstLine && !hanging) style += `text-indent: ${firstLine}px;`;
          if (firstLine && hanging) style += `text-indent: ${firstLine - hanging}px;`;
          if (!firstLine && hanging) style += `text-indent: ${-hanging}px;`;

          return { style };
        },
      },
      class: {
        renderDOM: (attributes) => {
          if (attributes.dropcap) {
            return { class: `super-doc-dropcap`};
          }
          return null;
        }
      },
      styleId: { rendered: false },
      attributes: {
        rendered: false,
      },
      filename: { rendered: false },
      rsidRDefault: { rendered: false },
      keepLines: { rendered: false },
      keepNext: { rendered: false },
      paragraphProperties: { rendered: false },
      dropcap: { rendered: false },
    };
  },

  parseDOM() {
    return [{
      tag: 'p',
      getAttrs: (node) => {
        let extra = {};
        Array.from(node.attributes).forEach((attr) => {
          extra[attr.name] = attr.value;
        });
        return { extraAttrs: extra };
      },
    }];
  },

  renderDOM({ htmlAttributes }) {
    return ['p', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addPmPlugins() {
    const { view } = this.editor;
    const dropcapPlugin = new Plugin({
      name: 'dropcapPlugin',
      key: new PluginKey('dropcapPlugin'),
      state: {
        init(_, state) {
          let decorations = getDropcapDecorations(state, view);
          return DecorationSet.create(state.doc, decorations);
        },

        apply(tr, oldDecorationSet, oldState, newState) {
          const decorations = getDropcapDecorations(newState, view);
          return DecorationSet.create(newState.doc, decorations);
        },
      },
      props: {
        decorations(state) {
          return this.getState(state);
        },
      },
    });
    
    return [dropcapPlugin];
  }
});

const getDropcapDecorations = (state, view) => {
  let decorations = [];
  state.doc.descendants((node, pos) => {
    if (node.attrs.dropcap?.type === 'margin') {
      const width = getDropcapWidth(view, pos);
      
      decorations.push(
        Decoration.node(pos, pos + node.nodeSize, { style: `margin-left: -${width}px;` }),
      );
    }
  });
  return decorations;
};

function getDropcapWidth(view, pos) {
  const domNode = view.nodeDOM(pos);
  if (domNode) {
    const range = document.createRange();
    range.selectNodeContents(domNode);
    return range.getBoundingClientRect().width;
  }
  return 0;
}
