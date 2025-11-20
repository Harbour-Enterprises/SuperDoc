import { Editor } from '@harbour-enterprises/super-editor';

type LayoutConfig = {
  pageSize: { w: number; h: number };
  margins: { top: number; right: number; bottom: number; left: number; header?: number; footer?: number };
};

type PageStyles = {
  pageMargins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    header?: number;
    footer?: number;
    gutter?: number;
  };
};

type PageMargins = NonNullable<PageStyles['pageMargins']>;

type Getter<T> = () => T | null;

type HandleKind = 'header' | 'footer';

// Ruler dimensions (in pixels)
const RULER_WIDTH = 14; // px (30% skinnier than 20px)
const HANDLE_HEIGHT = 10; // px

// Conversion constants
const PIXELS_PER_INCH = 96;
const RULER_STEP_INCHES = 0.125; // 1/8 inch
const RULER_STEP_SHIFT_INCHES = 0.25; // 1/4 inch with Shift key

type PageEntry = {
  pageEl: HTMLElement;
  rootEl: HTMLElement; // ruler root element
  ticksEl: HTMLElement;
  headerHandle: HTMLElement;
  footerHandle: HTMLElement;
  headerLabel?: HTMLElement;
  footerLabel?: HTMLElement;
  headerGuide?: HTMLElement;
  footerGuide?: HTMLElement;
  hintEl?: HTMLElement;
};

/**
 * Manages a vertical ruler overlay that appears only for pages near the viewport.
 * Body-only header/footer updates for now (updates editor.pageStyles.pageMargins).
 */
export class VerticalRulerManager {
  private layoutHost: HTMLElement;
  private getEditor: Getter<InstanceType<typeof Editor>>;
  private getConfig: Getter<LayoutConfig>;
  private getLayout?: Getter<{
    pageSize: { w: number; h: number };
    pages: Array<{ number: number; margins?: { top?: number; bottom?: number; left?: number } }>;
  } | null>;
  private getTarget?: Getter<'body' | 'section'>; // deprecated in demo; auto-targeting used
  private container: HTMLElement | null = null; // .superdoc-layout
  private io: IntersectionObserver | null = null;
  private pagesObserved = new Set<HTMLElement>();
  private entries = new Map<HTMLElement, PageEntry>();
  private dragging: { pageNumber: number; kind: HandleKind } | null = null;

  constructor(
    layoutHost: HTMLElement,
    getEditor: Getter<InstanceType<typeof Editor>>,
    getConfig: Getter<LayoutConfig>,
    getLayout?: Getter<{
      pageSize: { w: number; h: number };
      pages: Array<{ number: number; margins?: { top?: number; bottom?: number; left?: number } }>;
    } | null>,
    getTarget?: Getter<'body' | 'section'>,
  ) {
    this.layoutHost = layoutHost;
    this.getEditor = getEditor;
    this.getConfig = getConfig;
    this.getLayout = getLayout;
    this.getTarget = getTarget;

    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
  }

  enable(): void {
    // The painter creates a scrollable container with class .superdoc-layout
    this.container = this.layoutHost.querySelector<HTMLElement>('.superdoc-layout') || this.layoutHost;
    this.createObserver();
    this.observePages();
  }

  disable(): void {
    this.io?.disconnect();
    this.io = null;
    this.pagesObserved.clear();
    this.entries.forEach((entry) => entry.rootEl.remove());
    this.entries.clear();
    this.container = null;
    this.detachGlobalListeners();
  }

  /**
   * Call after re-paint to rebind pages and refresh handle positions.
   */
  refresh(): void {
    if (!this.container) {
      this.container = this.layoutHost.querySelector<HTMLElement>('.superdoc-layout') || this.layoutHost;
    }
    this.observePages();
    // Update handle positions for visible pages
    const cfg = this.getConfig();
    if (!cfg) return;
    this.entries.forEach((entry) => this.placeHandles(entry, cfg));
  }

