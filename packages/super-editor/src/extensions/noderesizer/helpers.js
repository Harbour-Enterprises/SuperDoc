let cachedShadowRootCtor;
const getShadowRootCtor = () => {
  if (cachedShadowRootCtor === undefined) {
    const ctor = globalThis.ShadowRoot;
    cachedShadowRootCtor = typeof ctor === 'function' ? ctor : null;
  }
  return cachedShadowRootCtor;
};

let cachedElementCtor;
const getElementCtor = () => {
  if (cachedElementCtor === undefined) {
    const ctor = globalThis.Element;
    cachedElementCtor = typeof ctor === 'function' ? ctor : null;
  }
  return cachedElementCtor;
};

export const queryWithinRoot = (domNode, selector) => {
  if (!selector) return null;

  const shadowRoot = domNode?.shadowRoot;
  if (shadowRoot && typeof shadowRoot.querySelector === 'function') {
    return shadowRoot.querySelector(selector);
  }

  const rawRoot = domNode?.getRootNode?.();
  const ShadowRootCtor = getShadowRootCtor();
  const isShadowRoot = !!ShadowRootCtor && rawRoot instanceof ShadowRootCtor;
  if (isShadowRoot && typeof rawRoot.querySelector === 'function') {
    return rawRoot.querySelector(selector);
  }

  if (domNode && typeof domNode.querySelector === 'function') {
    const localMatch = domNode.querySelector(selector);
    if (localMatch) return localMatch;
  }

  return typeof document !== 'undefined' ? document.querySelector(selector) : null;
};

export const findInEventPath = (event, selector) => {
  if (!event || !selector) return undefined;

  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  const ElementCtor = getElementCtor();
  return path.find((node) => ElementCtor && node instanceof ElementCtor && node.matches(selector));
};
