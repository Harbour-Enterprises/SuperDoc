import type { TextRun } from '@superdoc/contracts';
import type { ConverterLinkedStyle } from '../converter-context.js';

type StyleRecord = Record<string, unknown>;

const extractValue = (value: unknown): unknown => {
  if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    return (value as Record<string, unknown>).value;
  }
  return value;
};

const toBoolean = (value: unknown): boolean | undefined => {
  const raw = extractValue(value);
  if (raw == null) return undefined;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase();
    if (!normalized) return undefined;
    if (['0', 'false', 'off', 'none'].includes(normalized)) return false;
    return true;
  }
  return Boolean(raw);
};

const toColor = (value: unknown): string | undefined => {
  const raw = extractValue(value);
  if (typeof raw !== 'string') return undefined;
  if (!raw) return undefined;
  if (raw.startsWith('#')) return raw;
  return `#${raw}`;
};

const toUnderlineStyle = (value: unknown): 'single' | 'double' | 'dotted' | 'dashed' | 'wavy' | undefined => {
  const raw = `${extractValue(value) ?? ''}`.toLowerCase();
  if (!raw) return undefined;
  if (raw === 'double' || raw === 'dotted' || raw === 'dashed' || raw === 'wavy') return raw;
  return 'single';
};

const PT_TO_PX = 96 / 72;

const toPxNumber = (value: unknown): number | undefined => {
  const raw = extractValue(value);
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  const match = trimmed.match(/^(-?\d+(\.\d+)?)([a-z%]*)$/i);
  if (!match) return undefined;
  const numeric = parseFloat(match[1]);
  if (!Number.isFinite(numeric)) return undefined;
  const unit = match[3]?.toLowerCase();
  if (!unit || unit === 'px') return numeric;
  if (unit === 'pt') return numeric * PT_TO_PX;
  return numeric;
};

// Maximum style inheritance depth. Word's internal limit is similar (~15-20).
// Prevents pathological O(n²) style chains and circular references.
const MAX_INHERITANCE_DEPTH = 20;

export class LinkedStyleResolver {
  #map: Map<string, ConverterLinkedStyle>;

  constructor(styles: ConverterLinkedStyle[]) {
    this.#map = new Map();
    styles.forEach((style) => style?.id && this.#map.set(style.id, style));
  }

  getStyleMap(styleId?: string | null): StyleRecord {
    if (!styleId || typeof styleId !== 'string') return {};

    const visited = new Set<string>();
    const stack: ConverterLinkedStyle[] = [];
    let cursor = this.#map.get(styleId);
    let depth = 0;

    while (cursor && !visited.has(cursor.id)) {
      // Guard against infinite loops
      if (++depth > MAX_INHERITANCE_DEPTH) {
        console.warn(`Style inheritance depth exceeded for: ${styleId}`);
        break;
      }

      stack.unshift(cursor);
      visited.add(cursor.id);

      const basedOn = cursor.definition?.attrs?.basedOn;
      if (!basedOn || typeof basedOn !== 'string') break;

      cursor = this.#map.get(basedOn);
    }

    const merged: StyleRecord = {};
    stack.forEach((style) => {
      Object.assign(merged, style.definition?.styles || {});
    });
    return merged;
  }
}

export const createLinkedStyleResolver = (styles?: ConverterLinkedStyle[] | null): LinkedStyleResolver | null => {
  if (!styles || styles.length === 0) return null;
  return new LinkedStyleResolver(styles);
};

type RunStyleOptions = {
  resolver: LinkedStyleResolver;
  paragraphStyleId?: string | null;
  inlineStyleId?: string | null;
  runStyleId?: string | null;
  defaultFont: string;
  defaultSize: number;
};

export const applyLinkedStyleToRun = (run: TextRun, options: RunStyleOptions): void => {
  const { resolver, paragraphStyleId, inlineStyleId, runStyleId } = options;
  const maps: StyleRecord[] = [];
  if (paragraphStyleId) {
    maps.push(resolver.getStyleMap(paragraphStyleId));
  }
  if (inlineStyleId && !paragraphStyleId?.startsWith('TOC')) {
    maps.push(resolver.getStyleMap(inlineStyleId));
  }
  if (runStyleId) {
    maps.push(resolver.getStyleMap(runStyleId));
  }
  if (!maps.length) return;

  const finalStyles = Object.assign({}, ...maps);
  const appliedKeys: string[] = [];

  const fontFamily = extractValue(finalStyles['font-family']);
  if (typeof fontFamily === 'string' && fontFamily && run.fontFamily === options.defaultFont) {
    run.fontFamily = fontFamily;
    appliedKeys.push('font-family');
  }

  const fontSize = toPxNumber(finalStyles['font-size']);
  if (fontSize != null && run.fontSize === options.defaultSize) {
    run.fontSize = fontSize;
    appliedKeys.push('font-size');
  }

  const letterSpacing = toPxNumber(finalStyles['letter-spacing']);
  if (letterSpacing != null && run.letterSpacing == null) {
    run.letterSpacing = letterSpacing;
    appliedKeys.push('letter-spacing');
  }

  const color = toColor(finalStyles.color);
  if (color && !run.color) {
    run.color = color;
    appliedKeys.push('color');
  }

  const highlight = toColor(finalStyles.highlight);
  if (highlight && !run.highlight) {
    run.highlight = highlight;
    appliedKeys.push('highlight');
  }

  const bold = toBoolean(finalStyles.bold);
  if (bold && run.bold === undefined) {
    run.bold = true;
    appliedKeys.push('bold');
  }

  const italic = toBoolean(finalStyles.italic);
  if (italic && run.italic === undefined) {
    run.italic = true;
    appliedKeys.push('italic');
  }

  const strike = toBoolean(finalStyles.strike);
  if (strike && run.strike === undefined) {
    run.strike = true;
    appliedKeys.push('strike');
  }

  const underlineStyle = toUnderlineStyle(finalStyles.underline);
  if (underlineStyle && !run.underline) {
    run.underline = { style: underlineStyle };
    appliedKeys.push('underline');
  }
};

export const extractRunStyleId = (runProperties: unknown): string | null => {
  if (!runProperties) return null;
  if (typeof runProperties === 'object' && !Array.isArray(runProperties)) {
    const styleId = (runProperties as Record<string, unknown>).styleId;
    if (typeof styleId === 'string' && styleId.trim()) {
      return styleId;
    }
    const formatting = (runProperties as Record<string, unknown>).formatting;
    if (
      formatting &&
      typeof formatting === 'object' &&
      typeof (formatting as Record<string, unknown>).styleId === 'string'
    ) {
      return (formatting as Record<string, unknown>).styleId as string;
    }
  }
  if (Array.isArray(runProperties)) {
    const entry = runProperties.find(
      (node) => node && typeof node === 'object' && (node as Record<string, unknown>).xmlName === 'w:rStyle',
    ) as Record<string, unknown> | undefined;
    const attributes = entry?.attributes as Record<string, unknown> | undefined;
    const val = attributes?.['w:val'];
    if (typeof val === 'string' && val.trim()) {
      return val;
    }
  }
  return null;
};
