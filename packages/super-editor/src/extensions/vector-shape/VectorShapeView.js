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

    // Create SVG directly with proper dimensions
    const svg = this.createSVGElement(attrs);
    if (svg) {
      element.appendChild(svg);

      // Add text content if present
      if (attrs.textContent && attrs.textContent.parts) {
        const textElement = this.createTextElement(attrs.textContent, attrs.textAlign, attrs.width, attrs.height);
        if (textElement) {
          svg.appendChild(textElement);
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

  createSVGElement(attrs) {
    const { kind, fillColor, strokeColor, strokeWidth, width, height } = attrs;

    // Create SVG with proper dimensions (no viewBox distortion)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.style.display = 'block';

    // Create defs for gradients if needed
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.appendChild(defs);

    // Determine fill value
    let fill = 'none';
    let fillOpacity = 1;

    if (fillColor) {
      if (typeof fillColor === 'object') {
        if (fillColor.type === 'gradient') {
          const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
          const gradient = this.createGradient(fillColor, gradientId);
          if (gradient) {
            defs.appendChild(gradient);
            fill = `url(#${gradientId})`;
          }
        } else if (fillColor.type === 'solidWithAlpha') {
          fill = fillColor.color;
          fillOpacity = fillColor.alpha;
        }
      } else {
        fill = fillColor;
      }
    }

    const stroke = strokeColor === null ? 'none' : strokeColor || 'none';
    const strokeW = strokeColor === null ? 0 : strokeColor ? strokeWidth || 1 : 0;

    // Create shape element based on kind
    let shapeElement;

    switch (kind) {
      case 'rect':
        shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        shapeElement.setAttribute('x', '0');
        shapeElement.setAttribute('y', '0');
        shapeElement.setAttribute('width', width.toString());
        shapeElement.setAttribute('height', height.toString());
        break;

      case 'roundRect':
        shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        shapeElement.setAttribute('x', '0');
        shapeElement.setAttribute('y', '0');
        shapeElement.setAttribute('width', width.toString());
        shapeElement.setAttribute('height', height.toString());
        // Use a reasonable corner radius (5% of smallest dimension)
        const radius = Math.min(width, height) * 0.05;
        shapeElement.setAttribute('rx', radius.toString());
        shapeElement.setAttribute('ry', radius.toString());
        break;

      case 'ellipse':
        shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        shapeElement.setAttribute('cx', (width / 2).toString());
        shapeElement.setAttribute('cy', (height / 2).toString());
        shapeElement.setAttribute('rx', (width / 2).toString());
        shapeElement.setAttribute('ry', (height / 2).toString());
        break;

      case 'circle':
        shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        shapeElement.setAttribute('cx', (width / 2).toString());
        shapeElement.setAttribute('cy', (height / 2).toString());
        shapeElement.setAttribute('rx', (width / 2).toString());
        shapeElement.setAttribute('ry', (height / 2).toString());
        break;

      default:
        // For complex shapes, fall back to preset geometry with proper viewBox
        const svgTemplate = this.generateSVG({ kind, fillColor, strokeColor, strokeWidth, width, height });
        if (svgTemplate) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = svgTemplate;
          const tempSvg = tempDiv.querySelector('svg');
          if (tempSvg) {
            // Fix viewBox to match actual dimensions
            tempSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
            tempSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            return tempSvg;
          }
        }
        return null;
    }

    // Apply fill and stroke
    shapeElement.setAttribute('fill', fill);
    if (fillOpacity < 1) {
      shapeElement.setAttribute('fill-opacity', fillOpacity.toString());
    }
    shapeElement.setAttribute('stroke', stroke);
    shapeElement.setAttribute('stroke-width', strokeW.toString());

    svg.appendChild(shapeElement);
    return svg;
  }

  createGradient(gradientData, gradientId) {
    const { gradientType, stops, angle } = gradientData;

    // Ensure we have stops
    if (!stops || stops.length === 0) {
      return null;
    }

    let gradient;

    if (gradientType === 'linear') {
      gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      gradient.setAttribute('id', gradientId);

      // Convert angle to x1, y1, x2, y2 coordinates
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

    return gradient;
  }

  generateSVG({ kind, fillColor, strokeColor, strokeWidth, width, height }) {
    try {
      // For complex fill types (gradients, alpha), use a placeholder or extract the color
      let fill = fillColor || 'none';
      if (fillColor && typeof fillColor === 'object') {
        if (fillColor.type === 'gradient') {
          fill = '#cccccc'; // Placeholder for gradients
        } else if (fillColor.type === 'solidWithAlpha') {
          fill = fillColor.color; // Use the actual color, alpha will be applied separately
        }
      }

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

  applyAlphaToSVG(svg, alphaData) {
    const { color, alpha } = alphaData;

    // Apply color with opacity to all filled elements
    const filledElements = svg.querySelectorAll('[fill]:not([fill="none"])');
    filledElements.forEach((el) => {
      el.setAttribute('fill', color);
      el.setAttribute('fill-opacity', alpha.toString());
    });
  }

  createTextElement(textContent, textAlign, width, height) {
    // Use foreignObject with HTML for proper text wrapping
    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    foreignObject.setAttribute('x', '0');
    foreignObject.setAttribute('y', '0');
    foreignObject.setAttribute('width', width.toString());
    foreignObject.setAttribute('height', height.toString());

    // Create HTML div for text content
    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.padding = '10px';
    div.style.boxSizing = 'border-box';
    div.style.wordWrap = 'break-word';
    div.style.overflowWrap = 'break-word';

    // Set text alignment
    if (textAlign === 'center') {
      div.style.textAlign = 'center';
      div.style.justifyContent = 'center';
    } else if (textAlign === 'right' || textAlign === 'r') {
      div.style.textAlign = 'right';
      div.style.justifyContent = 'flex-end';
    } else {
      div.style.textAlign = 'left';
      div.style.justifyContent = 'flex-start';
    }

    // Create text container
    const textContainer = document.createElement('div');

    // Add text content with formatting
    textContent.parts.forEach((part) => {
      const span = document.createElement('span');
      span.textContent = part.text;

      // Apply formatting
      if (part.formatting) {
        if (part.formatting.bold) {
          span.style.fontWeight = 'bold';
        }
        if (part.formatting.italic) {
          span.style.fontStyle = 'italic';
        }
        if (part.formatting.color) {
          span.style.color = `#${part.formatting.color}`;
        }
        if (part.formatting.fontSize) {
          span.style.fontSize = `${part.formatting.fontSize}px`;
        }
      }

      textContainer.appendChild(span);
    });

    div.appendChild(textContainer);
    foreignObject.appendChild(div);

    return foreignObject;
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
