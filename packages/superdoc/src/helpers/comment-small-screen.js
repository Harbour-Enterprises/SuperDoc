import { isPlainObject } from './object-guards.js';

export const COMPACT_ANCHOR_SELECTOR = '[data-track-change-id], .superdoc-comment-highlight, .sd-comment-anchor';

export const DEFAULT_COMMENTS_SIDEBAR_LANE_PX = 320;
export const DEFAULT_COMMENTS_MIN_GUTTER_PX = 24;
export const DEFAULT_DOCUMENT_VISIBLE_MIN_WIDTH_PX = 816;
export const RIGHT_CLICK_COMMENT_SUPPRESS_MS = 250;
export const DEFAULT_COMMENTS_LAYOUT = 'sidebar';
export const VALID_COMMENTS_LAYOUTS = new Set(['auto', 'sidebar', 'inline']);

const firstDefined = (...values) => values.find((value) => value !== undefined);

const normalizeResponsiveTarget = (value) => {
  if (typeof value === 'string') {
    const target = value.trim();
    return target || undefined;
  }
  if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) return value;
  return undefined;
};

/**
 * Whether a context-menu event landed inside the tracked-change carrier that
 * is already visually active. The review visual owner maintains this marker,
 * so the right-click path can stay synchronous and avoid a catalog lookup or
 * document-wide DOM query.
 *
 * @param {EventTarget | null} target
 * @returns {boolean}
 */
export function isActiveTrackedChangeContextMenuTarget(target) {
  const element = /** @type {{ closest?: (selector: string) => unknown } | null} */ (target);
  return typeof element?.closest === 'function' && element.closest('.track-change-focused') != null;
}

/**
 * Resolve canonical comments UI fields while preserving valid deprecated
 * fields for consumers that still read the normalized configuration.
 *
 * @param {false | Record<string, unknown> | undefined} commentsConfig
 * @returns {false | Record<string, unknown> | undefined}
 */
export function normalizeCommentsUiConfig(commentsConfig) {
  if (!commentsConfig || commentsConfig === false || typeof commentsConfig !== 'object') {
    return commentsConfig;
  }

  const normalized = { ...commentsConfig };
  const responsive = isPlainObject(commentsConfig.responsive) ? commentsConfig.responsive : {};
  const layout = firstDefined(commentsConfig.layout, commentsConfig.displayMode);
  const target = normalizeResponsiveTarget(firstDefined(responsive.target, commentsConfig.compactMeasurementSelector));
  const breakpoint = firstDefined(responsive.breakpoint, commentsConfig.compactBreakpointPx);

  const deprecatedDisplayMode = commentsConfig.displayMode;
  if (!VALID_COMMENTS_LAYOUTS.has(deprecatedDisplayMode)) delete normalized.displayMode;

  const deprecatedTarget = normalizeResponsiveTarget(commentsConfig.compactMeasurementSelector);
  if (deprecatedTarget === undefined) delete normalized.compactMeasurementSelector;
  else normalized.compactMeasurementSelector = deprecatedTarget;

  const deprecatedBreakpoint = commentsConfig.compactBreakpointPx;
  if (
    !(typeof deprecatedBreakpoint === 'number' && Number.isFinite(deprecatedBreakpoint) && deprecatedBreakpoint >= 0)
  ) {
    delete normalized.compactBreakpointPx;
  }

  delete normalized.layout;
  delete normalized.responsive;

  if (VALID_COMMENTS_LAYOUTS.has(layout)) normalized.layout = layout;

  const normalizedResponsive = {};
  if (target !== undefined) normalizedResponsive.target = target;
  if (typeof breakpoint === 'number' && Number.isFinite(breakpoint) && breakpoint >= 0) {
    normalizedResponsive.breakpoint = breakpoint;
  }
  if (Object.keys(normalizedResponsive).length > 0) normalized.responsive = normalizedResponsive;

  return normalized;
}
