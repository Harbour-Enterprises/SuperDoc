import { Attribute } from '@core/index';
import { updateDOMAttributes } from '@core/helpers/updateDOMAttributes';
import { StructuredContentViewBase } from './StructuredContentViewBase';
import { structuredContentClass, structuredContentInnerClass } from './structured-content-block';
import type { StructuredContentViewProps } from './StructuredContentViewBase';
import type { Node as PmNode } from 'prosemirror-model';
import type { Decoration, DecorationSource } from 'prosemirror-view';

export class StructuredContentBlockView extends StructuredContentViewBase {
  constructor(props: StructuredContentViewProps) {
    super(props);
  }

  mount(): void {
    this.buildView();
  }

  get contentDOM(): HTMLElement | null {
    const contentElement = this.dom?.querySelector(`.${structuredContentInnerClass}`) as HTMLElement | null;
    return contentElement || null;
  }

  createElement() {
    const element = document.createElement('div');
    element.classList.add(structuredContentClass);
    element.setAttribute('data-structured-content-block', '');

    const contentElement = document.createElement('div');
    contentElement.classList.add(structuredContentInnerClass);

    element.append(contentElement);

    const domAttrs = Attribute.mergeAttributes(this.htmlAttributes);
    updateDOMAttributes(element, { ...domAttrs } as import('prosemirror-model').Attrs);

    return { element, contentElement };
  }

  buildView(): void {
    const { element } = this.createElement();
    const dragHandle = this.createDragHandle();
    element.prepend(dragHandle);
    element.addEventListener('dragstart', (e) => this.onDragStart(e));
    this.root = element;
  }

  updateView(): void {
    if (!this.dom) return;
    const domAttrs = Attribute.mergeAttributes(this.htmlAttributes);
    updateDOMAttributes(this.dom, { ...domAttrs } as import('prosemirror-model').Attrs);
  }

  update(node: PmNode, decorations: readonly Decoration[], innerDecorations: DecorationSource): boolean {
    const result = super.update(node, decorations, innerDecorations);
    if (!result) return false;
    this.updateView();
    return true;
  }
}
