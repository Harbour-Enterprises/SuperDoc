// @ts-ignore
import { getPresetShapeSvg } from '@preset-geometry';
import { inchesToPixels } from '@converter/helpers.js';

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

    this.mount();
  }

  mount() {
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

    // Apply anchor positioning styles
    const positioningStyle = this.getPositioningStyle(attrs);
    if (positioningStyle) {
      element.style.cssText += positioningStyle;
    }

    const transforms = this.generateTransform();
    if (transforms.length > 0) {
      element.style.transform = transforms.join(' ');
    }

    const svgTemplate = this.generateSVG({
      kind: attrs.kind,
      fillColor: attrs.fillColor,
      strokeColor: attrs.strokeColor,
      strokeWidth: attrs.strokeWidth,
      width: attrs.width,
      height: attrs.height,
    });

    if (svgTemplate) {
      element.innerHTML = svgTemplate;
    }

    return { element };
  }

  getPositioningStyle(attrs) {
    const { anchorData, marginOffset, wrap, originalAttributes } = attrs;

    if (!anchorData && !marginOffset?.horizontal && !marginOffset?.top) {
      return '';
    }

    let style = '';
    const margin = { left: 0, right: 0, top: 0, bottom: 0 };
    let centered = false;
    let floatRight = false;
    let baseHorizontal = marginOffset?.horizontal || 0;

    // Handle wrap type and z-index
    if (wrap?.type === 'None') {
      style += 'position: absolute;';
      // Use relativeHeight from OOXML for proper z-ordering of overlapping elements
      const relativeHeight = originalAttributes?.relativeHeight;
      if (relativeHeight != null) {
        // Scale down the relativeHeight value to a reasonable CSS z-index range
        // OOXML uses large numbers (e.g., 251659318), we normalize to a smaller range
        const zIndex = Math.floor(relativeHeight / 1000000);
        style += `z-index: ${zIndex};`;
      } else if (wrap?.attrs?.behindDoc) {
        style += 'z-index: -1;';
      } else {
        style += 'z-index: 1;';
      }
    }

    // Handle anchor positioning
    if (anchorData) {
      switch (anchorData.hRelativeFrom) {
        case 'page':
          const pageStyles =
            this.editor?.converter?.pageStyles || this.editor?.options?.parentEditor?.converter?.pageStyles;
          margin.left -= inchesToPixels(pageStyles?.pageMargins?.left) || 0;
          break;
        case 'margin':
          if (anchorData.alignH === 'center') {
            style += 'position: absolute; left: 50%; transform: translateX(-50%);';
          }
          if (anchorData.alignH === 'left' || anchorData.alignH === 'right') {
            style += `position: absolute; ${anchorData.alignH}: 0;`;
          }
          break;
        case 'column':
          if (anchorData.alignH === 'center') {
            centered = true;
          } else if (anchorData.alignH === 'right') {
            floatRight = true;
            if (!style.includes('float: right;')) {
              style += 'float: right;';
            }
          } else if (anchorData.alignH === 'left') {
            if (!style.includes('float: left;')) {
              style += 'float: left;';
            }
          }
          break;
        default:
          break;
      }
    }

    // Apply margin offsets
    if (anchorData || marginOffset?.horizontal != null || marginOffset?.top != null) {
      const horizontal = baseHorizontal;
      const top = Math.max(0, marginOffset?.top ?? 0);

      if (horizontal) {
        if (floatRight) {
          margin.right += horizontal;
        } else {
          margin.left += horizontal;
        }
      }

      if (top) {
        margin.top += top;
      }
    }

    // Apply margins to style
    if (centered) {
      style += 'margin-left: auto; margin-right: auto;';
    } else {
      if (margin.left) style += `margin-left: ${margin.left}px;`;
      if (margin.right) style += `margin-right: ${margin.right}px;`;
    }
    if (margin.top) style += `margin-top: ${margin.top}px;`;
    if (margin.bottom) style += `margin-bottom: ${margin.bottom}px;`;

    return style;
  }

  generateTransform() {
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

  generateSVG({ kind, fillColor, strokeColor, strokeWidth, width, height }) {
    try {
      return getPresetShapeSvg({
        preset: kind,
        styleOverrides: {
          fill: fillColor || 'none',
          stroke: strokeColor || 'none',
          strokeWidth: strokeWidth || 0,
        },
        width,
        height,
      });
    } catch {
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
