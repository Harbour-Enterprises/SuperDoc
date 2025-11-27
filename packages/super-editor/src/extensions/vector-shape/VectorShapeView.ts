import { getPresetShapeSvg } from '@superdoc/preset-geometry';
import type { AttributeValue } from '@core/Attribute.js';
import type { Node as PmNode } from 'prosemirror-model';
import type { Decoration, DecorationSource, EditorView, NodeView } from 'prosemirror-view';

type VectorShapeEditor = { view: EditorView };

export interface VectorShapeViewProps {
  node: PmNode;
  view: EditorView;
  getPos: () => number | undefined;
  decorations: readonly Decoration[];
  innerDecorations: DecorationSource;
  editor?: VectorShapeEditor;
  extension?: unknown;
  htmlAttributes?: Record<string, AttributeValue>;
}

export class VectorShapeView implements NodeView {
  node: PmNode;
  view: EditorView;
  getPos: () => number | undefined;
  decorations: readonly Decoration[];
  innerDecorations: DecorationSource;
  editor: VectorShapeEditor;
  extension: unknown;
  htmlAttributes: Record<string, AttributeValue>;
  root: HTMLElement | null;

  constructor(props: VectorShapeViewProps) {
    this.node = props.node;
    this.view = props.editor?.view ?? props.view;
    this.getPos = props.getPos;
    this.decorations = props.decorations;
    this.innerDecorations = props.innerDecorations;
    this.editor = props.editor ?? { view: props.view };
    this.extension = props.extension ?? null;
    this.htmlAttributes = props.htmlAttributes || {};
    this.root = null;

    this.mount();
  }

  mount() {
    this.buildView();
  }

  get dom() {
    return this.root as HTMLElement;
  }

  get contentDOM() {
    return null;
  }

  createElement(): { element: HTMLElement } {
    const attrs = this.node.attrs;

    const element = document.createElement('span');
    element.classList.add('sd-vector-shape');
    element.setAttribute('data-vector-shape', '');

    element.style.width = `${attrs.width}px`;
    element.style.height = `${attrs.height}px`;

    const transforms = this.generateTransform();
    if (transforms.length > 0) {
      element.style.transform = transforms.join(' ');
    }

    const svgTemplate = this.generateSVG({
      kind: attrs.kind,
      fillColor: attrs.fillColor,
      strokeColor: attrs.strokeColor,
      strokeWidth: attrs.strokeWidth,
    });

    if (svgTemplate) {
      element.innerHTML = svgTemplate;
    }

    return { element };
  }

  generateTransform(): string[] {
    const attrs = this.node.attrs;
    const transforms = [];
    if (attrs.rotation != null) {
      transforms.push(`rotate(${attrs.rotation}deg)`);
    }
    if (attrs.flipH) {
      transforms.push(`scaleX(-1)`);
    }
    if (attrs.flipV) {
      transforms.push(`scaleY(-1)`);
    }
    return transforms;
  }

  generateSVG({
    kind,
    fillColor,
    strokeColor,
    strokeWidth,
  }: {
    kind: string;
    fillColor?: string | null;
    strokeColor?: string | null;
    strokeWidth?: number | null;
  }): string | null {
    try {
      return getPresetShapeSvg({
        preset: kind,
        styleOverrides: () => ({
          fill: fillColor || 'none',
          stroke: strokeColor || 'none',
          strokeWidth: strokeWidth ?? 0,
        }),
      });
    } catch {
      return null;
    }
  }

  buildView() {
    const { element } = this.createElement();
    this.root = element;
  }

  update(): boolean {
    // Recreate the NodeView.
    return false;
  }
}
