import { Attribute, type AttributeValue } from '@core/index.js';
import type { Editor } from '@core/index.js';
import { NodeSelection } from 'prosemirror-state';
import type { Node as PmNode } from 'prosemirror-model';
import type { Decoration, NodeView, ViewMutationRecord } from 'prosemirror-view';
import type { CommandProps } from '@core/types/ChainedCommands.js';

interface FieldAnnotationViewOptions {
  editor: Editor;
  node: PmNode;
  decorations: readonly Decoration[];
  getPos: () => number;
  htmlAttributes: Record<string, unknown>;
  annotationClass: string;
  annotationContentClass: string;
  borderColor: string;
}

export class FieldAnnotationView implements NodeView {
  editor: Editor;

  node: PmNode;

  decorations: readonly Decoration[];

  getPos: () => number;

  htmlAttributes: Record<string, unknown>;

  dom!: HTMLSpanElement;

  annotationClass: string;

  annotationContentClass: string;

  borderColor: string;

  contentDOM = null;

  constructor(options: FieldAnnotationViewOptions) {
    this.editor = options.editor;
    this.node = options.node;
    this.decorations = options.decorations;
    this.getPos = options.getPos;

    this.htmlAttributes = options.htmlAttributes;
    this.annotationClass = options.annotationClass;
    this.annotationContentClass = options.annotationContentClass;
    this.borderColor = options.borderColor;

    this.handleAnnotationClick = this.handleAnnotationClick.bind(this);
    this.handleAnnotationDoubleClick = this.handleAnnotationDoubleClick.bind(this);
    this.handleSelectionUpdate = this.handleSelectionUpdate.bind(this);

    this.buildView();
    this.attachEventListeners();
  }

  buildView(): void {
    const { type } = this.node.attrs;

    type HandlerKey = 'text' | 'image' | 'signature' | 'checkbox' | 'html' | 'link' | 'default';

    const handlers: Record<HandlerKey, () => void> = {
      text: () => this.buildTextView(),
      image: () => this.buildImageView(),
      signature: () => this.buildSignatureView(),
      checkbox: () => this.buildCheckboxView(),
      html: () => this.buildHTMLView(),
      link: () => this.buildLinkView(),
      default: () => this.buildTextView(),
    };

    const buildHandler = handlers[type as HandlerKey] ?? handlers.default;

    buildHandler();
  }

