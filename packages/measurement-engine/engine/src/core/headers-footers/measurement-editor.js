import { getStarterExtensions } from '@extensions/index.js';
import { Editor } from '@core/Editor.js';
import { createHiddenMeasurementContainer, getDocumentTypography } from './geometry.js';

const RAF_FALLBACK_DELAY = 16;
const measurementExtensionsCache = new WeakMap();
const FALLBACK_IMAGE_STYLE_PATTERN = /(?:content-visibility\s*:\s*auto\s*;?|contain-intrinsic-size\s*:[^;]+;?)/gi;

const sanitizeImageIntrinsicStyles = (root) => {
  if (!root || typeof root.querySelectorAll !== 'function') return;

  const images = root.querySelectorAll('img');
  if (!images?.length) return;

  images.forEach((img) => {
    if (!img) return;

    try {
      const { style } = img;
      if (style) {
        if (style.contentVisibility === 'auto') {
          style.removeProperty?.('content-visibility');
          style.contentVisibility = '';
        }
        if (typeof style.containIntrinsicSize === 'string' && style.containIntrinsicSize.length) {
          style.removeProperty?.('contain-intrinsic-size');
          style.containIntrinsicSize = '';
        }
      }

      const inlineStyle = img.getAttribute('style');
      if (typeof inlineStyle === 'string' && inlineStyle.length) {
        const cleaned = inlineStyle
          .replace(FALLBACK_IMAGE_STYLE_PATTERN, '')
          .replace(/;;+/g, ';')
          .replace(/^\s*;\s*|\s*;\s*$/g, '')
          .trim();

        if (cleaned.length) {
          img.setAttribute('style', cleaned);
        } else {
          img.removeAttribute('style');
        }
      }

      const parseFirstNumber = (value) => {
        if (typeof value !== 'string' || !value.length) return Number.NaN;
        const match = value.match(/([0-9]+(?:\.[0-9]+)?)/);
        return match ? Number.parseFloat(match[1]) : Number.NaN;
      };

      const inlineWidth = parseFirstNumber(style?.width ?? '');
      const attrWidth = parseFirstNumber(img.getAttribute('width') ?? '');
      const widthPx = Number.isFinite(inlineWidth) && inlineWidth > 0 ? inlineWidth : attrWidth;

      if (Number.isFinite(widthPx) && widthPx > 0) {
        const naturalWidth = Number.isFinite(img.naturalWidth) ? img.naturalWidth : 0;
        const naturalHeight = Number.isFinite(img.naturalHeight) ? img.naturalHeight : 0;
        if (naturalWidth > 0 && naturalHeight > 0) {
          const targetHeight = (widthPx / naturalWidth) * naturalHeight;
          const styleHeight = style?.height ?? '';
          const hasExplicitHeight =
            typeof styleHeight === 'string' && styleHeight.trim().length && styleHeight !== 'auto';
          if (!hasExplicitHeight || !styleHeight.includes('px')) {
            style.height = `${targetHeight}px`;
          }
        }
      }
    } catch {
      // Ignore individual image failures; continue sanitizing others.
    }
  });
};

/**
 * Measure a single header/footer section height using a hidden measurement editor.
 * @param {Object} params
 * @param {import('@core/Editor.js').Editor} params.editor Main editor instance.
 * @param {Object} params.record Repository record containing section metadata.
 * @param {Document} params.doc Document reference for DOM operations.
 * @param {Window} params.win Window reference for animation frame scheduling.
 * @param {Array} params.measurementExtensions Extension set for measurement editor.
 * @returns {Promise<number|null>} Measured height in pixels or null if unavailable.
 */
