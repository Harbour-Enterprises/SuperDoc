/**
 * Custom NodeView for Table of Contents block
 * Handles selection styling and prepares for interactive features
 */
import { NodeSelection } from 'prosemirror-state';

export class TocNodeView {
  constructor(node, getPos, editor) {
    this.node = node;
    this.getPos = getPos;
    this.editor = editor;
    this.dom = this.createDOM();
    this.contentDOM = this.dom.querySelector('.toc-content');

    this.handleMousedown = (event) => {
      const pos = this.getPos();
      if (typeof pos === 'number') {
        const { state, view } = this.editor;
        view.dispatch(
          state.tr.setSelection(new NodeSelection(state.doc.resolve(pos)))
        );
        view.focus();
        event.preventDefault();
      }
    };

    this.dom.addEventListener('mousedown', this.handleMousedown);
  }

  createDOM() {
    const container = document.createElement('div');
    container.className = 'sd-toc-block';
    container.setAttribute('data-type', 'tableOfContents');
    
    // Content wrapper for TOC entries
    const content = document.createElement('div');
    content.className = 'toc-content';
    container.appendChild(content);
    
    return container;
  }

  destroy() {
    // Clean up event listeners
    this.dom.removeEventListener('mousedown', this.handleMousedown);
  }
} 