  buildTextView(): void {
    const { displayLabel } = this.node.attrs;

    const { annotation } = this.#createAnnotation({
      displayLabel,
    });

    this.dom = annotation;
  }

  buildImageView(): void {
    const { displayLabel, imageSrc } = this.node.attrs;

    const { annotation, content } = this.#createAnnotation();

    if (imageSrc) {
      const img = document.createElement('img');
      img.src = imageSrc;
      img.alt = displayLabel;

      img.style.height = 'auto';
      img.style.maxWidth = '100%';
      img.style.pointerEvents = 'none';
      img.style.verticalAlign = 'middle';

      content.append(img);

      annotation.style.display = 'inline-block';
      content.style.display = 'inline-block';
    } else {
      content.textContent = displayLabel;
    }

    this.dom = annotation;
  }

  buildSignatureView(): void {
    const { displayLabel: rawDisplayLabel, imageSrc } = this.node.attrs;

    const displayLabel = rawDisplayLabel || 'Signature';

    const { annotation, content } = this.#createAnnotation();

    if (imageSrc) {
      const img = document.createElement('img');
      img.src = imageSrc;
      img.alt = displayLabel;

      img.style.height = 'auto';
      img.style.maxWidth = '100%';
      img.style.maxHeight = '28px';
      img.style.pointerEvents = 'none';
      img.style.verticalAlign = 'middle';

      content.append(img);

      annotation.style.display = 'inline-block';
      content.style.display = 'inline-block';
    } else {
      content.textContent = displayLabel;
    }

    this.dom = annotation;
  }

  buildCheckboxView(): void {
    const { displayLabel } = this.node.attrs;

    const { annotation } = this.#createAnnotation({
      displayLabel,
    });

    this.dom = annotation;
  }

  buildHTMLView(): void {
    const { displayLabel, rawHtml: rawHtmlAttr } = this.node.attrs;
    let rawHtml = rawHtmlAttr;

    if (!this.editor.options.isHeadless && !!rawHtml) {
      try {
        const tempDiv = document.createElement('div');
        const childEditor = this.editor.createChildEditor({
          element: tempDiv,
          html: rawHtml,
        });
        rawHtml = childEditor.view.dom.innerHTML;
      } catch (error) {
        console.warn('Error parsing HTML in FieldAnnotationView:', error);
      }
    }

    const { annotation, content } = this.#createAnnotation();

    if (rawHtml) {
      content.innerHTML = rawHtml.trim();

      annotation.style.display = 'inline-block';
      content.style.display = 'inline-block';
    } else {
      content.textContent = displayLabel;
    }

    this.dom = annotation;
  }

  buildLinkView(): void {
    const { displayLabel, linkUrl } = this.node.attrs;

    const { annotation, content } = this.#createAnnotation();

    if (linkUrl) {
      const link = document.createElement('a');

      link.href = linkUrl;
      link.target = '_blank';
      link.textContent = linkUrl;
      link.style.textDecoration = 'none';

      content.append(link);

      content.style.pointerEvents = 'all';
    } else {
      content.textContent = displayLabel;
    }

    this.dom = annotation;
  }

  #createAnnotation({ displayLabel }: { displayLabel?: string } = {}): {
    annotation: HTMLSpanElement;
    content: HTMLSpanElement;
  } {
    const { highlighted } = this.node.attrs;

    const annotation = document.createElement('span');
    annotation.classList.add(this.annotationClass);

    const content = document.createElement('span');
    content.classList.add(this.annotationContentClass);
    content.style.pointerEvents = 'none';
    content.contentEditable = 'false';

    if (displayLabel) {
      content.textContent = displayLabel;
    }

    annotation.append(content);

    const omitHighlight = highlighted === false;
    const styles = [
      `border: 2px solid ${this.borderColor}`,
      `border-radius: 2px`,
      `padding: 1px 2px`,
      `box-sizing: border-box`,
    ];

    const annotationStyle = styles.join('; ');

    const mergedAttrs = Attribute.mergeAttributes(this.htmlAttributes as Record<string, AttributeValue>, {
      style: omitHighlight ? '' : annotationStyle,
    });

    for (const [key, value] of Object.entries(mergedAttrs)) {
      if (key === 'style') {
        annotation.style.cssText = value as string;
      } else {
        annotation.setAttribute(key, value as string);
      }
    }

    return {
      annotation,
      content,
    };
  }

  attachEventListeners(): void {
    this.dom.addEventListener('click', this.handleAnnotationClick);
    this.dom.addEventListener('dblclick', this.handleAnnotationDoubleClick);
    this.editor.on('selectionUpdate', this.handleSelectionUpdate);
  }

  removeEventListeners(): void {
    this.dom.removeEventListener('click', this.handleAnnotationClick);
    this.dom.removeEventListener('dblclick', this.handleAnnotationDoubleClick);
    this.editor.off('selectionUpdate', this.handleSelectionUpdate);
  }

  handleSelectionUpdate({ editor }: { editor: Editor }): void {
    if (!this.editor.isEditable) {
      return;
    }

    const { selection } = editor.state;

    if (selection instanceof NodeSelection) {
      const currentNode = selection.node;

      if (this.node.eq(currentNode)) {
        this.editor.emit('fieldAnnotationSelected', {
          editor: this.editor,
          node: this.node,
          nodePos: this.getPos(),
          target: this.dom,
        });
      }
    }
  }

  handleAnnotationClick(event: MouseEvent): void {
    if (!this.editor.isEditable) {
      return;
    }

    this.editor.emit('fieldAnnotationClicked', {
      editor: this.editor,
      node: this.node,
      nodePos: this.getPos(),
      event,
      currentTarget: event.currentTarget,
    });
  }

  handleAnnotationDoubleClick(event: MouseEvent): void {
    if (!this.editor.isEditable) {
      return;
    }

    this.editor.emit('fieldAnnotationDoubleClicked', {
      editor: this.editor,
      node: this.node,
      nodePos: this.getPos(),
      event,
      currentTarget: event.currentTarget,
    });
  }

  stopEvent(event: Event): boolean {
    if (!this.editor.isEditable) {
      event.preventDefault();
      return true;
    }

    return false;
  }

  // Can be used to manually update the NodeView.
  // Otherwise the NodeView is recreated.
  update(): boolean {
    return false;
  }

  ignoreMutation(_mutation?: ViewMutationRecord): boolean {
    return true;
  }

  destroy(): void {
    this.removeEventListeners();
  }

  updateAttributes(attributes: Record<string, unknown>): void {
    this.editor.commands.command(({ tr }: CommandProps) => {
      tr.setNodeMarkup(this.getPos(), undefined, {
        ...this.node.attrs,
        ...attributes,
      });
      return true;
    });
  }
}
