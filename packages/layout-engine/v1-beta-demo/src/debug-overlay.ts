import type { FlowBlock, Layout, Measure } from '@superdoc/contracts';
import { clickToPosition, type PositionHit } from '../../layout-bridge/src/index.js';

export type DebugMode = {
  fragmentBoundaries: boolean;
  lineBoundaries: boolean;
  clickInspector: boolean;
  coordinateGrid: boolean;
};

export class DebugOverlay {
  private readonly root: HTMLElement;
  private readonly layoutContainer: HTMLElement;
  private mode: DebugMode = {
    fragmentBoundaries: false,
    lineBoundaries: false,
    clickInspector: true,
    coordinateGrid: false,
  };
  private layout: Layout | null = null;
  private blocks: FlowBlock[] = [];
  private measures: Measure[] = [];
  private inspectorPanel: HTMLElement | null = null;
  private clickHandler: ((event: MouseEvent) => void) | null = null;
  private lastClickData: {
    clientX: number;
    clientY: number;
    layoutX: number;
    layoutY: number;
    pageLocalX: number;
    pageLocalY: number;
    hit: PositionHit | null;
  } | null = null;

  constructor(root: HTMLElement, layoutContainer: HTMLElement) {
    this.root = root;
    this.layoutContainer = layoutContainer;
    this.root.classList.add('debug-overlay');
    this.setupClickListener();
  }

  setMode(mode: Partial<DebugMode>): void {
    this.mode = { ...this.mode, ...mode };
    this.render();
  }

  update(layout: Layout, blocks: FlowBlock[], measures: Measure[]): void {
    this.layout = layout;
    this.blocks = blocks;
    this.measures = measures;
    this.render();
  }

  private setupClickListener(): void {
    if (this.clickHandler) return;
    this.clickHandler = (event: MouseEvent) => {
      if (!this.mode.clickInspector || !this.layout) {
        return;
      }

      const clientX = event.clientX;
      const clientY = event.clientY;

      const pageEl = this.findPageElementAtPoint(clientX, clientY);
      if (!pageEl) {
        console.warn('[DebugOverlay] No page element found for click target', event.target);
        return;
      }

      const pageIndex = Number(pageEl.dataset.pageIndex ?? '0');

      const pageRect = pageEl.getBoundingClientRect();
      const pageLocalX = clientX - pageRect.left;
      const pageLocalY = clientY - pageRect.top;

      const layoutX = pageLocalX;
      const layoutY = pageIndex * this.layout.pageSize.h + pageLocalY;

      // removed debug dump of click coordinates

      const hit = clickToPosition(this.layout, this.blocks, this.measures, {
        x: layoutX,
        y: layoutY,
      });

      this.lastClickData = {
        clientX,
        clientY,
        layoutX,
        layoutY,
        pageLocalX,
        pageLocalY,
        hit,
      };

      this.render();
    };
    this.layoutContainer.addEventListener('click', this.clickHandler);
  }

  private teardownClickListener(): void {
    if (!this.clickHandler) return;
    this.layoutContainer.removeEventListener('click', this.clickHandler);
    this.clickHandler = null;
  }

  private render(): void {
    this.root.innerHTML = '';

    if (!this.layout) {
      return;
    }

    // removed debug status panel

    if (this.mode.fragmentBoundaries) {
      this.renderFragmentBoundaries();
    }

    if (this.mode.lineBoundaries) {
      this.renderLineBoundaries();
    }

    if (this.mode.clickInspector && this.lastClickData) {
      this.renderClickInspector();
      this.renderInspectorPanel();
    }

    if (this.mode.coordinateGrid) {
      this.renderCoordinateGrid();
    }
  }

  private renderFragmentBoundaries(): void {
    if (!this.layout) return;

    // removed debug fragment summary

    let fragmentsRendered = 0;

    this.layout.pages.forEach((page, pageIndex) => {
      page.fragments.forEach((fragment) => {
        if (fragment.kind !== 'para') return;

        const blockIndex = this.blocks.findIndex((b) => b.id === fragment.blockId);
        if (blockIndex === -1) {
          console.warn('[DebugOverlay] Block not found for fragment', fragment.blockId);
          return;
        }

        const measure = this.measures[blockIndex];
        if (!measure || measure.kind !== 'paragraph') {
          console.warn('[DebugOverlay] No measure for block', blockIndex);
          return;
        }

        // Calculate fragment height from actual lines
        const fragmentHeight = measure.lines
          .slice(fragment.fromLine, fragment.toLine)
          .reduce((sum, line) => sum + line.lineHeight, 0);

        const domCoords = this.convertPageLocalToDom(pageIndex, fragment.x, fragment.y);
        if (!domCoords) return;

        const el = document.createElement('div');
        el.classList.add('debug-fragment-boundary');
        el.style.left = `${domCoords.x}px`;
        el.style.top = `${domCoords.y}px`;
        el.style.width = `${fragment.width}px`;
        el.style.height = `${fragmentHeight}px`;
        el.title = `Fragment ${fragment.blockId} (PM ${fragment.pmStart}-${fragment.pmEnd})`;
        el.style.pointerEvents = 'auto';
        this.root.appendChild(el);
        fragmentsRendered++;
      });
    });
  }

