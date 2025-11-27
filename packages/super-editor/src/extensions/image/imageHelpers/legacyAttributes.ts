interface WrapConfig {
  type: string;
  attrs: Record<string, unknown>;
}

interface ImageAttrs {
  wrap?: WrapConfig;
  wrapText?: string;
  wrapTopAndBottom?: boolean;
  marginOffset?: MarginOffset;
  [key: string]: unknown;
}

interface MarginOffset {
  left?: number;
  horizontal?: number;
  top?: number;
  right?: number;
  bottom?: number;
}

/**
 * Normalize wrap attribute ensuring backward compatibility with legacy wrap fields.
 * @param attrs - Image attributes that may contain wrap configuration
 * @returns Normalized wrap configuration
 */
export const normalizeWrap = (attrs: Record<string, unknown> = {}): WrapConfig => {
  const imageAttrs = attrs as ImageAttrs;
  const wrap = imageAttrs.wrap;
  if (wrap?.type && wrap.type !== 'Inline') {
    return {
      type: wrap.type,
      attrs: wrap.attrs ?? {},
    };
  }
  // If the document already has an explicit inline wrap with attrs, keep it.
  // The generic inline branch below only handles empty/default inline wraps, so we need
  // this early exit to avoid falling through to legacy wrapText fallbacks.
  if (wrap?.type === 'Inline' && Object.keys(wrap.attrs ?? {}).length) {
    return {
      type: 'Inline',
      attrs: wrap.attrs,
    };
  }

  if (!wrap && imageAttrs.wrapText) {
    return {
      type: 'Square',
      attrs: {
        wrapText: imageAttrs.wrapText,
      },
    };
  }

  if (!wrap && imageAttrs.wrapTopAndBottom) {
    return {
      type: 'TopAndBottom',
      attrs: {},
    };
  }

  if (wrap?.type === 'Inline') {
    return {
      type: 'Inline',
      attrs: wrap.attrs ?? {},
    };
  }

  return {
    type: 'Inline',
    attrs: {},
  };
};

/**
 * Normalize margin offsets ensuring backward compatibility with legacy left offset.
 * @param marginOffset - Margin offset configuration
 * @returns Normalized margin offset with horizontal, top, right, bottom properties
 */
export const normalizeMarginOffset = (marginOffset: Record<string, unknown> = {}): MarginOffset => {
  const { left, horizontal, top, right, bottom, ...rest } = marginOffset as MarginOffset & Record<string, unknown>;
  return {
    ...rest,
    horizontal: horizontal ?? left,
    top,
    right,
    bottom,
  };
};

/**
 * Convenience helper returning normalized wrap and marginOffset.
 * @param attrs - Image attributes
 * @returns Normalized wrap and margin offset configuration
 */
export const getNormalizedImageAttrs = (
  attrs: Record<string, unknown> = {},
): { wrap: WrapConfig; marginOffset: MarginOffset } => {
  const imageAttrs = attrs as ImageAttrs;
  return {
    wrap: normalizeWrap(attrs),
    marginOffset: normalizeMarginOffset((imageAttrs.marginOffset ?? {}) as Record<string, unknown>),
  };
};
