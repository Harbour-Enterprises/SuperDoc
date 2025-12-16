export const STYLE_ISOLATION_CLASS = 'sd-editor-scoped';

/**
 * Apply the editor style-isolation class to a DOM element.
 * @param {HTMLElement} target
 */
export const applyStyleIsolationClass = (target: HTMLElement | null | undefined): void => {
  if (!target || !target.classList) return;
  target.classList.add(STYLE_ISOLATION_CLASS);
};
