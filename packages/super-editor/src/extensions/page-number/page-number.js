import { Node, Attribute } from '@core/index.js';

export const PageNumber = Node.create({
  name: 'page-number',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,
  draggable: false,
  selectable: false,
  defining: true,

  content: '',

  addOptions() {
    return {
      htmlAttributes: {
        contenteditable: false,
        'data-id': 'auto-page-number',
        'aria-label': 'Page number node'
      },
    }
  },

  addNodeView() {
    return ({ node, editor, getPos, decorations }) => {
      const htmlAttributes = this.options.htmlAttributes;
      return new AutoPageNumberNodeView(node, getPos, decorations, editor, htmlAttributes);
    }
  },

  parseDOM() {
    return [{ tag: 'span[data-id="auto-page-number"' }];
  },

  renderDOM({ htmlAttributes }) {
    return ['span', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes)];
  },

  addCommands() {
    return {
      addAutoPageNumber: () => ({ tr, dispatch, state, editor }) => {
        const { options } = editor;
        if (!options.isHeaderOrFooter) return false;

        const { schema } = state;
        const pageNumberType = schema?.nodes?.['page-number'];
        if (!pageNumberType) return false;

        const pageNumberNode = pageNumberType.createAndFill();
        if (dispatch) {
          tr.replaceSelectionWith(pageNumberNode, false);
          tr.setMeta('forceUpdatePagination', true);
        }
        return true;
      },
    }
  },

  addShortcuts() {
    return {
      'Mod-Shift-p': () => this.editor.commands.addAutoPageNumber(),
    }
  }
});

export const TotalPageCount = Node.create({
  name: 'total-page-number',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,
  draggable: false,
  selectable: false,

  content: 'text*',

  addOptions() {
    return {
      htmlAttributes: {
        contenteditable: false,
        'data-id': 'auto-total-pages',
        'aria-label': 'Total page count node',
        'class': 'sd-editor-auto-total-pages',
      },
    }
  },

  parseDOM() {
    return [{ tag: 'span[data-id="auto-total-pages"' }];
  },

  renderDOM({ htmlAttributes }) {
    return ['span', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addCommands() {
    return {
      addTotalPageCount: () => ({ tr, dispatch, state, editor }) => {
        const { options } = editor;
        if (!options.isHeaderOrFooter) return false;

        const { schema } = state;
        const pageNumberType = schema.nodes?.['total-page-number'];
        if (!pageNumberType) return false;

        const currentPages = editor?.options?.parentEditor?.currentTotalPages || 1;
        const pageNumberNode = {
          type: 'total-page-number',
          content: [{ type: 'text', text: String(currentPages) }],
        };
        const pageNode = schema.nodeFromJSON(pageNumberNode);
        if (dispatch) {
          tr.replaceSelectionWith(pageNode, false);
        }
        return true;
      },
    }
  },

  addShortcuts() {
    return {
      'Mod-Shift-c': () => this.editor.commands.addTotalPageCount(),
    }
  }
});


export class AutoPageNumberNodeView {
  constructor(node, getPos, decorations, editor, htmlAttributes = {}) {
    this.node = node;
    this.editor = editor;
    this.view = editor.view;
    this.getPos = getPos;
    this.editor = editor;

    this.#init(htmlAttributes);
  }

  #init(htmlAttributes) {
    // Container for the entire node view
    this.dom = document.createElement("span");
    this.dom.className = "sd-editor-auto-page-number";

    // Container for the content
    const currentPos = this.getPos();
    const styleObject = getMarksFromNeighbors(currentPos, this.view);
    // this.contentDOM = document.createElement("span");
    Object.assign(this.dom.style, styleObject);

    // Set attributes from the node
    this.dom.innerText = this.editor.options.currentPageNumber;
    // this.dom.appendChild(this.contentDOM);

    // Set HTML attributes
    Object.entries(htmlAttributes).forEach(([key, value]) => {
      if (value) this.dom.setAttribute(key, value);
    });

  }

  update(node) {
    if (node.type !== this.node.type) return false;
    this.node = node;
    return true;
  }
};

/**
 * Get styles from the marks of the node before and after the current position.
 * @param {Number} currentPos The current position in the document.
 * @param {Object} view The ProseMirror view instance.
 * @returns {Object} An object containing CSS styles derived from the marks of the neighboring nodes.
 */
const getMarksFromNeighbors = (currentPos, view) => {
  const $pos = view.state.doc.resolve(currentPos);
  const styles = {};

  const before = $pos.nodeBefore;
  if (before) Object.assign(styles, processMarks(before.marks));

  const after = $pos.nodeAfter;
  if (after) Object.assign(styles, { ...styles, ...processMarks(after.marks) });

  return styles;
};

/**
 * Process marks to extract styles.
 * @param {Object[]} marks The marks to process.
 * @returns {Object} An object containing CSS styles derived from the marks.
 */
const processMarks = (marks) => {
  const styles = {};

  marks.forEach((mark) => {
    const { type, attrs } = mark;

    switch (type.name) {
      case 'textStyle':
        if (attrs.fontFamily) styles['font-family'] = attrs.fontFamily;
        if (attrs.fontSize) styles['font-size'] = attrs.fontSize;
        if (attrs.color) styles['color'] = attrs.color;
        if (attrs.backgroundColor) styles['background-color'] = attrs.backgroundColor;
        break;

      case 'bold':
        styles['font-weight'] = 'bold';
        break;

      case 'italic':
        styles['font-style'] = 'italic';
        break;

      case 'underline':
        styles['text-decoration'] = (styles['text-decoration'] || '') + ' underline';
        break;

      case 'strike':
        styles['text-decoration'] = (styles['text-decoration'] || '') + ' line-through';
        break;

      default:
        // Handle unknown/custom marks gracefully
        if (attrs?.style) {
          Object.entries(attrs.style).forEach(([key, value]) => {
            styles[key] = value;
          });
        }
        break;
    }
  });

  return styles;
};
