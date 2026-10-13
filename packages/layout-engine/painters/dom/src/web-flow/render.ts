import {
  isPageRelativeAnchor,
  type BoxSpacing,
  type FlowBlock,
  type ImageBlock,
  type ImageRun,
  type LayoutSourceIdentity,
  type ParagraphBlock,
  type Run,
  type TableBlock,
  type TableCell,
  type TableRow,
  type TextRun,
} from '@superdoc/contracts';
import { isValidImageDataUrl } from '@superdoc/url-validation';
import { applyContainerSdtDataset, applySdtDataset } from '../sdt/dataset.js';
import { applyParagraphBlockStyles } from '../paragraph/styles.js';
import { applyRunStyles } from '../runs/text-run.js';
import { setTextContentWithFormattingSpaceMarks } from '../runs/formatting-marks.js';
import {
  applyLinkAttributes,
  applyLinkDataset,
  buildLinkRenderData,
  enhanceAccessibility,
  sanitizeUrl,
} from '../runs/links.js';
import {
  applyCellTrackedChangeToCell,
  applyRowTrackedChangeToCell,
  applyTrackedChangeDecorations,
  resolveTrackedChangesConfig,
} from '../runs/tracked-changes.js';
import { applyRunDataAttributes } from '../runs/hash.js';
import { applyLayoutIdentityDataset } from '../utils/layout-identity.js';
import { applySourceAnchorDataset } from '../utils/source-anchor.js';
import { WEB_FLOW_CLASS_NAMES } from './styles.js';
import type { WebFlowPaintItem, WebFlowPainterOptions } from './types.js';

interface RenderContext {
  readonly doc: Document;
  readonly options: WebFlowPainterOptions;
  readonly showFormattingMarks: boolean;
  readonly layoutEpoch?: number;
  readonly layoutIdentities: ReadonlyMap<string, LayoutSourceIdentity>;
}

const PAGE_RELATIVE_HORIZONTAL_ANCHORS = new Set([
  'margin',
  'page',
  'leftMargin',
  'rightMargin',
  'insideMargin',
  'outsideMargin',
]);

export function doesWebFlowBlockProduceDom(block: FlowBlock): boolean {
  if (block.kind === 'sectionBreak' || block.kind === 'pageBreak' || block.kind === 'columnBreak') return false;
  if (block.kind === 'paragraph') return block.attrs?.sectPrMarker !== true;
  if (block.kind === 'drawing') return false;
  if (block.kind !== 'image' && block.kind !== 'table') return true;

  const anchor = block.anchor;
  if (!anchor) return true;
  if (anchor.isAnchored === true) return false;
  if ('behindDoc' in anchor && anchor.behindDoc === true) return false;
  if (isPageRelativeAnchor(block)) return false;
  if (anchor.hRelativeFrom && PAGE_RELATIVE_HORIZONTAL_ANCHORS.has(anchor.hRelativeFrom)) return false;
  return !(block.kind !== 'table' && block.wrap?.behindDoc === true);
}

const finitePx = (value: number | undefined): string | null =>
  typeof value === 'number' && Number.isFinite(value) ? `${value}px` : null;

function applyBoxSpacing(element: HTMLElement, property: 'margin' | 'padding', spacing?: BoxSpacing): void {
  if (!spacing) return;
  const style = element.style;
  const top = finitePx(spacing.top);
  const right = finitePx(spacing.right);
  const bottom = finitePx(spacing.bottom);
  const left = finitePx(spacing.left);
  if (top) style.setProperty(`${property}-top`, top);
  if (right) style.setProperty(`${property}-right`, right);
  if (bottom) style.setProperty(`${property}-bottom`, bottom);
  if (left) style.setProperty(`${property}-left`, left);
}

function applyPositionRange(element: HTMLElement, run: Run): void {
  if ('pmStart' in run && run.pmStart != null) element.dataset.pmStart = String(run.pmStart);
  if ('pmEnd' in run && run.pmEnd != null) element.dataset.pmEnd = String(run.pmEnd);
}

function applyComments(element: HTMLElement, run: TextRun): void {
  if (!run.comments?.length) return;
  element.dataset.commentIds = run.comments.map((comment) => comment.commentId).join(',');
  element.classList.add('superdoc-comment-highlight');
}