  private createObserver(): void {
    if (!this.container) return;
    this.io?.disconnect();
    this.io = new IntersectionObserver(
      (entries) => {
        const cfg = this.getConfig();
        if (!cfg) return;
        entries.forEach((e) => {
          const page = e.target as HTMLElement;
          const pageNumber = Number(page.dataset.pageNumber || '0');
          // If currently dragging on this page, do not add/remove its ruler
          if (this.dragging && this.dragging.pageNumber === pageNumber) {
            return;
          }
          if (e.isIntersecting) {
            // Only mount when at least 10% visible
            this.ensureRuler(page, cfg);
          } else {
            this.removeRuler(page);
          }
        });
      },
      {
        root: this.container,
        rootMargin: '200px 0px', // pre-load slightly above/below view
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );
  }

  private observePages(): void {
    if (!this.io || !this.container) return;
    // Rebind
    this.io.disconnect();
    this.pagesObserved.clear();
    const pages = this.container.querySelectorAll<HTMLElement>('.superdoc-page');
    pages.forEach((p) => {
      this.io!.observe(p);
      this.pagesObserved.add(p);
    });
  }

  private ensureRuler(pageEl: HTMLElement, cfg: LayoutConfig): void {
    if (this.entries.has(pageEl)) {
      const entry = this.entries.get(pageEl)!;
      this.placeHandles(entry, cfg);
      return;
    }

    const root = document.createElement('div');
    root.className = 'vertical-ruler';
    Object.assign(root.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: `${RULER_WIDTH}px`,
      height: '100%',
      zIndex: '4',
      pointerEvents: 'auto',
      userSelect: 'none',
    } as CSSStyleDeclaration);

    const ticks = this.buildTicks(cfg);
    root.appendChild(ticks);

    const headerHandle = this.buildHandle('header');
    const footerHandle = this.buildHandle('footer');
    root.appendChild(headerHandle);
    root.appendChild(footerHandle);

    pageEl.appendChild(root);
    const entry: PageEntry = {
      pageEl,
      rootEl: root,
      ticksEl: ticks,
      headerHandle,
      footerHandle,
    };

    // Labels
    entry.headerLabel = this.buildLabel('header');
    entry.footerLabel = this.buildLabel('footer');
    root.appendChild(entry.headerLabel);
    root.appendChild(entry.footerLabel);

    // Guidelines (hidden by default, shown during drag)
    entry.headerGuide = this.buildGuide('header');
    entry.footerGuide = this.buildGuide('footer');
    pageEl.appendChild(entry.headerGuide);
    pageEl.appendChild(entry.footerGuide);

    // Wire events (pointer events for robust dragging)
    headerHandle.addEventListener('pointerdown', (ev) => this.onDragStart(ev as PointerEvent, entry, 'header'));
    footerHandle.addEventListener('pointerdown', (ev) => this.onDragStart(ev as PointerEvent, entry, 'footer'));

    // Only show labels while dragging; no hover listeners

    // Keyboard (1/8" nudge)
    const onKey = (kind: HandleKind) => (ev: KeyboardEvent) => this.onKeyDown(ev, entry, kind);
    headerHandle.addEventListener('keydown', onKey('header'));
    footerHandle.addEventListener('keydown', onKey('footer'));

    this.entries.set(pageEl, entry);
    this.placeHandles(entry, cfg);
  }

  private removeRuler(pageEl: HTMLElement): void {
    const entry = this.entries.get(pageEl);
    if (!entry) return;
    // Avoid tearing down the active page while dragging
    const num = Number(pageEl.dataset.pageNumber || '0');
    if (this.dragging && this.dragging.pageNumber === num) {
      return;
    }
    entry.rootEl.remove();
    this.entries.delete(pageEl);
  }

  private buildTicks(cfg: LayoutConfig): HTMLElement {
    const el = document.createElement('div');
    el.className = 'vertical-ruler__ticks';
    Object.assign(el.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      bottom: '0',
      width: '100%',
    } as CSSStyleDeclaration);

