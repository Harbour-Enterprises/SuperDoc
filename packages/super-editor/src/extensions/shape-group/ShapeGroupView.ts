import { getPresetShapeSvg } from '@superdoc/preset-geometry';

export class ShapeGroupView {
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
    const { groupTransform, shapes, size } = attrs;

    const container = document.createElement('div');
    container.classList.add('sd-shape-group');
    container.setAttribute('data-shape-group', '');

    // Use size from attrs if available, otherwise calculate from group transform
    const width = size?.width || groupTransform?.width || 300;
    const height = size?.height || groupTransform?.height || 200;

    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    container.style.position = 'relative';
    container.style.display = 'inline-block';

    // Create SVG container for the group
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('version', '1.1');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.display = 'block';

    // Render each shape in the group
    if (shapes && Array.isArray(shapes)) {
      shapes.forEach((shape) => {
        if (shape.shapeType === 'vectorShape') {
          const shapeElement = this.createShapeElement(shape, groupTransform);
          if (shapeElement) {
            svg.appendChild(shapeElement);
          }
        }
      });
    }

    container.appendChild(svg);

    return { element: container };
  }

  createShapeElement(shape: Record<string, unknown>, _groupTransform?: Record<string, unknown>) {
    const attrs = shape.attrs;
    if (!attrs) return null;

    // Calculate position relative to group
    const x = attrs.x || 0;
    const y = attrs.y || 0;
    const width = attrs.width || 100;
    const height = attrs.height || 100;

    // Create a group element for the shape
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // Apply transformations
    const transforms = [];
    transforms.push(`translate(${x}, ${y})`);

    if (attrs.rotation !== 0) {
      transforms.push(`rotate(${attrs.rotation} ${width / 2} ${height / 2})`);
    }

    if (attrs.flipH) {
      transforms.push(`scale(-1, 1) translate(${-width}, 0)`);
    }

    if (attrs.flipV) {
      transforms.push(`scale(1, -1) translate(0, ${-height})`);
    }

    if (transforms.length > 0) {
      g.setAttribute('transform', transforms.join(' '));
    }

    // Generate the shape based on its kind
    const shapeKind = attrs.kind || 'rect';
    const fillColor = attrs.fillColor || '#5b9bd5';
    const strokeColor = attrs.strokeColor || '#000000';
    const strokeWidth = attrs.strokeWidth || 1;

    try {
      const svgContent = getPresetShapeSvg({
        preset: shapeKind,
        styleOverrides: {
          fill: fillColor || 'none',
          stroke: strokeColor || 'none',
          strokeWidth: strokeWidth || 0,
        },
        width,
        height,
      });

      if (svgContent) {
        // Parse the SVG string and extract the path/shape element
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = svgContent;
        const svgElement = tempDiv.querySelector('svg');

        if (svgElement) {
          // Copy all child elements from the generated SVG into our group
          Array.from(svgElement.children).forEach((child) => {
            const clonedChild = child.cloneNode(true) as SVGElement;

            // For elements with viewBox-based paths (like ellipse, circle, etc.),
            // we need to scale them to match the actual width and height
            if (clonedChild.tagName === 'ellipse') {
              // Update ellipse radii to match the actual dimensions
              clonedChild.setAttribute('cx', (width / 2).toString());
              clonedChild.setAttribute('cy', (height / 2).toString());
              clonedChild.setAttribute('rx', (width / 2).toString());
              clonedChild.setAttribute('ry', (height / 2).toString());
            } else if (clonedChild.tagName === 'circle') {
              // Convert circle to ellipse if width !== height
              if (width !== height) {
                const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                ellipse.setAttribute('cx', (width / 2).toString());
                ellipse.setAttribute('cy', (height / 2).toString());
                ellipse.setAttribute('rx', (width / 2).toString());
                ellipse.setAttribute('ry', (height / 2).toString());
                // Copy attributes
                Array.from(clonedChild.attributes).forEach((attr) => {
                  if (!['cx', 'cy', 'r'].includes(attr.name)) {
                    ellipse.setAttribute(attr.name, attr.value);
                  }
                });
                g.appendChild(ellipse);
                return;
              } else {
                clonedChild.setAttribute('cx', (width / 2).toString());
                clonedChild.setAttribute('cy', (height / 2).toString());
                clonedChild.setAttribute('r', (width / 2).toString());
              }
            } else if (clonedChild.tagName === 'rect') {
              clonedChild.setAttribute('width', width.toString());
              clonedChild.setAttribute('height', height.toString());
            } else if (clonedChild.tagName === 'path' && svgElement.hasAttribute('viewBox')) {
              // For path elements, we need to scale based on viewBox
              const viewBox = (svgElement.getAttribute('viewBox') || '').split(' ').map(Number);
              if (viewBox.length === 4) {
                const [, , vbWidth, vbHeight] = viewBox;
                const scaleX = width / vbWidth;
                const scaleY = height / vbHeight;
                if (scaleX !== 1 || scaleY !== 1) {
                  const pathTransform = `scale(${scaleX}, ${scaleY})`;
                  const existingTransform = clonedChild.getAttribute('transform');
                  clonedChild.setAttribute(
                    'transform',
                    existingTransform ? `${existingTransform} ${pathTransform}` : pathTransform,
                  );
                }
              }
            } else if (clonedChild.hasAttribute('width')) {
              clonedChild.setAttribute('width', width.toString());
            }

            if (clonedChild.hasAttribute('height') && clonedChild.tagName !== 'ellipse') {
              clonedChild.setAttribute('height', height.toString());
            }

            g.appendChild(clonedChild);
          });
        }
      }
    } catch (error) {
      console.warn('Failed to generate shape SVG:', error);
      // Fallback to a simple rectangle
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', width.toString());
      rect.setAttribute('height', height.toString());
      rect.setAttribute('fill', fillColor || '#cccccc');
      rect.setAttribute('stroke', strokeColor || '#000000');
      rect.setAttribute('stroke-width', (strokeWidth || 1).toString());
      g.appendChild(rect);
    }

    return g;
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