function renderTextRun(run: TextRun, block: ParagraphBlock, context: RenderContext): HTMLElement {
  const link = run.link ? buildLinkRenderData(run.link) : null;
  const element = link && !link.blocked ? context.doc.createElement('a') : context.doc.createElement('span');
  element.classList.add(WEB_FLOW_CLASS_NAMES.run, 'superdoc-text-run');
  setTextContentWithFormattingSpaceMarks(element, run.vanish ? '' : run.text, context.doc, context.showFormattingMarks);
  if (run.vanish) {
    element.setAttribute('aria-hidden', 'true');
    element.style.display = 'none';
  }
  applyRunStyles(element, run, Boolean(link), context.options.resolvePhysical);
  applyRunDataAttributes(element, run.dataAttrs);
  applyPositionRange(element, run);
  applyComments(element, run);
  applySdtDataset(element, run.sdt);
  applyTrackedChangeDecorations(element, run, resolveTrackedChangesConfig(block));
  if (link?.dataset) applyLinkDataset(element, link.dataset);
  if (element instanceof context.doc.defaultView!.HTMLAnchorElement && link && !link.blocked) {
    applyLinkAttributes(element, link);
    enhanceAccessibility(element, link, run.text);
  }
  return element;
}

function safeImageSource(src: string): string | null {
  if (src.startsWith('data:')) return isValidImageDataUrl(src) ? src : null;
  if (src.startsWith('blob:')) {
    try {
      return new URL(src).protocol === 'blob:' ? src : null;
    } catch {
      return null;
    }
  }
  return sanitizeUrl(src);
}

function stampImage(element: HTMLImageElement, source: ImageRun | ImageBlock): void {
  const src = safeImageSource(source.src);
  if (src) element.src = src;
  element.alt = source.alt ?? '';
  if (source.title) element.title = source.title;
  const width = finitePx(source.width);
  const height = finitePx(source.height);
  if (width) element.style.width = width;
  if (height) element.style.height = height;
  element.style.maxWidth = '100%';
  element.style.height = height ?? 'auto';
  if (source.imageId) element.dataset.sdImageId = source.imageId;
  if (source.imageMutationId) element.dataset.sdImageMutationId = source.imageMutationId;
}

function imagePlaceholder(context: RenderContext, accessibleName: string): HTMLElement {
  const element = context.doc.createElement('span');
  element.classList.add(WEB_FLOW_CLASS_NAMES.diagnostic);
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', accessibleName);
  element.textContent = accessibleName;
  element.dataset.webFlowEditable = 'false';
  return element;
}

function renderInlineImage(run: ImageRun, block: ParagraphBlock, context: RenderContext): HTMLElement {
  const source = safeImageSource(run.src);
  const element = source
    ? context.doc.createElement('img')
    : imagePlaceholder(context, run.placeholder?.accessibleName ?? 'Image unavailable');
  if (element instanceof context.doc.defaultView!.HTMLImageElement) stampImage(element, run);
  applyPositionRange(element, run);
  applySdtDataset(element, run.sdt);
  applyRunDataAttributes(element, run.dataAttrs);
  applyTrackedChangeDecorations(element, run, resolveTrackedChangesConfig(block));
  return element;
}

function renderRun(run: Run, runIndex: number, block: ParagraphBlock, context: RenderContext): Node {
  const stamp = <T extends Node>(node: T): T => {
    if (node instanceof context.doc.defaultView!.HTMLElement) node.dataset.webFlowRunIndex = String(runIndex);
    return node;
  };
  if (run.kind == null || run.kind === 'text') return stamp(renderTextRun(run, block, context));
  if (run.kind === 'image') return stamp(renderInlineImage(run, block, context));
  if (run.kind === 'lineBreak' || (run.kind === 'break' && (!run.breakType || run.breakType === 'line'))) {
    const br = context.doc.createElement('br');
    applyPositionRange(br, run);
    stamp(br);
    if (!context.showFormattingMarks) return br;
    const fragment = context.doc.createDocumentFragment();
    fragment.appendChild(formattingMark(context, 'line-break', '↵'));
    fragment.appendChild(br);
    return fragment;
  }
  if (run.kind === 'break') {
    if (run.breakType !== 'column') return context.doc.createDocumentFragment();
    const br = context.doc.createElement('br');
    applyPositionRange(br, run);
    return stamp(br);
  }
  const element = context.doc.createElement('span');
  element.classList.add(WEB_FLOW_CLASS_NAMES.run);
  if (run.kind === 'tab') {
    element.textContent = '\t';
    element.classList.add('superdoc-tab');
    if (context.showFormattingMarks) element.classList.add('superdoc-web-flow-formatting-tab');
  } else if (run.kind === 'fieldAnnotation') {
    element.textContent = run.displayLabel;
    element.dataset.fieldId = run.fieldId ?? '';
    element.dataset.fieldType = run.fieldType ?? run.variant;
    if (run.hidden) element.hidden = true;
    if (run.visibility) element.style.visibility = run.visibility;
    applySdtDataset(element, run.sdt);
  } else if (run.kind === 'math') {
    element.textContent = run.textContent;
    element.setAttribute('role', 'math');
  }
  applyPositionRange(element, run);
  return stamp(element);
}