export const measureSectionWithMeasurementEditor = async ({
  editor,
  record,
  doc,
  win,
  measurementExtensions,
  widthPx,
}) => {
  const contentJson = record?.contentJson;
  if (!doc?.createElement || !doc.body) return null;
  if (!contentJson || typeof contentJson !== 'object') {
    return null;
  }

  const typography = getDocumentTypography(editor);
  const container = createHiddenMeasurementContainer({ doc, widthPx, typography });
  doc.body.appendChild(container);

  const requestFrame = win?.requestAnimationFrame?.bind(win) ?? ((cb) => setTimeout(cb, RAF_FALLBACK_DELAY));
  const { media, mediaFiles } = resolveMediaSources(editor);

  return await new Promise((resolve) => {
    let measurementEditor;
    let resolved = false;
    let attempt = 0;
    const maxAttempts = 20;
    const mediaTeardown = [];
    let measurementView = null;

    const cleanup = (heightPx) => {
      if (resolved) return;
      resolved = true;
      try {
        if (measurementEditor && typeof measurementEditor.destroy === 'function') {
          measurementEditor.destroy();
        }
      } catch {}

      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }

      if (mediaTeardown.length) {
        mediaTeardown.forEach((teardown) => {
          try {
            teardown?.();
          } catch {}
        });
      }

      resolve(Number.isFinite(heightPx) ? heightPx : null);
    };

    const readContainerHeight = () => {
      const candidates = [];
      const addValue = (value) => {
        if (Number.isFinite(value) && value > 0) {
          candidates.push(value);
        }
      };

      if (container) {
        addValue(container.offsetHeight);
        addValue(container.scrollHeight);
        const rect = container.getBoundingClientRect?.();
        addValue(rect?.height);
      }

      let flowContentHeight = 0;
      const viewDom = measurementView?.dom ?? null;
      if (viewDom) {
        addValue(viewDom.offsetHeight);
        addValue(viewDom.scrollHeight);
        const viewRect = viewDom.getBoundingClientRect?.();
        addValue(viewRect?.height);
        flowContentHeight = resolveViewContentHeight(viewDom);
      }

      if (Number.isFinite(flowContentHeight) && flowContentHeight > 0) {
        return flowContentHeight;
      }

      const maxCandidate = candidates.length ? Math.max(...candidates) : 0;
      if (Number.isFinite(maxCandidate) && maxCandidate > 0) {
        return maxCandidate;
      }

      return Number.isFinite(estimatedHeightPx) && estimatedHeightPx > 0 ? estimatedHeightPx : 0;
    };

    const estimatedHeightPx = estimateSectionContentHeight({
      contentJson,
      typography,
      widthPx,
    });

    const scheduleMeasurement = () => {
      const performMeasurement = () => {
        sanitizeImageIntrinsicStyles(container);
        const measuredHeight = readContainerHeight();
        if (measuredHeight > 0 || attempt >= maxAttempts) {
          const fallbackHeight = measuredHeight > 0 ? measuredHeight : estimatedHeightPx;
          const resolvedHeight = Number.isFinite(fallbackHeight) && fallbackHeight > 0 ? fallbackHeight : 0;
          cleanup(resolvedHeight);
        } else {
          attempt += 1;
          requestFrame(performMeasurement);
        }
      };

      requestFrame(performMeasurement);
    };

    const monitorMediaAssets = () => {
      sanitizeImageIntrinsicStyles(container);

      const elements = Array.from(container?.querySelectorAll?.('img, video, canvas') ?? []);
      let pending = 0;

      const handleAssetSettled = () => {
        pending = Math.max(0, pending - 1);
        sanitizeImageIntrinsicStyles(container);
        if (pending === 0) {
          scheduleMeasurement();
        }
      };

      elements.forEach((element) => {
        const tagName = typeof element?.tagName === 'string' ? element.tagName.toLowerCase() : '';
        if (tagName === 'img') {
          if (element.complete && element.naturalHeight > 0) {
            return;
          }
          pending += 1;
          element.addEventListener('load', handleAssetSettled, { once: true });
          element.addEventListener('error', handleAssetSettled, { once: true });
          mediaTeardown.push(() => {
            element.removeEventListener('load', handleAssetSettled);
            element.removeEventListener('error', handleAssetSettled);
          });
          return;
        }

        if (tagName === 'video') {
          if (element.readyState >= 2 && element.videoHeight > 0) {
            return;
          }
          pending += 1;
          element.addEventListener('loadeddata', handleAssetSettled, { once: true });
          element.addEventListener('error', handleAssetSettled, { once: true });
          mediaTeardown.push(() => {
            element.removeEventListener('loadeddata', handleAssetSettled);
            element.removeEventListener('error', handleAssetSettled);
          });
          return;
        }

        if (tagName === 'canvas') {
          const boundingRect = element.getBoundingClientRect?.();
          if (boundingRect && Number.isFinite(boundingRect.height) && boundingRect.height > 0) {
            return;
          }
          // Canvas content typically renders synchronously; schedule a single delayed measurement.
          pending += 1;
          requestFrame(() => {
            pending = Math.max(0, pending - 1);
            if (pending === 0) {
              scheduleMeasurement();
            }
          });
        }
      });

      if (pending === 0) {
        scheduleMeasurement();
      }
    };

    const onCreate = ({ editor: measurementInstance }) => {
      try {
        measurementInstance.setEditable(false, false);
      } catch {
        // best effort; ignore failures
      }
      measurementView = measurementInstance?.view ?? null;
      monitorMediaAssets();
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        document.fonts.ready.then(() => {
          scheduleMeasurement();
        });
      }
    };

    try {
      measurementEditor = new Editor({
        element: container,
        extensions: measurementExtensions,
        role: 'viewer',
        mode: 'docx',
        loadFromSchema: true,
        content: contentJson,
        pagination: false,
        documentMode: 'viewing',
        editable: false,
        isHeaderOrFooter: true,
        parentEditor: editor,
        fonts: editor.options.fonts,
        media,
        mediaFiles,
        documentId: `measurement-engine-section-${record?.type ?? 'section'}-${record?.id ?? 'unknown'}`,
        onCreate,
      });
    } catch {
      cleanup(null);
    }
  });
};

