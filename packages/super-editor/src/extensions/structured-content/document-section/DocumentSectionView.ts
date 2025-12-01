import type { Node as PmNode } from 'prosemirror-model';
import type { Decoration, EditorView } from 'prosemirror-view';
import type { Editor } from '@core/Editor.js';

/**
 * The node view for the document section node.
 */
export class DocumentSectionView {
  node: PmNode;
  editor: Editor;
  decorations: readonly Decoration[];
  view: EditorView;
  getPos: () => number | undefined;
  dom!: HTMLElement;
  contentDOM!: HTMLElement;
  infoDiv!: HTMLElement;

  constructor(node: PmNode, getPos: () => number | undefined, decorations: readonly Decoration[], editor: Editor) {
    this.node = node;
    this.editor = editor;
    this.decorations = decorations;
    this.view = editor.view;
    this.getPos = getPos;

    this.#init();
  }

  #init(): void {
    const { attrs } = this.node;
    const { id, title, description } = attrs;

    // Container for the entire node view
    this.dom = document.createElement('div');
    this.dom.className = 'sd-document-section-block';
    this.dom.setAttribute('data-id', String(id));
    this.dom.setAttribute('data-title', String(title));
    this.dom.setAttribute('data-description', String(description));
    this.dom.setAttribute('aria-label', 'Document section');

    this.#addToolTip();

    // Add content editable area
    this.contentDOM = document.createElement('div');
    this.contentDOM.className = 'sd-document-section-block-content';
    this.contentDOM.setAttribute('contenteditable', 'true');
    this.dom.appendChild(this.contentDOM);
  }

  #addToolTip(): void {
    const { title } = this.node.attrs;
    this.infoDiv = document.createElement('div');
    this.infoDiv.className = 'sd-document-section-block-info';

    const textSpan = document.createElement('span');
    textSpan.textContent = String(title || 'Document section');
    this.infoDiv.appendChild(textSpan);

    this.infoDiv.setAttribute('contenteditable', 'false');
    this.dom.appendChild(this.infoDiv);
  }
}