function formattingMark(context: RenderContext, kind: 'paragraph-mark' | 'line-break', text: string): HTMLElement {
  const mark = context.doc.createElement('span');
  mark.classList.add(`superdoc-formatting-${kind}`);
  mark.textContent = text;
  mark.setAttribute('aria-hidden', 'true');
  mark.dataset.webFlowVisualOnly = 'true';
  return mark;
}

function renderParagraph(block: ParagraphBlock, context: RenderContext, includeWordMarker = true): HTMLElement {
  const element = context.doc.createElement(
    block.attrs?.headingLevel ? `h${Math.min(6, block.attrs.headingLevel)}` : 'p',
  );
  element.classList.add(WEB_FLOW_CLASS_NAMES.paragraph, 'superdoc-fragment');
  element.dataset.flowBlockId = block.id;
  element.dataset.blockId = block.id;
  if (context.layoutEpoch != null) element.dataset.layoutEpoch = String(context.layoutEpoch);
  applyLayoutIdentityDataset(element, context.layoutIdentities.get(block.id));
  applySourceAnchorDataset(element, block.sourceAnchor);
  applyParagraphBlockStyles(element, block.attrs);
  applySdtDataset(element, block.attrs?.sdt);
  applyContainerSdtDataset(element, block.attrs?.containerSdt);
  if (block.attrs?.alignment) element.style.textAlign = block.attrs.alignment;
  const spacing = block.attrs?.spacing;
  const before = finitePx(spacing?.before);
  const after = finitePx(spacing?.after);
  if (before) element.style.marginTop = before;
  if (after) element.style.marginBottom = after;
  if (spacing?.line != null && Number.isFinite(spacing.line)) {
    element.style.lineHeight = spacing.lineUnit === 'multiplier' ? String(spacing.line) : `${spacing.line}px`;
  }
  if (block.attrs?.shading?.fill) element.style.backgroundColor = block.attrs.shading.fill;
  const marker = includeWordMarker ? block.attrs?.wordLayout?.marker : undefined;
  if (marker?.markerText) {
    const markerElement = context.doc.createElement('span');
    markerElement.classList.add(WEB_FLOW_CLASS_NAMES.listMarker);
    markerElement.textContent = marker.markerText;
    markerElement.setAttribute('aria-hidden', 'true');
    markerElement.dataset.webFlowVisualOnly = 'true';
    element.appendChild(markerElement);
  }
  block.runs.forEach((run, runIndex) => element.appendChild(renderRun(run, runIndex, block, context)));
  if (element.childNodes.length === 0) element.appendChild(context.doc.createElement('br'));
  if (context.showFormattingMarks) element.appendChild(formattingMark(context, 'paragraph-mark', '¶'));
  return element;
}

function borderStyle(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const border = value as { style?: string; width?: number; color?: string; none?: boolean };
  if (border.none || border.style === 'none') return 'none';
  const width = typeof border.width === 'number' && Number.isFinite(border.width) ? Math.max(0, border.width) : 1;
  const style =
    border.style === 'dashed' || border.style === 'dotted' || border.style === 'double' ? border.style : 'solid';
  const color = typeof border.color === 'string' && border.color ? border.color : 'currentColor';
  return `${width}px ${style} ${color}`;
}

