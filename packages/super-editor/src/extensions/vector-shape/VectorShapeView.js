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
      // Check if fillColor is a gradient
      if (attrs.fillColor && typeof attrs.fillColor === 'object' && attrs.fillColor.type === 'gradient') {
        // Parse SVG and add gradient
        element.innerHTML = svgTemplate;
        const svg = element.querySelector('svg');
        if (svg) {
          this.applyGradientToSVG(svg, attrs.fillColor);
        }
      } else {
        element.innerHTML = svgTemplate;
      }

      // Add text content if present
      if (attrs.textContent && attrs.textContent.parts) {
        const svg = element.querySelector('svg');
        if (svg) {
          const textElement = this.createTextElement(attrs.textContent, attrs.textAlign, attrs.width, attrs.height);
          if (textElement) {
            svg.appendChild(textElement);
          }
        }
      }
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
      // For gradients, use a placeholder fill that will be replaced
      const fill =
        fillColor && typeof fillColor === 'object' && fillColor.type === 'gradient' ? '#cccccc' : fillColor || 'none';

      return getPresetShapeSvg({
        preset: kind,
        styleOverrides: {
          fill,
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

  applyGradientToSVG(svg, gradientData) {
    const { gradientType, stops, angle } = gradientData;
    const gradientId = `gradient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create defs if it doesn't exist
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.insertBefore(defs, svg.firstChild);
    }

    // Create gradient element
    let gradient;

    if (gradientType === 'linear') {
      gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      gradient.setAttribute('id', gradientId);

      // Convert angle to x1, y1, x2, y2 coordinates
      // OOXML angle is in degrees, 0 = left to right, 90 = bottom to top
      const radians = (angle * Math.PI) / 180;
      const x1 = 50 - 50 * Math.cos(radians);
      const y1 = 50 + 50 * Math.sin(radians);
      const x2 = 50 + 50 * Math.cos(radians);
      const y2 = 50 - 50 * Math.sin(radians);

      gradient.setAttribute('x1', `${x1}%`);
      gradient.setAttribute('y1', `${y1}%`);
      gradient.setAttribute('x2', `${x2}%`);
      gradient.setAttribute('y2', `${y2}%`);
    } else {
      gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
      gradient.setAttribute('id', gradientId);
      gradient.setAttribute('cx', '50%');
      gradient.setAttribute('cy', '50%');
      gradient.setAttribute('r', '50%');
    }

    // Add gradient stops
    stops.forEach((stop) => {
      const stopElement = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stopElement.setAttribute('offset', `${stop.position * 100}%`);
      stopElement.setAttribute('stop-color', stop.color);
      if (stop.alpha != null && stop.alpha < 1) {
        stopElement.setAttribute('stop-opacity', stop.alpha.toString());
      }
      gradient.appendChild(stopElement);
    });

    defs.appendChild(gradient);

    // Apply gradient to all filled elements
    const filledElements = svg.querySelectorAll('[fill]:not([fill="none"])');
    filledElements.forEach((el) => {
      el.setAttribute('fill', `url(#${gradientId})`);
    });
  }

  createTextElement(textContent, textAlign, width, height) {
    const textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'text');

    // Set text alignment
    let textAnchor = 'middle';
    let xPos = width / 2;

    if (textAlign === 'l' || textAlign === 'left') {
      textAnchor = 'start';
      xPos = 10; // Small padding from left
    } else if (textAlign === 'r' || textAlign === 'right') {
      textAnchor = 'end';
      xPos = width - 10; // Small padding from right
    }

    textGroup.setAttribute('x', xPos.toString());
    textGroup.setAttribute('y', (height / 2).toString());
    textGroup.setAttribute('text-anchor', textAnchor);
    textGroup.setAttribute('dominant-baseline', 'middle');

    // Add text content with formatting
    textContent.parts.forEach((part, index) => {
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.textContent = part.text;

      // Apply formatting
      if (part.formatting) {
        let style = '';
        if (part.formatting.bold) {
          style += 'font-weight: bold; ';
        }
        if (part.formatting.italic) {
          style += 'font-style: italic; ';
        }
        if (part.formatting.color) {
          tspan.setAttribute('fill', `#${part.formatting.color}`);
        }
        if (part.formatting.fontSize) {
          style += `font-size: ${part.formatting.fontSize}px; `;
        }
        if (style) {
          tspan.setAttribute('style', style);
        }
      }

      if (index > 0) {
        tspan.setAttribute('dx', '0');
      }

      textGroup.appendChild(tspan);
    });

    return textGroup;
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
