import { Node, Attribute, type AttributeValue } from '@core/index.js';
import { isHeadless } from '@/utils/headless-helpers';
import type { Node as PmNode, Mark } from 'prosemirror-model';
import type { Transaction, EditorState } from 'prosemirror-state';
import type { Decoration, EditorView as PmEditorView } from 'prosemirror-view';
import type { Editor } from '@core/Editor.js';

interface CommandProps {
  tr: Transaction;
  dispatch?: (tr: Transaction) => void;
  state: EditorState;
  editor: Editor;
}

interface NodeViewProps {
  node: PmNode;
  editor: Editor;
  getPos: () => number | undefined;
  decorations: readonly Decoration[];
}

/**
 * Configuration options for PageNumber
 * @typedef {Object} PageNumberOptions
 * @category Options
 * @property {Object} [htmlAttributes] - HTML attributes for page number elements
 */

/**
 * Attributes for page number nodes
 * @typedef {Object} PageNumberAttributes
 * @category Attributes
 * @property {Array} [marksAsAttrs=null] @internal - Internal marks storage
 */

/**
 * @module PageNumber
 * @sidebarTitle Page Number
 * @snippetPath /snippets/extensions/page-number.mdx
 * @shortcut Mod-Shift-alt-p | addAutoPageNumber | Insert page number
 */
export const PageNumber = Node.create({
  name: 'page-number',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: false,
  selectable: false,
  defining: true,

  content: '',

  addOptions() {
    return {
      htmlAttributes: {
        contenteditable: false,
        'data-id': 'auto-page-number',
        'aria-label': 'Page number node',
      },
    };
  },

  addAttributes() {
    return {
      marksAsAttrs: {
        default: null,
        rendered: false,
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos, decorations }: NodeViewProps) => {
      const htmlAttributes = this.options.htmlAttributes as unknown as Record<string, string>;
      return new AutoPageNumberNodeView(node, getPos, decorations, editor, htmlAttributes);
    };
  },

  parseDOM() {
    return [{ tag: 'span[data-id="auto-page-number"' }];
  },

  renderDOM({ htmlAttributes }: { htmlAttributes?: Record<string, unknown> }) {
    return [
      'span',
      Attribute.mergeAttributes(this.options.htmlAttributes, (htmlAttributes as Record<string, AttributeValue>) ?? {}),
    ];
  },

  addCommands() {
    return {
      /**
       * Insert an automatic page number
       * @category Command
       * @returns {Function} Command function
       * @example
       * editor.commands.addAutoPageNumber()
       * @note Only works in header/footer contexts
       */
      addAutoPageNumber:
        () =>
        ({ tr, dispatch, state, editor }: CommandProps): boolean => {
          const { options } = editor;
          if (!options.isHeaderOrFooter) return false;

          const { schema } = state;
          const pageNumberType = schema?.nodes?.['page-number'];
          if (!pageNumberType) return false;

          const pageNumberNodeJSON = { type: 'page-number' };
          const pageNumberNode = schema.nodeFromJSON(pageNumberNodeJSON);

          if (dispatch) {
            tr.replaceSelectionWith(pageNumberNode, false);
            // Only trigger pagination update if not in headless mode
            if (!isHeadless(editor)) {
              tr.setMeta('forceUpdatePagination', true);
            }
          }
          return true;
        },
    };
  },

  addShortcuts() {
    return {
      'Mod-Shift-alt-p': () => this.editor?.commands.addAutoPageNumber(),
    };
  },
});

/**
 * Configuration options for TotalPageCount
 * @typedef {Object} TotalPageCountOptions
 * @category Options
 * @property {Object} [htmlAttributes] - HTML attributes for total page count elements
 */

/**
 * Attributes for total page count nodes
 * @typedef {Object} TotalPageCountAttributes
 * @category Attributes
 * @property {Array} [marksAsAttrs=null] @internal - Internal marks storage
 */

/**
 * @module TotalPageCount
 * @sidebarTitle Total Page Count
 * @snippetPath /snippets/extensions/total-page-count.mdx
 * @shortcut Mod-Shift-alt-c | addTotalPageCount | Insert total page count
 */
