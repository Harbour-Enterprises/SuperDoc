import editorStyles from '@/style.css?inline';

/** @type {CSSStyleSheet | null} */
let cachedStyleSheet = null;
const defaultEditorStyles = editorStyles || '';
/** @type {string} */
let shadowEditorStyles = defaultEditorStyles;

/**
 * Determine whether the current runtime exposes constructable stylesheets.
 *
 * @returns {boolean} True when constructable stylesheets are supported.
 */
export const supportsConstructableStylesheets = () => {
  const DocumentCtor = /** @type {typeof Document | undefined} */ (globalThis.Document);
  const CSSStyleSheetCtor = /** @type {typeof CSSStyleSheet | undefined} */ (globalThis.CSSStyleSheet);

  if (!DocumentCtor || !CSSStyleSheetCtor) return false;

  const documentPrototype = DocumentCtor.prototype;
  const styleSheetPrototype = CSSStyleSheetCtor.prototype;

  return (
    !!documentPrototype &&
    'adoptedStyleSheets' in documentPrototype &&
    !!styleSheetPrototype &&
    typeof styleSheetPrototype.replaceSync === 'function'
  );
};

/**
 * Ensure the editor styles are present within the provided root.
 * Uses constructable stylesheets when available, falling back to inline styles otherwise.
 *
 * @param {ShadowRoot | (DocumentFragment & { adoptedStyleSheets?: CSSStyleSheet[] })} root Shadow root to decorate.
 * @returns {void}
 */
export const ensureStyleSheet = (root) => {
  if (!root || !shadowEditorStyles) return;

  if (supportsConstructableStylesheets()) {
    if (!cachedStyleSheet) {
      const CSSStyleSheetCtor = /** @type {typeof CSSStyleSheet} */ (globalThis.CSSStyleSheet);
      cachedStyleSheet = new CSSStyleSheetCtor();
      cachedStyleSheet.replaceSync(shadowEditorStyles);
    }

    const sheets = Array.isArray(root.adoptedStyleSheets) ? root.adoptedStyleSheets : [];
    if (!sheets.includes(cachedStyleSheet)) {
      root.adoptedStyleSheets = [...sheets, cachedStyleSheet];
    }
    return;
  }

  const doc = /** @type {Document | undefined} */ (globalThis.document);
  if (!doc || typeof root.querySelector !== 'function') return;

  if (!root.querySelector('style[data-super-editor-styles]')) {
    const styleEl = doc.createElement('style');
    styleEl.setAttribute('data-super-editor-styles', '');
    styleEl.textContent = shadowEditorStyles;
    root.appendChild(styleEl);
  }
};

/**
 * Attach (or reuse) the Super Editor shadow root and mount point.
 *
 * @param {HTMLElement | null} hostElement The host element that should own the shadow root.
 * @returns {{ root: ShadowRoot | null, mount: HTMLElement | null }} The resolved shadow root and mount node.
 */
export const ensureEditorShadowRoot = (hostElement) => {
  const doc = /** @type {Document | undefined} */ (globalThis.document);
  if (!hostElement || !doc || typeof hostElement.attachShadow !== 'function') {
    return { root: null, mount: null };
  }

  const root = hostElement.shadowRoot || hostElement.attachShadow({ mode: 'open' });
  ensureStyleSheet(root);

  let mount = root.querySelector('.sd-editor-mount');
  if (!mount) {
    mount = doc.createElement('div');
    mount.className = 'sd-editor-mount';
    root.appendChild(mount);
  }

  return { root, mount };
};

/**
 * Internal testing helpers.
 *
 * @returns {{ resetStyleSheetCache: () => void }}
 */
export const __shadowRootTestUtils = () => ({
  resetStyleSheetCache: () => {
    cachedStyleSheet = null;
    shadowEditorStyles = defaultEditorStyles;
  },
  overrideEditorStyles: (css) => {
    shadowEditorStyles = css;
  },
});

/**
 * Expose raw editor styles for testing visibility only.
 *
 * @returns {string}
 */
export const __getEditorStylesForTest = () => shadowEditorStyles;