    el.innerHTML = '';
    const inchPx = 96;
    const totalInches = Math.max(1, Math.round(cfg.pageSize.h / inchPx));
    for (let i = 0; i <= totalInches; i++) {
      const tick = document.createElement('div');
      tick.className = 'vertical-ruler__tick';
      Object.assign(tick.style, {
        position: 'absolute',
        left: '0',
        width: '100%',
        height: '1px',
        background: '#666',
        top: `${i * inchPx}px`,
        opacity: '0.7',
      } as CSSStyleDeclaration);
      el.appendChild(tick);

      if (i < totalInches) {
        // 1/8" ticks: q = 1..7
        for (let q = 1; q < 8; q++) {
          const sub = document.createElement('div');
          sub.className = 'vertical-ruler__subtick';
          // Visual hierarchy: half > quarter > eighth
          let wFactor: number;
          let opacity: number;
          const color = '#9aa4b2';
          if (q === 4) {
            // 1/2 inch
            wFactor = 0.9;
            opacity = 0.7;
          } else if (q === 2 || q === 6) {
            // 1/4 inch
            wFactor = 0.65;
            opacity = 0.55;
          } else {
            // 1/8 inch (make smaller/lighter)
            wFactor = 0.35;
            opacity = 0.35;
          }

          Object.assign(sub.style, {
            position: 'absolute',
            left: '0',
            width: `${Math.round(RULER_WIDTH * wFactor)}px`,
            height: '1px',
            background: color,
            top: `${i * inchPx + (inchPx / 8) * q}px`,
            opacity: String(opacity),
          } as CSSStyleDeclaration);
          el.appendChild(sub);
        }
      }
    }

