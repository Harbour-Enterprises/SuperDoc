export function createGradient(gradientData: unknown, gradientId: string): SVGElement;
export function createTextElement(
  textContent: unknown,
  textAlign: unknown,
  width: number,
  height: number,
): SVGGElement | null;
export function applyGradientToSVG(svg: SVGElement, gradientData: unknown): void;
export function applyAlphaToSVG(svg: SVGElement, alphaData: unknown): void;
export function generateTransforms(attrs: unknown): string[];