export const getMeasurementExtensions = (editor) => {
  if (measurementExtensionsCache.has(editor)) {
    return measurementExtensionsCache.get(editor);
  }

  const extensions = getStarterExtensions().filter((extension) => extension?.name !== 'pagination');
  measurementExtensionsCache.set(editor, extensions);
  return extensions;
};

const resolveViewContentHeight = (root) => {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return 0;
  }

  const view = root.ownerDocument?.defaultView ?? null;
  const measurable = root.querySelectorAll('[data-node-type]');
  if (!measurable || measurable.length === 0) {
    const rect = typeof root.getBoundingClientRect === 'function' ? root.getBoundingClientRect() : null;
    return rect && Number.isFinite(rect.height) ? rect.height : 0;
  }

  let minTop = Number.POSITIVE_INFINITY;
  let maxBottom = Number.NEGATIVE_INFINITY;

  measurable.forEach((node) => {
    if (!node || typeof node.getBoundingClientRect !== 'function') {
      return;
    }

    const computed = view?.getComputedStyle?.(node);
    if (computed) {
      const position = computed.position;
      if (position === 'absolute' || position === 'fixed') {
        return;
      }
      if (computed.display === 'none') {
        return;
      }
    }

    const rect = node.getBoundingClientRect();
    if (!rect || !Number.isFinite(rect.height) || rect.height <= 0) {
      return;
    }

    if (Number.isFinite(rect.top) && rect.top < minTop) {
      minTop = rect.top;
    }
    if (Number.isFinite(rect.bottom) && rect.bottom > maxBottom) {
      maxBottom = rect.bottom;
    }
  });

  if (!Number.isFinite(minTop) || !Number.isFinite(maxBottom) || maxBottom <= minTop) {
    return 0;
  }

  const contentHeight = maxBottom - minTop;
  return Number.isFinite(contentHeight) && contentHeight > 0 ? contentHeight : 0;
};