    return el;
  }

  private buildHandle(kind: HandleKind): HTMLElement {
    const handle = document.createElement('div');
    handle.className = `vertical-ruler__handle vertical-ruler__handle--${kind}`;
    Object.assign(handle.style, {
      position: 'absolute',
      left: '0',
      width: `${RULER_WIDTH}px`,
      height: `${HANDLE_HEIGHT}px`,
      borderRadius: '0 4px 4px 0',
      background: kind === 'header' ? '#10b981' : '#3b82f6',
      opacity: '0.7',
      cursor: 'ns-resize',
      boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
    } as CSSStyleDeclaration);
    handle.tabIndex = 0;
    handle.setAttribute('role', 'slider');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-label', kind === 'header' ? 'Header margin' : 'Footer margin');
    return handle;
  }

  private buildLabel(kind: HandleKind): HTMLElement {
    const label = document.createElement('div');
    label.className = `vertical-ruler__label vertical-ruler__label--${kind}`;
    Object.assign(label.style, {
      position: 'absolute',
      left: `${RULER_WIDTH + 4}px`,
      minWidth: '32px',
      padding: '1px 4px',
      fontSize: '11px',
      lineHeight: '14px',
      color: '#e5e7eb',
      background: 'rgba(15,23,42,0.85)',
      border: '1px solid rgba(148,163,184,0.3)',
      borderRadius: '4px',
      pointerEvents: 'none',
      userSelect: 'none',
      transform: 'translateY(-50%)',
      display: 'none',
      zIndex: '5',
      textAlign: 'center',
    } as CSSStyleDeclaration);
    label.textContent = kind === 'header' ? '0.00 in' : '0.00 in';
    return label;
  }

  private buildGuide(kind: HandleKind): HTMLElement {
    const guide = document.createElement('div');
    guide.className = `vertical-ruler__guide vertical-ruler__guide--${kind}`;
    Object.assign(guide.style, {
      position: 'absolute',
      left: '0',
      width: '100%',
      height: '1px',
      background: kind === 'header' ? 'rgba(16,185,129,0.45)' : 'rgba(59,130,246,0.45)',
      pointerEvents: 'none',
      zIndex: '3',
      display: 'none',
    } as CSSStyleDeclaration);
    return guide;
  }

  private showGuide(entry: PageEntry, kind: HandleKind, y: number): void {
    const el = kind === 'header' ? entry.headerGuide : entry.footerGuide;
    if (!el) return;
    el.style.top = `${Math.round(y)}px`;
    el.style.display = 'block';
  }

  private hideGuides(entry: PageEntry): void {
    if (entry.headerGuide) entry.headerGuide.style.display = 'none';
    if (entry.footerGuide) entry.footerGuide.style.display = 'none';
  }

  private showFallbackHint(entry: PageEntry, text: string): void {
    if (!entry.hintEl) {
      const hint = document.createElement('div');
      hint.className = 'vertical-ruler__hint';
      Object.assign(hint.style, {
        position: 'absolute',
        left: `${RULER_WIDTH + 6}px`,
        padding: '2px 6px',
        fontSize: '10px',
        color: '#e5e7eb',
        background: 'rgba(15,23,42,0.85)',
        border: '1px solid rgba(148,163,184,0.3)',
        borderRadius: '4px',
        pointerEvents: 'none',
        zIndex: '6',
        maxWidth: '180px',
      } as CSSStyleDeclaration);
      entry.hintEl = hint;
      entry.rootEl.appendChild(hint);
    }
    entry.hintEl.textContent = text;
    // Place near header handle by default; it will track when we call updateLabel
    const top = parseFloat(entry.headerHandle.style.top || '0') + HANDLE_HEIGHT / 2;
    entry.hintEl.style.top = `${Math.round(top)}px`;
    entry.hintEl.style.display = 'block';
    setTimeout(() => {
      if (entry.hintEl) entry.hintEl.style.display = 'none';
    }, 1500);
  }

  private placeHandles(entry: PageEntry, cfg: LayoutConfig): void {
    const pageH = cfg.pageSize.h;
    let effTop = cfg.margins.top;
    let effBottom = cfg.margins.bottom;
    if (this.getLayout) {
      const layout = this.getLayout();
      const pageNumber = Number(entry.pageEl.dataset.pageNumber || '0');
      const page = layout?.pages?.find?.((p) => p.number === pageNumber);
      if (page?.margins) {
        if (typeof page.margins.top === 'number') effTop = page.margins.top;
        if (typeof page.margins.bottom === 'number') effBottom = page.margins.bottom;
      }
    }
    const headerTop = Math.max(0, Math.min(pageH, effTop)) - HANDLE_HEIGHT / 2;
    const footerLineY = Math.max(0, Math.min(pageH, pageH - effBottom));
    const footerTop = footerLineY - HANDLE_HEIGHT / 2;
    const headerTopRounded = Math.round(headerTop);
    const footerTopRounded = Math.round(footerTop);
    entry.headerHandle.style.top = `${headerTopRounded}px`;
    entry.footerHandle.style.top = `${footerTopRounded}px`;
    if (entry.headerGuide) entry.headerGuide.style.top = `${Math.round(effTop)}px`;
    if (entry.footerGuide) entry.footerGuide.style.top = `${Math.round(pageH - effBottom)}px`;
    // Do not show labels by default
    this.updateLabel(entry, 'header', cfg, false, false);
    this.updateLabel(entry, 'footer', cfg, false, false);
  }

  private onDragStart(ev: PointerEvent, entry: PageEntry, kind: HandleKind): void {
    // Prevent other layers from handling this as document selection
    ev.preventDefault();
    ev.stopPropagation();
    // Keep keyboard focus on the handle to allow Arrow key nudges
    (ev.currentTarget as HTMLElement | null)?.focus?.();
    // Capture pointer to keep receiving move/up even if pointer leaves handle
    try {
      (ev.currentTarget as HTMLElement | null)?.setPointerCapture?.(ev.pointerId);
    } catch (_) {}
    const pageNumber = Number(entry.pageEl.dataset.pageNumber || '0');
    this.dragging = { pageNumber, kind };
    document.addEventListener('pointermove', this.onMouseMove as any, true);
    document.addEventListener('pointerup', this.onMouseUp as any, true);
    document.addEventListener('pointercancel', this.onMouseUp as any, true);
    // Show relevant guide
    const top =
      parseFloat((kind === 'header' ? entry.headerHandle.style.top : entry.footerHandle.style.top) || '0') +
      HANDLE_HEIGHT / 2;
    this.showGuide(entry, kind, top);
  }

  private onMouseMove(ev: PointerEvent): void {
    if (!this.dragging) return;
    const entry = this.getEntryForPageNumber(this.dragging.pageNumber);
    const cfg = this.getConfig();
    const editor = this.getEditor();
    if (!entry || !cfg || !editor) return;

    const pageRect = entry.pageEl.getBoundingClientRect();
    const y = ev.clientY - pageRect.top; // px from top of page
    // Clamp to allow moving as low as the original top margin (and as high as pageH - bottom margin)
    const topIn = editor.getPageStyles?.()?.pageMargins?.top ?? 1;
    const bottomIn = editor.getPageStyles?.()?.pageMargins?.bottom ?? 1;
    const topPx = Math.max(0, topIn * 96);
    const bottomPx = Math.max(0, bottomIn * 96);
    let center = Math.max(0, Math.min(cfg.pageSize.h, y));
    if (this.dragging.kind === 'header') {
      center = Math.max(topPx, center);
    } else {
      center = Math.min(cfg.pageSize.h - bottomPx, center);
    }
    const topPos = center - HANDLE_HEIGHT / 2;
    if (this.dragging.kind === 'header') {
      entry.headerHandle.style.top = `${Math.round(topPos)}px`;
      this.updateLabel(entry, 'header', cfg, true);
      this.showGuide(entry, 'header', center);
    } else {
      entry.footerHandle.style.top = `${Math.round(topPos)}px`;
      this.updateLabel(entry, 'footer', cfg, true);
      this.showGuide(entry, 'footer', center);
    }
  }

  private onMouseUp(ev: PointerEvent): void {
    if (!this.dragging) return;
    const kind = this.dragging.kind;
    const entry = this.getEntryForPageNumber(this.dragging.pageNumber);
    const cfg = this.getConfig();
    const editor = this.getEditor();
    this.dragging = null;

    document.removeEventListener('pointermove', this.onMouseMove as any, true);
    document.removeEventListener('pointerup', this.onMouseUp as any, true);
    document.removeEventListener('pointercancel', this.onMouseUp as any, true);

    if (!entry || !editor || !cfg) return;

    // Compute inches from handle's current position (more reliable than event coords)
    const handleTop = parseFloat(
      (kind === 'header' ? entry.headerHandle.style.top : entry.footerHandle.style.top) || '0',
    );
    const yCenter = Math.max(0, Math.min(cfg.pageSize.h, handleTop + HANDLE_HEIGHT / 2));

    const styles = (editor.getPageStyles?.() || {}) as PageStyles;
    const topIn = styles.pageMargins?.top ?? 1;
    const bottomIn = styles.pageMargins?.bottom ?? 1;
    const topPx = Math.max(0, topIn * PIXELS_PER_INCH);
    const bottomPx = Math.max(0, bottomIn * PIXELS_PER_INCH);

    // Auto-target: try section command; fall back to body update
    if (kind === 'header') {
      const headerPx = Math.max(topPx, Math.min(cfg.pageSize.h, yCenter));
      const ok = editor.commands?.setSectionHeaderFooterAtSelection?.({ headerInches: headerPx / PIXELS_PER_INCH });
      if (!ok) {
        const margins: PageMargins = { ...(styles.pageMargins || {}) };
        margins.header = headerPx / PIXELS_PER_INCH;
        editor.updatePageStyle?.({ pageMargins: margins });
        this.showFallbackHint(entry, 'Editing document defaults');
      }
    } else {
      const clampedCenter = Math.min(cfg.pageSize.h - bottomPx, Math.max(0, yCenter));
      const fromBottomPx = Math.max(0, cfg.pageSize.h - clampedCenter);
      const ok = editor.commands?.setSectionHeaderFooterAtSelection?.({ footerInches: fromBottomPx / PIXELS_PER_INCH });
      if (!ok) {
        const margins: PageMargins = { ...(styles.pageMargins || {}) };
        margins.footer = fromBottomPx / PIXELS_PER_INCH;
        editor.updatePageStyle?.({ pageMargins: margins });
        this.showFallbackHint(entry, 'Editing document defaults');
      }
    }
    // Hide labels when drag ends
    this.hideLabel(entry, 'header');
    this.hideLabel(entry, 'footer');
    this.hideGuides(entry);
  }

  private detachGlobalListeners(): void {
    document.removeEventListener('pointermove', this.onMouseMove as any, true);
    document.removeEventListener('pointerup', this.onMouseUp as any, true);
    document.removeEventListener('pointercancel', this.onMouseUp as any, true);
  }

  private getEntryForPageNumber(pageNumber: number): PageEntry | undefined {
    for (const entry of this.entries.values()) {
      const num = Number(entry.pageEl.dataset.pageNumber || '0');
      if (num === pageNumber) return entry;
    }
    return undefined;
  }

  private inches(valuePx: number): number {
    return Math.round((valuePx / PIXELS_PER_INCH) * 100) / 100;
  }

  private updateLabel(
    entry: PageEntry,
    kind: HandleKind,
    cfg: LayoutConfig,
    useCurrentPosition = false,
    forceShow = true,
  ): void {
    const handle = kind === 'header' ? entry.headerHandle : entry.footerHandle;
    const label = kind === 'header' ? entry.headerLabel : entry.footerLabel;
    if (!label || !handle) return;

    const top = parseFloat(handle.style.top || '0') + HANDLE_HEIGHT / 2; // center y
    label.style.top = `${Math.round(top)}px`;

    // Compute inches to display
    let inchesVal = 0;
    if (useCurrentPosition) {
      if (kind === 'header') {
        inchesVal = this.inches(Math.max(0, Math.min(cfg.pageSize.h, top)));
      } else {
        const y = Math.max(0, Math.min(cfg.pageSize.h, top));
        inchesVal = this.inches(cfg.pageSize.h - y);
      }
    } else {
      // Show the configured header/footer distances from edge when not dragging
      if (kind === 'header') {
        const headerPx = cfg.margins.header ?? 0;
        inchesVal = this.inches(headerPx);
      } else {
        const footerPx = cfg.margins.footer ?? 0;
        inchesVal = this.inches(footerPx);
      }
    }
    label.textContent = `${inchesVal.toFixed(2)} in`;

    if (forceShow) label.style.display = 'block';
  }

  private showLabel(entry: PageEntry, kind: HandleKind, cfg: LayoutConfig): void {
    const label = kind === 'header' ? entry.headerLabel : entry.footerLabel;
    if (!label) return;
    this.updateLabel(entry, kind, cfg, false, true);
    label.style.display = 'block';
  }

  private hideLabel(entry: PageEntry, kind: HandleKind): void {
    const label = kind === 'header' ? entry.headerLabel : entry.footerLabel;
    if (!label) return;
    label.style.display = 'none';
  }

  private onKeyDown(ev: KeyboardEvent, entry: PageEntry, kind: HandleKind): void {
    const editor = this.getEditor();
    const cfg = this.getConfig();
    if (!editor || !cfg) return;

    let stepPx = PIXELS_PER_INCH * RULER_STEP_INCHES;
    if (ev.shiftKey) stepPx = PIXELS_PER_INCH * RULER_STEP_SHIFT_INCHES;
    let delta = 0;
    if (ev.key === 'ArrowUp') delta = -stepPx;
    else if (ev.key === 'ArrowDown') delta = stepPx;
    else return;

    ev.preventDefault();

    const pageH = cfg.pageSize.h;
    const styles = (editor.getPageStyles?.() || {}) as PageStyles;
    const topIn = styles.pageMargins?.top ?? 1;
    const bottomIn = styles.pageMargins?.bottom ?? 1;
    const topPx = Math.max(0, topIn * PIXELS_PER_INCH);
    const bottomPx = Math.max(0, bottomIn * PIXELS_PER_INCH);

    if (kind === 'header') {
      const handleTop = parseFloat(entry.headerHandle.style.top || '0') + HANDLE_HEIGHT / 2;
      const nextY = Math.max(topPx, Math.min(pageH, handleTop + delta));
      const headerInches = nextY / PIXELS_PER_INCH;
      const ok = editor.commands?.setSectionHeaderFooterAtSelection?.({ headerInches });
      if (!ok) {
        const margins: PageMargins = { ...(styles.pageMargins || {}) };
        margins.header = headerInches;
        editor.updatePageStyle?.({ pageMargins: margins });
        this.showFallbackHint(entry, 'Editing document defaults');
      }
    } else {
      const handleTop = parseFloat(entry.footerHandle.style.top || '0') + HANDLE_HEIGHT / 2;
      const nextY = Math.min(pageH - bottomPx, Math.max(0, handleTop + delta));
      const footerInches = Math.max(0, (pageH - nextY) / PIXELS_PER_INCH);
      const ok = editor.commands?.setSectionHeaderFooterAtSelection?.({ footerInches });
      if (!ok) {
        const margins: PageMargins = { ...(styles.pageMargins || {}) };
        margins.footer = footerInches;
        editor.updatePageStyle?.({ pageMargins: margins });
        this.showFallbackHint(entry, 'Editing document defaults');
      }
    }
  }
}
