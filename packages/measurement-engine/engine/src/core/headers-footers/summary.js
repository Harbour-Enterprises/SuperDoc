import { getPageContentWidthPx, normalizeInchesToPx } from './geometry.js';
import { getMeasurementExtensions, measureSectionWithMeasurementEditor } from './measurement-editor.js';

/**
 * Measure header and footer sections via hidden measurement editors and cache heights.
 * @param {Object} params
 * @param {import('@core/Editor.js').Editor} params.editor Main editor instance.
 * @param {Object} params.repository Header/footer repository interface.
 * @returns {Promise<{ sectionMetricsById: Map<string, {contentHeightPx:number,distancePx:number,effectiveHeightPx:number}>, variantLookup: Record<'header'|'footer', Map<string, string>>, contentWidthPx: number|null, distancesPx: {header:number, footer:number} }>} Measurement summary.
 */
export const measureHeaderFooterSections = async ({ editor, repository }) => {
  if (!editor || !repository || typeof repository.list !== 'function') {
    return createEmptyMeasurementSummary();
  }

  const { doc, win } = getMeasurementEnvironment(editor);
  if (!doc?.body) {
    return createEmptyMeasurementSummary();
  }

  const measurementExtensions = getMeasurementExtensions(editor);
  const contentWidthPx = getPageContentWidthPx(editor);
  const sections = getHeaderFooterRecords(repository);
  if (!sections.header.length && !sections.footer.length) {
    return createEmptyMeasurementSummary();
  }

  const sectionMetricsById = new Map();
  const variantLookup = {
    header: new Map(),
    footer: new Map(),
  };

  const pageMarginsPx = normalizeInchesToPx(editor?.converter?.pageStyles?.pageMargins);
  const headerDistancePx = Number.isFinite(pageMarginsPx?.header) ? pageMarginsPx.header : 0;
  const footerDistancePx = Number.isFinite(pageMarginsPx?.footer) ? pageMarginsPx.footer : 0;

  const measureRecord = async (record) => {
    if (!record?.id || !record?.contentJson) return null;

    const rawHeightPx = await repository.ensureMeasured(record.id, async () => {
      const measured = await measureSectionWithMeasurementEditor({
        editor,
        record,
        doc,
        win,
        measurementExtensions,
        widthPx: contentWidthPx,
      });
      return measured;
    });

    const contentHeightPx = Number.isFinite(rawHeightPx) ? rawHeightPx : 0;
    const distancePx = record.type === 'footer' ? footerDistancePx : headerDistancePx;
    const effectiveHeightPx = contentHeightPx + distancePx;

    sectionMetricsById.set(record.id, {
      contentHeightPx,
      distancePx,
      effectiveHeightPx,
    });
    registerVariants(record, variantLookup);
    return rawHeightPx;
  };

  for (const record of sections.header) {
    await measureRecord(record);
  }

  for (const record of sections.footer) {
    await measureRecord(record);
  }

  ensureDefaultVariants(sections, variantLookup);

  const summary = {
    sectionMetricsById,
    variantLookup,
    contentWidthPx,
    distancesPx: {
      header: headerDistancePx,
      footer: footerDistancePx,
    },
  };

  return summary;
};

/**
 * Determine header/footer identifiers and heights for a page index.
 * @param {Object} params
 * @param {Record<'header'|'footer', Map<string, string>>} params.variantLookup Variant-to-id mapping.
 * @param {Map<string, {contentHeightPx:number,distancePx:number,effectiveHeightPx:number}>} params.metricsById Section metrics keyed by id.
 * @param {number} params.pageIndex Zero-based page index.
 * @param {boolean} [params.isLastPage=false] Whether this is the final page.
 * @returns {{ header: { id: string|null, metrics: Object|null, heightPx: number|null }, footer: { id: string|null, metrics: Object|null, heightPx: number|null } }}
 */
export const resolveHeaderFooterForPage = ({ variantLookup, metricsById, pageIndex, isLastPage = false }) => {
  const headerId = resolveSectionId('header', variantLookup, pageIndex, isLastPage);
  const footerId = resolveSectionId('footer', variantLookup, pageIndex, isLastPage);

  const headerMetrics = headerId ? (metricsById.get(headerId) ?? null) : null;
  const footerMetrics = footerId ? (metricsById.get(footerId) ?? null) : null;

  return {
    header: {
      id: headerId,
      metrics: headerMetrics,
      heightPx: headerMetrics?.effectiveHeightPx ?? null,
    },
    footer: {
      id: footerId,
      metrics: footerMetrics,
      heightPx: footerMetrics?.effectiveHeightPx ?? null,
    },
  };
};

/**
 * Resolve document/window references for measurement usage.
 * @param {import('@core/Editor.js').Editor} editor
 * @returns {{ doc: Document|null, win: Window|null }}
 */
export const getMeasurementEnvironment = (editor) => {
  const doc = editor?.options?.mockDocument ?? (typeof document !== 'undefined' ? document : null);
  const win = editor?.options?.mockWindow ?? (typeof window !== 'undefined' ? window : null);
  return { doc, win };
};

/**
 * Collect header/footer records from the repository.
 * @param {Object} repository
 * @returns {{ header: Array, footer: Array }}
 */
export const getHeaderFooterRecords = (repository) => {
  const header = Array.isArray(repository.list?.('header')) ? repository.list('header').filter(Boolean) : [];
  const footer = Array.isArray(repository.list?.('footer')) ? repository.list('footer').filter(Boolean) : [];
  return { header, footer };
};

const createEmptyMeasurementSummary = () => ({
  sectionMetricsById: new Map(),
  variantLookup: {
    header: new Map(),
    footer: new Map(),
  },
  contentWidthPx: null,
  distancesPx: {
    header: 0,
    footer: 0,
  },
});

const registerVariants = (record, variantLookup) => {
  const type = record?.type;
  if (type !== 'header' && type !== 'footer') return;

  const slot = variantLookup[type];
  if (!slot) return;

  const variants = Array.isArray(record?.meta?.variants) ? record.meta.variants : [];
  variants.forEach((variant) => {
    if (typeof variant === 'string' && !slot.has(variant)) {
      slot.set(variant, record.id);
    }
  });
};

const ensureDefaultVariants = (sections, variantLookup) => {
  ['header', 'footer'].forEach((type) => {
    const slot = variantLookup[type];
    if (slot.has('default')) return;

    const fallback = sections[type].find(Boolean);
    if (fallback?.id) {
      slot.set('default', fallback.id);
    }
  });
};

const resolveSectionId = (type, variantLookup, pageIndex, isLastPage) => {
  const slot = variantLookup[type];
  if (!slot) return null;

  const pageNumber = pageIndex + 1;
  const candidates = [];

  if (pageIndex === 0) {
    candidates.push('first', 'titlePg');
  }

  candidates.push(pageNumber % 2 === 0 ? 'even' : 'odd');

  if (isLastPage) {
    candidates.push('last');
  }

  candidates.push('default');

  for (const variant of candidates) {
    if (slot.has(variant)) {
      return slot.get(variant);
    }
  }

  return null;
};
