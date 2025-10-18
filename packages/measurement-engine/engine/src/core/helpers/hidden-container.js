const DEFAULT_HIDDEN_CONTAINER_STYLES = Object.freeze({
  position: 'absolute',
  left: '-100000px',
  top: '-100000px',
  pointerEvents: 'none',
  visibility: 'hidden',
  zIndex: '-1',
  boxSizing: 'border-box',
  padding: '0',
  margin: '0',
  opacity: '0',
  overflow: 'hidden',
});

/**
 * Shared styles for DOM containers used exclusively for off-screen measurement.
 * @type {Readonly<Record<string, string>>}
 */
export const HIDDEN_CONTAINER_STYLES = DEFAULT_HIDDEN_CONTAINER_STYLES;

/**
 * Apply hidden container styles to an element, optionally overriding specific rules.
 *
 * @param {HTMLElement} element - The element to style.
 * @param {Record<string, string>} [overrides] - Optional style overrides or additions.
 * @returns {HTMLElement} The same element reference for chaining.
 */
export const applyHiddenContainerStyles = (element, overrides = {}) => {
  if (!element || !element.style) return element;

  Object.entries(HIDDEN_CONTAINER_STYLES).forEach(([property, value]) => {
    element.style[property] = value;
  });

  Object.entries(overrides).forEach(([property, value]) => {
    if (value != null) {
      element.style[property] = value;
    }
  });

  return element;
};