export const TotalPageCount = Node.create({
  name: 'total-page-number',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: false,
  selectable: false,

  content: 'text*',

  addOptions() {
    return {
      htmlAttributes: {
        contenteditable: false,
        'data-id': 'auto-total-pages',
        'aria-label': 'Total page count node',
        class: 'sd-editor-auto-total-pages',
      },
    };
  },

  addAttributes() {
    return {
      marksAsAttrs: {
        default: null,
        rendered: false,
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos, decorations }: NodeViewProps) => {
      const htmlAttributes = this.options.htmlAttributes as unknown as Record<string, string>;
      return new AutoPageNumberNodeView(node, getPos, decorations, editor, htmlAttributes);
    };
  },

  parseDOM() {
    return [{ tag: 'span[data-id="auto-total-pages"' }];
  },

  renderDOM({ htmlAttributes }: { htmlAttributes?: Record<string, unknown> }) {
    return [
      'span',
      Attribute.mergeAttributes(this.options.htmlAttributes, (htmlAttributes as Record<string, AttributeValue>) ?? {}),
      0,
    ];
  },

  addCommands() {
    return {
      /**
       * Insert total page count
       * @category Command
       * @returns {Function} Command function
       * @example
       * editor.commands.addTotalPageCount()
       * @note Only works in header/footer contexts
       */
      addTotalPageCount:
        () =>
        ({ tr, dispatch, state, editor }: CommandProps): boolean => {
          const { options } = editor;
          if (!options.isHeaderOrFooter) return false;

          const { schema } = state;
          const pageNumberType = schema.nodes?.['total-page-number'];
          if (!pageNumberType) return false;

          const parent = editor?.options?.parentEditor as { currentTotalPages?: number } | undefined;
          const currentPages = parent?.currentTotalPages || 1;
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
    };
  },

  addShortcuts() {
    return {
      'Mod-Shift-alt-c': () => this.editor?.commands.addTotalPageCount(),
    };
  },
});

interface NodeAttributesResult {
  text: string | number;
  className: string;
  dataId: string;
  ariaLabel: string;
}

const getNodeAttributes = (nodeName: string, editor: Editor): NodeAttributesResult => {
  switch (nodeName) {
    case 'page-number':
      return {
        text: (editor.options as { currentPageNumber?: number }).currentPageNumber || '1',
        className: 'sd-editor-auto-page-number',
        dataId: 'auto-page-number',
        ariaLabel: 'Page number node',
      };
    case 'total-page-number':
      return {
        text: (editor.options.parentEditor as { currentTotalPages?: number } | undefined)?.currentTotalPages || '1',
        className: 'sd-editor-auto-total-pages',
        dataId: 'auto-total-pages',
        ariaLabel: 'Total page count node',
      };
    default:
      return {
        text: '',
        className: '',
        dataId: '',
        ariaLabel: '',
      };
  }
};

export class AutoPageNumberNodeView {
  node: PmNode;
  editor: Editor;
  view: PmEditorView;
  getPos: () => number | undefined;
  dom: HTMLElement;

  constructor(
    node: PmNode,
    getPos: () => number | undefined,
    decorations: readonly Decoration[],
    editor: Editor,
    htmlAttributes: Record<string, string> = {},
  ) {
    this.node = node;
    this.editor = editor;
    this.view = editor.view;
    this.getPos = getPos;

    this.dom = this.#renderDom(node, htmlAttributes);
  }

  #renderDom(node: PmNode, htmlAttributes: Record<string, string>): HTMLElement {
    const attrs = getNodeAttributes(this.node.type.name, this.editor);
    const content = document.createTextNode(String(attrs.text));

    const nodeContent = document.createElement('span');
    nodeContent.className = String(attrs.className);
    nodeContent.setAttribute('data-id', String(attrs.dataId));
    nodeContent.setAttribute('aria-label', String(attrs.ariaLabel));

    const currentPos = this.getPos();
    if (currentPos !== undefined) {
      const { styles, marks } = getMarksFromNeighbors(currentPos, this.view);
      this.#scheduleUpdateNodeStyle(currentPos, marks);
      Object.assign(nodeContent.style, styles);
    }

    nodeContent.appendChild(content);

    Object.entries(htmlAttributes).forEach(([key, value]) => {
      if (value) nodeContent.setAttribute(key, String(value));
    });

    return nodeContent;
  }

  #scheduleUpdateNodeStyle(pos: number, marks: Mark[]): void {
    setTimeout(() => {
      const { state } = this.editor;
      const { dispatch } = this.view;

      const node = state.doc.nodeAt(pos);
      if (!node || node.isText) return;

      const currentMarks = node.attrs.marksAsAttrs || [];
      const newMarks = marks.map((m) => ({ type: m.type.name, attrs: m.attrs }));

      // Avoid infinite loop: only update if marks actually changed
      const isEqual = JSON.stringify(currentMarks) === JSON.stringify(newMarks);
      if (isEqual) return;

      const newAttrs = {
        ...node.attrs,
        marksAsAttrs: newMarks,
      };

      const tr = state.tr.setNodeMarkup(pos, undefined, newAttrs);
      dispatch(tr);
    }, 0);
  }

  update(node: PmNode): boolean {
    const incomingType = node?.type?.name;
    const currentType = this.node?.type?.name;
    if (!incomingType || incomingType !== currentType) return false;
    this.node = node;
    return true;
  }
}

/**
 * Get styles from the marks of the node before and after the current position.
 */
const getMarksFromNeighbors = (
  currentPos: number,
  view: PmEditorView,
): { styles: Record<string, string>; marks: Mark[] } => {
  const $pos = view.state.doc.resolve(currentPos);
  const styles: Record<string, string> = {};
  const marks: Mark[] = [];

  const before = $pos.nodeBefore;
  if (before) {
    Object.assign(styles, processMarks(before.marks));
    marks.push(...before.marks);
  }

  const after = $pos.nodeAfter;
  if (after) {
    Object.assign(styles, { ...styles, ...processMarks(after.marks) });
    marks.push(...after.marks);
  }

  return {
    styles,
    marks,
  };
};

/**
 * Process marks to extract styles.
 */
const processMarks = (marks: readonly Mark[]): Record<string, string> => {
  const styles: Record<string, string> = {};

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
        if (attrs?.style && typeof attrs.style === 'object') {
          Object.entries(attrs.style as Record<string, string>).forEach(([key, value]) => {
            styles[key] = value;
          });
        }
        break;
    }
  });

  return styles;
};