function renderCell(cell: TableCell, row: TableRow, table: TableBlock, context: RenderContext): HTMLTableCellElement {
  const element = context.doc.createElement('td');
  element.dataset.flowBlockId = cell.id;
  if (cell.rowSpan && cell.rowSpan > 1) element.rowSpan = cell.rowSpan;
  if (cell.colSpan && cell.colSpan > 1) element.colSpan = cell.colSpan;
  if (cell.attrs?.verticalAlign)
    element.style.verticalAlign = cell.attrs.verticalAlign === 'center' ? 'middle' : cell.attrs.verticalAlign;
  if (cell.attrs?.background) element.style.backgroundColor = cell.attrs.background;
  applyBoxSpacing(element, 'padding', cell.attrs?.padding);
  const borders = cell.attrs?.borders ?? table.attrs?.borders;
  if (borders) {
    const top = borderStyle(borders.top);
    const right = borderStyle(borders.right);
    const bottom = borderStyle(borders.bottom);
    const left = borderStyle(borders.left);
    if (top) element.style.borderTop = top;
    if (right) element.style.borderRight = right;
    if (bottom) element.style.borderBottom = bottom;
    if (left) element.style.borderLeft = left;
  }
  const representativeParagraph = (candidate: TableCell): ParagraphBlock | undefined =>
    candidate.paragraph ?? candidate.blocks?.find((block): block is ParagraphBlock => block.kind === 'paragraph');
  const rowParagraph = row.cells
    .map(representativeParagraph)
    .find((paragraph): paragraph is ParagraphBlock => paragraph != null);
  const cellParagraph = representativeParagraph(cell);
  const rowTrackedConfig = rowParagraph
    ? resolveTrackedChangesConfig(rowParagraph)
    : { enabled: true, mode: 'review' as const };
  const cellTrackedConfig = cellParagraph ? resolveTrackedChangesConfig(cellParagraph) : rowTrackedConfig;
  if (row.attrs?.trackedChange) {
    applyRowTrackedChangeToCell(element, row.attrs.trackedChange, rowTrackedConfig);
  }
  if (cell.attrs?.trackedChange) {
    applyCellTrackedChangeToCell(element, cell.attrs.trackedChange, cellTrackedConfig);
  }
  const blocks = (cell.blocks ?? (cell.paragraph ? [cell.paragraph] : [])).filter(doesWebFlowBlockProduceDom);
  blocks.forEach((block) => element.appendChild(renderFlowBlock(block, context)));
  if (blocks.length === 0) element.appendChild(context.doc.createElement('br'));
  return element;
}

function renderTable(block: TableBlock, context: RenderContext): HTMLElement {
  const table = context.doc.createElement('table');
  table.classList.add(WEB_FLOW_CLASS_NAMES.table);
  table.dataset.flowBlockId = block.id;
  applySdtDataset(table, block.attrs?.sdt);
  applyContainerSdtDataset(table, block.attrs?.containerSdt);
  table.style.borderCollapse = block.attrs?.borderCollapse ?? 'collapse';
  if (block.columnWidths?.length) {
    const group = context.doc.createElement('colgroup');
    const totalWidth = block.columnWidths.reduce(
      (total, width) => total + (Number.isFinite(width) && width > 0 ? width : 0),
      0,
    );
    block.columnWidths.forEach((width) => {
      const col = context.doc.createElement('col');
      // Web flow owns no physical page width. Preserve the authored column
      // proportions while allowing the table to shrink with its container.
      if (Number.isFinite(width) && width > 0 && totalWidth > 0) {
        col.style.width = `${(width / totalWidth) * 100}%`;
      }
      group.appendChild(col);
    });
    table.appendChild(group);
  }
  const body = context.doc.createElement('tbody');
  block.rows.forEach((row) => {
    const tr = context.doc.createElement('tr');
    tr.dataset.flowBlockId = row.id;
    const height = finitePx(row.attrs?.rowHeight?.value);
    if (height) {
      if (row.attrs?.rowHeight?.rule === 'exact') tr.style.height = height;
      else tr.style.minHeight = height;
    }
    row.cells.forEach((cell) => tr.appendChild(renderCell(cell, row, block, context)));
    body.appendChild(tr);
  });
  table.appendChild(body);
  return table;
}

