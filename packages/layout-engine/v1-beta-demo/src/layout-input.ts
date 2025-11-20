import type { Layout, FlowBlock, Measure } from '@superdoc/contracts';
import {
  clickToPosition,
  findWordBoundaries,
  findParagraphBoundaries,
  clickToPositionDom,
} from '../../layout-bridge/src/index.js';
import { CLASS_NAMES } from '../../painters/dom/src/styles.js';

type LayoutInputOptions = {
  layoutRoot: HTMLElement;
  layout: () => Layout | null;
  blocks: () => FlowBlock[];
  measures: () => Measure[];
  onRequestFocus?: () => void;
  onUpdateSelection: (from: number, to: number) => void;
};

export class LayoutInput {
  private readonly layoutRoot: HTMLElement;
  private readonly getLayout: () => Layout | null;
  private readonly getBlocks: () => FlowBlock[];
  private readonly getMeasures: () => Measure[];
  private readonly onRequestFocus?: () => void;
  private readonly onUpdateSelection: (from: number, to: number) => void;
  private dragAnchor: number | null = null;

  // Multi-click detection state
  private lastClickTime = 0;
  private lastClickPos: number | null = null;
  private clickCount = 0;
  private static readonly CLICK_TIMEOUT_MS = 300;

  private log(stage: string, payload: Record<string, unknown>, level: 'log' | 'warn' | 'error' = 'log'): void {
    // Click logging has been removed
  }

  constructor(options: LayoutInputOptions) {
    this.layoutRoot = options.layoutRoot;
    this.getLayout = options.layout;
    this.getBlocks = options.blocks;
    this.getMeasures = options.measures;
    this.onRequestFocus = options.onRequestFocus;
    this.onUpdateSelection = options.onUpdateSelection;

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  enable(): void {
    this.layoutRoot.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
  }

  disable(): void {
    this.layoutRoot.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
  }

  private handleMouseDown(event: MouseEvent): void {
    this.log('mousedown', {
      clientX: event.clientX,
      clientY: event.clientY,
      button: event.button,
      targetTag: (event.target as HTMLElement | null)?.tagName,
    });
    if (event.button !== 0) {
      this.log('mousedown-ignored', { reason: 'non-primary', button: event.button });
      return;
    }
    const pos = this.mapPointToPos(event);
    if (pos == null) {
      this.log('map-failed', { clientX: event.clientX, clientY: event.clientY });
      return;
    }
    this.log('map-success', { pos });

    // Detect multi-click
    const now = Date.now();
    const timeSinceLastClick = now - this.lastClickTime;
    const isSamePosition = this.lastClickPos === pos;

    if (isSamePosition && timeSinceLastClick < LayoutInput.CLICK_TIMEOUT_MS) {
      this.clickCount++;
    } else {
      this.clickCount = 1;
    }

    this.lastClickTime = now;
    this.lastClickPos = pos;
    this.log('click-count', {
      clickCount: this.clickCount,
      timeSinceLastClick,
    });

    // Handle different click types
    if (this.clickCount === 2) {
      this.log('double-click', { pos });
      this.handleDoubleClick(pos);
    } else if (this.clickCount >= 3) {
      this.log('triple-click', { pos });
      this.handleTripleClick(pos);
      this.clickCount = 0; // Reset after triple-click
    } else {
      // Single click
      this.dragAnchor = pos;
      this.onRequestFocus?.();
      this.onUpdateSelection(pos, pos);
      this.log('selection-update', { from: pos, to: pos, reason: 'single-click' });
    }

    event.preventDefault();
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.dragAnchor == null) return;
    const pos = this.mapPointToPos(event);
    if (pos == null) return;
    const anchor = this.dragAnchor;
    const from = Math.min(anchor, pos);
    const to = Math.max(anchor, pos);
    this.onUpdateSelection(from, to);
    this.log('drag-selection', { anchor, pos, from, to });
  }

  private handleMouseUp(): void {
    this.dragAnchor = null;
    this.log('mouseup', {});
  }

  private handleDoubleClick(pos: number): void {
    this.onRequestFocus?.();

    const blocks = this.getBlocks();
    const wordBoundaries = findWordBoundaries(blocks, pos);

    if (wordBoundaries) {
      this.onUpdateSelection(wordBoundaries.from, wordBoundaries.to);
      this.log('selection-update', {
        reason: 'double-click',
        from: wordBoundaries.from,
        to: wordBoundaries.to,
      });
    } else {
      // Fallback to single position if no word found
      this.onUpdateSelection(pos, pos);
      this.log('selection-update', { reason: 'double-click-fallback', from: pos, to: pos });
    }
  }

  private handleTripleClick(pos: number): void {
    this.onRequestFocus?.();

    const blocks = this.getBlocks();
    const paragraphBoundaries = findParagraphBoundaries(blocks, pos);

    if (paragraphBoundaries) {
      this.onUpdateSelection(paragraphBoundaries.from, paragraphBoundaries.to);
      this.log('selection-update', {
        reason: 'triple-click',
        from: paragraphBoundaries.from,
        to: paragraphBoundaries.to,
      });
    } else {
      // Fallback to single position if no paragraph found
      this.onUpdateSelection(pos, pos);
      this.log('selection-update', { reason: 'triple-click-fallback', from: pos, to: pos });
    }
  }

  private mapPointToPos(event: MouseEvent): number | null {
    const layout = this.getLayout();
    if (!layout) {
      this.log('map-abort', { reason: 'no-layout' }, 'warn');
      return null;
    }
    const blocks = this.getBlocks();
    const measures = this.getMeasures();
    const target = event.target as HTMLElement | null;
    const pageEl = target?.closest(`.${CLASS_NAMES.page}`) as HTMLElement | null;
    if (!pageEl) {
      this.log('map-abort', { reason: 'no-page-element', targetTag: target?.tagName }, 'warn');
      return null;
    }
    const pageIndex = Number(pageEl.dataset.pageIndex ?? '0');
    const rect = pageEl.getBoundingClientRect();
    const localPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    this.log('map-start', {
      clientX: event.clientX,
      clientY: event.clientY,
      pageIndex,
      localPoint,
    });
    // Try DOM-based mapping first for pixel-perfect alignment
    const pageRect = pageEl.getBoundingClientRect();
    const clientX = pageRect.left + localPoint.x;
    const clientY = pageRect.top + localPoint.y;
    const domPos = clickToPositionDom(pageEl, clientX, clientY);
    if (typeof domPos === 'number') {
      this.log('dom-map-success', { pos: domPos, pageIndex });
      return domPos;
    }
    this.log('dom-map-fallback', { pageIndex });

    // Fallback to geometry-based mapping via layout bridge
    const point = {
      x: localPoint.x,
      y: localPoint.y + pageIndex * layout.pageSize.h,
    };
    const hit = clickToPosition(layout, blocks, measures, point);
    if (hit?.pos != null) {
      this.log('geo-map-success', {
        pos: hit.pos,
        pageIndex: hit.pageIndex,
        column: hit.column,
        blockId: hit.blockId,
      });
      return hit.pos;
    }
    this.log('geo-map-failed', { pageIndex, point }, 'warn');
    return null;
  }
}