function estimateSectionContentHeight({ contentJson, typography, widthPx }) {
  if (!contentJson || typeof contentJson !== 'object') {
    return 0;
  }

  const lineHeight = normalizeLineHeight(typography);
  const charWidth = normalizeCharWidth(typography);
  const maxWidth = resolveContentWidth(widthPx, charWidth);

  let totalLines = 0;

  const traverse = (node) => {
    if (!node) return;

    if (Array.isArray(node)) {
      node.forEach(traverse);
      return;
    }

    const { type, content } = node;

    if (type === 'paragraph' || type === 'heading') {
      const lines = estimateParagraphLines(node, { charWidth, maxWidth });
      totalLines += lines;
      return;
    }

    if (type === 'table' || type === 'tableRow' || type === 'tableCell') {
      traverse(content);
      return;
    }

    if (type === 'bulletList' || type === 'orderedList' || type === 'listItem' || type === 'blockquote') {
      traverse(content);
      return;
    }

    if (content) {
      traverse(content);
    }
  };

  traverse(contentJson.content);

  return totalLines > 0 ? Math.round(totalLines * lineHeight) : 0;
}

function estimateParagraphLines(node, { charWidth, maxWidth }) {
  if (!hasRenderableText(node)) {
    return 0;
  }

  const forcedBreaks = countHardBreaks(node);
  const explicitLines = forcedBreaks + 1;

  const textLength = collectTextLength(node);
  if (textLength <= 0) {
    return explicitLines;
  }

  const capacity = Math.max(1, Math.floor(maxWidth / charWidth));
  const wrappedLines = Math.ceil(textLength / capacity);
  return Math.max(explicitLines, wrappedLines, 1);
}

function hasRenderableText(node) {
  if (!node) return false;
  if (Array.isArray(node)) return node.some(hasRenderableText);
  if (node.type === 'text') {
    const text = typeof node.text === 'string' ? node.text : '';
    return text.trim().length > 0;
  }
  if (node.type === 'hardBreak') return true;
  if (node.content) return hasRenderableText(node.content);
  return false;
}

function countHardBreaks(node) {
  if (!node) return 0;
  if (Array.isArray(node)) return node.reduce((sum, child) => sum + countHardBreaks(child), 0);
  const self = node.type === 'hardBreak' ? 1 : 0;
  if (!node.content) return self;
  return self + countHardBreaks(node.content);
}

function collectTextLength(node) {
  if (!node) return 0;
  if (Array.isArray(node)) {
    return node.reduce((sum, child) => sum + collectTextLength(child), 0);
  }
  if (node.type === 'text') {
    return typeof node.text === 'string' ? node.text.length : 0;
  }
  if (!node.content) return 0;
  return collectTextLength(node.content);
}

function normalizeLineHeight(typography) {
  const fromTypography = Number.isFinite(typography?.lineHeightPx) ? typography.lineHeightPx : null;
  const fromFont = Number.isFinite(typography?.fontSizePx) ? typography.fontSizePx * 1.2 : null;
  const value = fromTypography ?? fromFont ?? 18;
  return Math.max(4, value);
}

function normalizeCharWidth(typography) {
  const fontSize = Number.isFinite(typography?.fontSizePx) ? typography.fontSizePx : 16;
  const estimated = fontSize * 0.55;
  return Math.max(4, estimated);
}

function resolveContentWidth(widthPx, charWidth) {
  if (Number.isFinite(widthPx) && widthPx > 0) {
    return widthPx;
  }
  return Math.max(200, charWidth * 10);
}

const resolveMediaSources = (editor) => {
  const media = editor?.storage?.image?.media ?? editor?.options?.media;
  const mediaFiles = editor?.storage?.image?.mediaFiles ?? editor?.options?.mediaFiles;
  return { media, mediaFiles };
};