function renderBlockImage(block: ImageBlock, context: RenderContext): HTMLElement {
  const source = safeImageSource(block.src);
  const element = source
    ? context.doc.createElement('img')
    : imagePlaceholder(context, block.placeholder?.accessibleName ?? 'Image unavailable');
  if (element instanceof context.doc.defaultView!.HTMLImageElement) stampImage(element, block);
  applyBoxSpacing(element, 'margin', block.margin);
  applyBoxSpacing(element, 'padding', block.padding);
  applySdtDataset(element, block.attrs?.sdt);
  applyContainerSdtDataset(element, block.attrs?.containerSdt);
  return element;
}

function renderFlowBlock(block: FlowBlock, context: RenderContext): HTMLElement {
  let node: HTMLElement;
  if (block.kind === 'paragraph') return renderParagraph(block, context);
  if (block.kind === 'table') node = renderTable(block, context);
  else if (block.kind === 'image') node = renderBlockImage(block, context);
  else if (block.kind === 'list') {
    const list = context.doc.createElement(block.listType === 'number' ? 'ol' : 'ul');
    list.style.listStyle = 'none';
    list.style.paddingInlineStart = '0';
    block.items.forEach((item) => {
      const li = context.doc.createElement('li');
      li.dataset.flowBlockId = item.id;
      li.dataset.webFlowListLevel = String(item.marker.level);
      if (item.marker.order != null) {
        li.dataset.webFlowListOrder = String(item.marker.order);
        li.value = item.marker.order;
      }
      if (item.marker.customFormat) {
        li.dataset.webFlowListCustomFormat = item.marker.customFormat;
      }
      li.style.alignItems = 'baseline';
      li.style.display = 'flex';
      if (item.marker.level > 0) {
        li.style.marginInlineStart = `${item.marker.level * 1.5}em`;
      }
      const marker = context.doc.createElement('span');
      marker.classList.add(WEB_FLOW_CLASS_NAMES.listMarker);
      marker.textContent = item.marker.text;
      marker.setAttribute('aria-hidden', 'true');
      marker.dataset.webFlowVisualOnly = 'true';
      li.appendChild(marker);
      const paragraph = renderParagraph(item.paragraph, context, false);
      paragraph.style.flex = '1 1 auto';
      li.appendChild(paragraph);
      list.appendChild(li);
    });
    node = list;
  } else throw new Error(`WebFlow cannot present ${block.kind} in browser flow`);
  if (context.layoutEpoch != null) node.dataset.layoutEpoch = String(context.layoutEpoch);
  node.dataset.flowBlockId = block.id;
  applyLayoutIdentityDataset(node, context.layoutIdentities.get(block.id));
  applySourceAnchorDataset(node, 'sourceAnchor' in block ? block.sourceAnchor : undefined);
  return node;
}

export function renderWebFlowItem(
  item: WebFlowPaintItem,
  doc: Document,
  options: WebFlowPainterOptions,
): HTMLElement | null {
  if (!doesWebFlowBlockProduceDom(item.block)) return null;
  const node = renderFlowBlock(item.block, {
    doc,
    options,
    showFormattingMarks: item.showFormattingMarks === true,
    ...(item.layoutEpoch != null ? { layoutEpoch: item.layoutEpoch } : {}),
    layoutIdentities: new Map(item.layoutIdentities?.map((identity) => [identity.blockRef, identity]) ?? []),
  });
  node.classList.add(WEB_FLOW_CLASS_NAMES.block);
  node.dataset.webFlowKey = item.stableDomKey;
  node.dataset.webFlowFingerprint = item.renderFingerprint;
  node.dataset.flowBlockId = item.block.id;
  node.dataset.webFlowEditable = String(item.editable !== false && node.dataset.webFlowEditable !== 'false');
  return node;
}

interface RebaseBlockEntry {
  readonly block: FlowBlock;
  readonly id: string;
  readonly appliesSourceAnchor: boolean;
}

