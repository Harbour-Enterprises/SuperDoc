export const CLASS_NAMES = {
  container: 'superdoc-layout',
  page: 'superdoc-page',
  fragment: 'superdoc-fragment',
  line: 'superdoc-line',
  spread: 'superdoc-spread',
  pageHeader: 'superdoc-page-header',
  pageFooter: 'superdoc-page-footer',
};

export type PageStyles = {
  background?: string;
  boxShadow?: string;
  border?: string;
  margin?: string;
};

export const DEFAULT_PAGE_STYLES: Required<PageStyles> = {
  background: '#fff',
  boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',
  border: '1px solid rgba(15, 23, 42, 0.08)',
  margin: '0 auto',
};

export const containerStyles: Partial<CSSStyleDeclaration> = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  background: 'transparent',
  padding: '0',
  gap: '24px',
  overflowY: 'auto',
};

export const containerStylesHorizontal: Partial<CSSStyleDeclaration> = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'safe center',
  background: 'transparent',
  padding: '0',
  gap: '20px',
  overflowX: 'auto',
  minHeight: '100%',
};

export const spreadStyles: Partial<CSSStyleDeclaration> = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '0px',
};

export const pageStyles = (width: number, height: number, overrides?: PageStyles): Partial<CSSStyleDeclaration> => {
  const merged = { ...DEFAULT_PAGE_STYLES, ...(overrides || {}) };

  return {
    position: 'relative',
    width: `${width}px`,
    height: `${height}px`,
    minWidth: `${width}px`,
    minHeight: `${height}px`,
    flexShrink: '0',
    background: merged.background,
    boxShadow: merged.boxShadow,
    border: merged.border,
    margin: merged.margin,
    overflow: 'hidden',
  };
};

export const fragmentStyles: Partial<CSSStyleDeclaration> = {
  position: 'absolute',
  whiteSpace: 'pre',
  overflow: 'visible',
  boxSizing: 'border-box',
};

export const lineStyles = (lineHeight: number): Partial<CSSStyleDeclaration> => ({
  lineHeight: `${lineHeight}px`,
  height: `${lineHeight}px`,
  position: 'relative',
  display: 'block',
  whiteSpace: 'pre',
});

const PRINT_STYLES = `
@media print {
  .${CLASS_NAMES.container} {
    background: transparent;
    padding: 0;
  }

  .${CLASS_NAMES.page} {
    margin: 0;
    border: none;
    box-shadow: none;
    page-break-after: always;
  }
}
`;

const LINK_AND_TOC_STYLES = `
/* Reset browser default link styling - allow run colors to show through */
.superdoc-link {
  color: inherit !important;
  text-decoration: none !important;
}

.superdoc-link:visited {
  color: inherit !important;
}

.superdoc-link:hover {
  text-decoration: underline;
}

/* Focus visible for keyboard navigation (WCAG 2.1 SC 2.4.7) */
.superdoc-link:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
  border-radius: 2px;
}

/* Remove outline for mouse users */
.superdoc-link:focus:not(:focus-visible) {
  outline: none;
}

/* Active state */
.superdoc-link:active {
  opacity: 0.8;
}

/* Print mode: show URLs after links */
@media print {
  .superdoc-link::after {
    content: " (" attr(href) ")";
    font-size: 0.9em;
    color: #666;
  }

  /* Don't show URL for anchor-only links */
  .superdoc-link[href^="#"]::after {
    content: "";
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .superdoc-link:focus-visible {
    outline-width: 3px;
    outline-offset: 3px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .superdoc-link {
    transition: none;
  }
}

/* Screen reader only content (WCAG SC 1.3.1) */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* TOC entry specific styles - prevent wrapping */
.superdoc-toc-entry {
  white-space: nowrap !important;
}

.superdoc-toc-entry .superdoc-link {
  color: inherit !important;
  text-decoration: none !important;
  cursor: default;
}

.superdoc-toc-entry .superdoc-link:hover {
  text-decoration: none;
}

/* Override focus styles for TOC links (they're not interactive) */
.superdoc-toc-entry .superdoc-link:focus-visible {
  outline: none;
}

/* Remove focus outlines from layout engine elements */
.superdoc-layout,
.superdoc-page,
.superdoc-layout:focus,
.superdoc-page:focus {
  outline: none !important;
}
`;

const TRACK_CHANGE_STYLES = `
.superdoc-layout .track-insert-dec.hidden,
.superdoc-layout .track-delete-dec.hidden {
  display: none;
}

.superdoc-layout .track-insert-dec.highlighted {
  border-top: 1px dashed #00853d;
  border-bottom: 1px dashed #00853d;
  background-color: #399c7222;
}

.superdoc-layout .track-delete-dec.highlighted {
  border-top: 1px dashed #cb0e47;
  border-bottom: 1px dashed #cb0e47;
  background-color: #cb0e4722;
  text-decoration: line-through !important;
  text-decoration-thickness: 2px !important;
}

.superdoc-layout .track-format-dec.highlighted {
  border-bottom: 2px solid gold;
}
`;

let printStylesInjected = false;
let linkStylesInjected = false;
let trackChangeStylesInjected = false;

export const ensurePrintStyles = (doc: Document | null | undefined) => {
  if (printStylesInjected || !doc) return;
  const styleEl = doc.createElement('style');
  styleEl.setAttribute('data-superdoc-print-styles', 'true');
  styleEl.textContent = PRINT_STYLES;
  doc.head?.appendChild(styleEl);
  printStylesInjected = true;
};

export const ensureLinkStyles = (doc: Document | null | undefined) => {
  if (linkStylesInjected || !doc) return;
  const styleEl = doc.createElement('style');
  styleEl.setAttribute('data-superdoc-link-styles', 'true');
  styleEl.textContent = LINK_AND_TOC_STYLES;
  doc.head?.appendChild(styleEl);
  linkStylesInjected = true;
};

export const ensureTrackChangeStyles = (doc: Document | null | undefined) => {
  if (trackChangeStylesInjected || !doc) return;
  const styleEl = doc.createElement('style');
  styleEl.setAttribute('data-superdoc-track-change-styles', 'true');
  styleEl.textContent = TRACK_CHANGE_STYLES;
  doc.head?.appendChild(styleEl);
  trackChangeStylesInjected = true;
};
