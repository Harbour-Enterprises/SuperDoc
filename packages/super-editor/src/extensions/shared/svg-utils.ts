/**
 * Shared utility functions for SVG shape rendering.
 * Used by VectorShapeView and ShapeGroupView.
 */

type GradientStop = {
  position: number;
  color: string;
  alpha?: number | null;
};

export type GradientData = {
  gradientType: 'linear' | 'radial';
  stops: GradientStop[];
  angle: number;
};

export type AlphaData = {
  color: string;
  alpha: number;
};

type TextFormatting = {
  bold?: boolean;
  italic?: boolean;
  color?: string;
  fontSize?: number;
};

type TextPart = {
  text?: string | null;
  isLineBreak?: boolean;
  isEmptyParagraph?: boolean;
  formatting?: TextFormatting | null;
};

export type TextContent = {
  parts: TextPart[];
};

export type TextAlign = 'left' | 'center' | 'right' | 'r';

type TransformableAttrs = {
  rotation?: number | null;
  flipH?: boolean;
  flipV?: boolean;
};

export function createGradient(gradientData: GradientData, gradientId: string): SVGGradientElement | null {
  const { gradientType, stops, angle } = gradientData;

  if (!stops || stops.length === 0) {
    return null;
  }

  let gradient: SVGLinearGradientElement | SVGRadialGradientElement | null = null;

  if (gradientType === 'linear') {
    gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', gradientId);

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

  stops.forEach((stop: GradientStop) => {
    const stopElement = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stopElement.setAttribute('offset', `${stop.position * 100}%`);
    stopElement.setAttribute('stop-color', stop.color);
    if (stop.alpha != null && stop.alpha < 1) {
      stopElement.setAttribute('stop-opacity', stop.alpha.toString());
    }
    gradient?.appendChild(stopElement);
  });

  return gradient;
}

export function createTextElement(
  textContent: TextContent,
  textAlign: TextAlign,
  width: number,
  height: number,
): SVGForeignObjectElement {
  const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  foreignObject.setAttribute('x', '0');
  foreignObject.setAttribute('y', '0');
  foreignObject.setAttribute('width', width.toString());
  foreignObject.setAttribute('height', height.toString());

  const div = document.createElement('div');
  div.style.width = '100%';
  div.style.height = '100%';
  div.style.display = 'flex';
  div.style.flexDirection = 'column';
  div.style.justifyContent = 'center';
  div.style.padding = '10px';
  div.style.boxSizing = 'border-box';
  div.style.wordWrap = 'break-word';
  div.style.overflowWrap = 'break-word';
  div.style.fontSize = '12px';
  div.style.lineHeight = '1.2';

  if (textAlign === 'center') {
    div.style.textAlign = 'center';
  } else if (textAlign === 'right' || textAlign === 'r') {
    div.style.textAlign = 'right';
  } else {
    div.style.textAlign = 'left';
  }

  let currentParagraph = document.createElement('div');

  textContent.parts.forEach((part: TextPart) => {
    if (part.isLineBreak) {
      div.appendChild(currentParagraph);
      currentParagraph = document.createElement('div');
      if (part.isEmptyParagraph) {
        currentParagraph.style.minHeight = '1em';
      }
    } else {
      const span = document.createElement('span');
      span.textContent = part.text ?? '';

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

      currentParagraph.appendChild(span);
    }
  });

  div.appendChild(currentParagraph);
  foreignObject.appendChild(div);

  return foreignObject;
}

export function applyGradientToSVG(svg: SVGElement, gradientData: GradientData): void {
  const { gradientType, stops, angle } = gradientData;
  const gradientId = `gradient-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }

  let gradient: SVGLinearGradientElement | SVGRadialGradientElement | null = null;

  if (gradientType === 'linear') {
    gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', gradientId);

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

  stops.forEach((stop: GradientStop) => {
    const stopElement = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stopElement.setAttribute('offset', `${stop.position * 100}%`);
    stopElement.setAttribute('stop-color', stop.color);
    if (stop.alpha != null && stop.alpha < 1) {
      stopElement.setAttribute('stop-opacity', stop.alpha.toString());
    }
    gradient?.appendChild(stopElement);
  });

  if (gradient) {
    defs.appendChild(gradient);
  }

  const filledElements = svg.querySelectorAll<SVGElement>('[fill]:not([fill="none"])');
  filledElements.forEach((element) => {
    element.setAttribute('fill', `url(#${gradientId})`);
  });
}

export function applyAlphaToSVG(svg: SVGElement, alphaData: AlphaData): void {
  const { color, alpha } = alphaData;
  const filledElements = svg.querySelectorAll<SVGElement>('[fill]:not([fill="none"])');
  filledElements.forEach((element) => {
    element.setAttribute('fill', color);
    element.setAttribute('fill-opacity', alpha.toString());
  });
}

export function generateTransforms(attrs: TransformableAttrs): string[] {
  const transforms: string[] = [];
  if (attrs.rotation != null) {
    transforms.push(`rotate(${attrs.rotation}deg)`);
  }
  if (attrs.flipH) {
    transforms.push('scaleX(-1)');
  }
  if (attrs.flipV) {
    transforms.push('scaleY(-1)');
  }
  return transforms;
}