function collectRebaseBlocks(block: FlowBlock): RebaseBlockEntry[] {
  const result: RebaseBlockEntry[] = [];
  const visit = (candidate: FlowBlock): void => {
    if (!doesWebFlowBlockProduceDom(candidate)) return;
    result.push({ block: candidate, id: candidate.id, appliesSourceAnchor: true });
    if (candidate.kind === 'list') {
      candidate.items.forEach((item) => {
        result.push({ block: item.paragraph, id: item.id, appliesSourceAnchor: false });
        visit(item.paragraph);
      });
      return;
    }
    if (candidate.kind !== 'table') return;
    candidate.rows.forEach((row) => {
      result.push({ block: candidate, id: row.id, appliesSourceAnchor: false });
      row.cells.forEach((cell) => {
        result.push({ block: candidate, id: cell.id, appliesSourceAnchor: false });
        (cell.blocks ?? (cell.paragraph ? [cell.paragraph] : [])).forEach(visit);
      });
    });
  };
  visit(block);
  return result;
}

/** Identity-only signature for deciding whether a retained node needs dataset rebasing. */
export function webFlowItemIdentityFingerprint(item: WebFlowPaintItem): string {
  const identities = [...(item.layoutIdentities ?? [])]
    .map((identity) => ({
      blockRef: identity.blockRef,
      fragmentId: identity.fragmentId,
      story: identity.story,
    }))
    .sort((left, right) => left.blockRef.localeCompare(right.blockRef));
  const blocks = collectRebaseBlocks(item.block).map((entry) => ({
    id: entry.id,
    sourceAnchor:
      entry.appliesSourceAnchor && 'sourceAnchor' in entry.block ? (entry.block.sourceAnchor ?? null) : null,
  }));
  return JSON.stringify({ blocks, identities });
}

/** Rebase canonical identity datasets without replacing an unchanged retained node. */
export function rebaseWebFlowItemNode(
  node: HTMLElement,
  previous: WebFlowPaintItem,
  next: WebFlowPaintItem,
): () => void {
  const rebaseDatasetKeys = [
    'flowBlockId',
    'blockId',
    'layoutFragmentId',
    'layoutBlockRef',
    'layoutStory',
    'webFlowFingerprint',
    'sourceAnchor',
    'sourceNodeId',
    'sourceOccurrenceId',
  ] as const;
  const snapshotDataset = (element: HTMLElement): Record<string, string | undefined> =>
    Object.fromEntries(rebaseDatasetKeys.map((key) => [key, element.dataset[key]]));
  const restoreDataset = (element: HTMLElement, values: Record<string, string | undefined>): void => {
    for (const key of rebaseDatasetKeys) {
      const value = values[key];
      if (value == null) delete element.dataset[key];
      else element.dataset[key] = value;
    }
  };
  const previousBlocks = collectRebaseBlocks(previous.block);
  const nextBlocks = collectRebaseBlocks(next.block);
  if (previousBlocks.length !== nextBlocks.length) {
    throw new Error('WebFlowPainter: retained rebase changed semantic shape');
  }
  const elements = [node, ...Array.from(node.querySelectorAll<HTMLElement>('[data-flow-block-id]'))];
  const elementById = new Map<string, HTMLElement>();
  elements.forEach((element) => {
    const id = element.dataset.flowBlockId;
    if (id && !elementById.has(id)) elementById.set(id, element);
  });
  const nextIdentities = new Map(next.layoutIdentities?.map((identity) => [identity.blockRef, identity]) ?? []);
  const mutations: Array<{
    element: HTMLElement;
    dataset: Record<string, string | undefined>;
  }> = [];
  const topDataset = snapshotDataset(node);
  for (let index = 0; index < previousBlocks.length; index += 1) {
    const previousEntry = previousBlocks[index]!;
    const nextEntry = nextBlocks[index]!;
    const element = elementById.get(previousEntry.id);
    if (!element) throw new Error(`WebFlowPainter: retained rebase lost ${previousEntry.id}`);
    mutations.push({ element, dataset: snapshotDataset(element) });
    element.dataset.flowBlockId = nextEntry.id;
    if (element.dataset.blockId != null) element.dataset.blockId = nextEntry.id;
    applyLayoutIdentityDataset(element, nextIdentities.get(nextEntry.id));
    if (nextEntry.appliesSourceAnchor) {
      applySourceAnchorDataset(element, 'sourceAnchor' in nextEntry.block ? nextEntry.block.sourceAnchor : undefined);
    }
  }
  node.dataset.webFlowFingerprint = next.renderFingerprint;
  node.dataset.flowBlockId = next.block.id;
  return () => {
    for (const { element, dataset } of mutations) {
      restoreDataset(element, dataset);
    }
    restoreDataset(node, topDataset);
  };
}