  private renderLineBoundaries(): void {
    if (!this.layout) return;

    this.layout.pages.forEach((page, pageIndex) => {
      page.fragments.forEach((fragment) => {
        if (fragment.kind !== 'para') return;

        const blockIndex = this.blocks.findIndex((b) => b.id === fragment.blockId);
        if (blockIndex === -1) return;

        const measure = this.measures[blockIndex];
        if (!measure || measure.kind !== 'paragraph') return;

        let lineOffsetY = 0;
        for (let i = fragment.fromLine; i < fragment.toLine; i++) {
          const line = measure.lines[i];
          if (!line) continue;

          const domCoords = this.convertPageLocalToDom(pageIndex, fragment.x, fragment.y + lineOffsetY);
          if (!domCoords) continue;

          const el = document.createElement('div');
          el.classList.add('debug-line-boundary');
          el.style.left = `${domCoords.x}px`;
          el.style.top = `${domCoords.y}px`;
          el.style.width = `${fragment.width}px`;
          el.title = `Line ${i} (height: ${line.lineHeight}px)`;
          el.style.pointerEvents = 'auto';
          this.root.appendChild(el);

          lineOffsetY += line.lineHeight;
        }
      });
    });
  }

  private findPageElementAtPoint(clientX: number, clientY: number): HTMLElement | null {
    const pages = Array.from(this.layoutContainer.querySelectorAll('.superdoc-page')) as HTMLElement[];
    for (const page of pages) {
      const rect = page.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        return page;
      }
    }
    return null;
  }

  private renderClickInspector(): void {
    if (!this.lastClickData) return;

    const { clientX, clientY } = this.lastClickData;
    const rect = this.layoutContainer.getBoundingClientRect();

    const crosshair = document.createElement('div');
    crosshair.classList.add('debug-crosshair');
    crosshair.style.left = `${clientX - rect.left}px`;
    crosshair.style.top = `${clientY - rect.top}px`;
    this.root.appendChild(crosshair);
  }

  private renderInspectorPanel(): void {
    if (!this.lastClickData) return;

    if (!this.inspectorPanel) {
      this.inspectorPanel = document.createElement('div');
      this.inspectorPanel.classList.add('debug-inspector');
      document.body.appendChild(this.inspectorPanel);
    }

    const { clientX, clientY, layoutX, layoutY, pageLocalX, pageLocalY, hit } = this.lastClickData;

    this.inspectorPanel.innerHTML = `
      <div class="debug-inspector__header">Layout Debug Inspector</div>
      <div class="debug-inspector__section">
        <div class="debug-inspector__label">Mouse Position</div>
        <div class="debug-inspector__value">DOM: (${clientX.toFixed(1)}, ${clientY.toFixed(1)})</div>
        <div class="debug-inspector__value">Page-local: (${pageLocalX.toFixed(1)}, ${pageLocalY.toFixed(1)})</div>
        <div class="debug-inspector__value">Layout-space: (${layoutX.toFixed(1)}, ${layoutY.toFixed(1)})</div>
      </div>
      ${
        hit
          ? `
      <div class="debug-inspector__section">
        <div class="debug-inspector__label">Hit-Test Result</div>
        <div class="debug-inspector__value">PM Position: ${hit.pos}</div>
        <div class="debug-inspector__value">Block ID: ${hit.blockId}</div>
        <div class="debug-inspector__value">Page: ${hit.pageIndex}, Column: ${hit.column}</div>
        <div class="debug-inspector__value">Line Index: ${hit.lineIndex}</div>
      </div>
      `
          : '<div class="debug-inspector__section"><div class="debug-inspector__value">No hit</div></div>'
      }
      <div class="debug-inspector__footer">
        Click anywhere to update
      </div>
    `;
  }

  private renderCoordinateGrid(): void {
    if (!this.layout) return;

    // Render grid lines every 50px
    const gridSpacing = 50;

    // Calculate container dimensions
    const rect = this.layoutContainer.getBoundingClientRect();

    // Vertical grid lines
    for (let x = 0; x < rect.width; x += gridSpacing) {
      const line = document.createElement('div');
      line.classList.add('debug-grid-line', 'debug-grid-line--vertical');
      line.style.left = `${x}px`;
      this.root.appendChild(line);
    }

    // Horizontal grid lines
    for (let y = 0; y < rect.height; y += gridSpacing) {
      const line = document.createElement('div');
      line.classList.add('debug-grid-line', 'debug-grid-line--horizontal');
      line.style.top = `${y}px`;
      this.root.appendChild(line);
    }
  }

  private convertPageLocalToDom(
    pageIndex: number,
    pageLocalX: number,
    pageLocalY: number,
  ): { x: number; y: number } | null {
    const pageElement = this.layoutContainer.querySelector(
      `.superdoc-page[data-page-index="${pageIndex}"]`,
    ) as HTMLElement;
    if (!pageElement) {
      return null;
    }

    const pageRect = pageElement.getBoundingClientRect();
    const overlayRect = this.root.getBoundingClientRect();

    const domX = pageRect.left - overlayRect.left + pageLocalX;
    const domY = pageRect.top - overlayRect.top + pageLocalY;

    return { x: domX, y: domY };
  }

  dispose(): void {
    this.teardownClickListener();
    if (this.inspectorPanel) {
      this.inspectorPanel.remove();
      this.inspectorPanel = null;
    }
    this.root.innerHTML = '';
  }
}
