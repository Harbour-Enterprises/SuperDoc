// @ts-ignore
import { getPresetShapeSvg, listPresetNames } from '@preset-geometry';

export class VectorShapeView {
  node;

  view;

  getPos;

  decorations;

  innerDecorations;

  editor;

  extension;

  htmlAttributes;

  root;

  constructor(props) {
    this.node = props.node;
    this.view = props.editor.view;
    this.getPos = props.getPos;
    this.decorations = props.decorations;
    this.innerDecorations = props.innerDecorations;
    this.editor = props.editor;
    this.extension = props.extension;
    this.htmlAttributes = props.htmlAttributes;

    this.mount(props);
  }

  mount(props) {
    this.buildView();
  }

  get dom() {
    return this.root;
  }

  get contentDOM() {
    return null;
  }

  createElement() {
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

  generateTransform() {
    const attrs = this.node.attrs;
    const transforms = [];
    if (attrs.rotation) {
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

  generateSVG({ kind, fillColor, strokeColor, strokeWidth }) {
    try {
      return getPresetShapeSvg({
        preset: kind,
        styleOverrides: {
          fill: fillColor || 'none',
          stroke: strokeColor || 'none',
          strokeWidth: strokeWidth || 0,
        },
      });
    } catch (error) {
      return null;
    }
  }

  buildView() {
    const { element } = this.createElement();
    this.root = element;
  }

  update() {
    // Recreate the NodeView.
    return false;
  }
}
