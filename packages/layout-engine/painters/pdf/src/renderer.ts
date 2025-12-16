import type {
  FlowBlock,
  Fragment,
  Layout,
  Line,
  Measure,
  Page,
  ParaFragment,
  ImageFragment,
  DrawingFragment,
  Run,
  TextRun,
  ParagraphBlock,
  ImageBlock,
  DrawingBlock,
  VectorShapeDrawing,
  ShapeGroupDrawing,
  ImageDrawing,
  DrawingMeasure,
  DrawingGeometry,
  ParagraphAttrs,
  ParagraphBorder,
  ListBlock,
  ListMeasure,
  ListItemFragment,
  TrackedChangesMode,
  TrackedChangeKind,
} from '@superdoc/contracts';
import type { PageDecorationProvider } from './index.js';
import { toCssFontFamily } from '../../../../../shared/font-utils/index.js';

const PX_TO_PT = 72 / 96;
const COMMENT_EXTERNAL_COLOR = '#B1124B';
const COMMENT_INTERNAL_COLOR = '#078383';
const COMMENT_LIGHTEN_FACTOR = 0.75; // blend toward white for softer highlights

/**
 * Slices runs for a specific line from a paragraph block.
 *
 * Extracts and slices the runs that are part of the given line,
 * handling partial runs at the start and end of the line.
 *
 * @param block - The paragraph block containing the runs
 * @param line - The line to slice runs for
 * @returns Array of runs for this line
 */
const sliceRunsForLine = (block: ParagraphBlock, line: Line): Run[] => {
  const result: Run[] = [];

  for (let runIndex = line.fromRun; runIndex <= line.toRun; runIndex += 1) {
    const run = block.runs[runIndex];
    if (!run) continue;

    const text = run.kind === 'image' ? '' : (run.text ?? '');
    const isFirstRun = runIndex === line.fromRun;
    const isLastRun = runIndex === line.toRun;
    const runLength = text.length;
    const runPmStart = run.pmStart ?? null;
    const fallbackPmEnd = runPmStart != null && run.pmEnd == null ? runPmStart + runLength : (run.pmEnd ?? null);

    if (isFirstRun || isLastRun) {
      const start = isFirstRun ? line.fromChar : 0;
      const end = isLastRun ? line.toChar : text.length;
      const slice = text.slice(start, end);
      if (!slice) continue;

      const pmSliceStart = runPmStart != null ? runPmStart + start : undefined;
      const pmSliceEnd = runPmStart != null ? runPmStart + end : (fallbackPmEnd ?? undefined);
      if (run.kind === 'tab') {
        // Only include the tab run if the slice contains the tab character
        if (slice.includes('\t')) {
          result.push(run);
        }
      } else {
        // TextRun: return a sliced TextRun preserving styles
        const sliced: TextRun = {
          ...(run as TextRun),
          text: slice,
          pmStart: pmSliceStart,
          pmEnd: pmSliceEnd,
          comments: (run as TextRun).comments ? [...(run as TextRun).comments!] : undefined,
        };
        result.push(sliced);
      }
    } else {
      result.push(run);
    }
  }

  return result;
};
const LIST_MARKER_GAP = 8;

const TRACK_INSERT_FILL = '#e6f4ec';
const TRACK_DELETE_FILL = '#fde6ec';
const TRACK_FORMAT_FILL = '#fff2cc';
// TRACK_INSERT_COLOR is defined for potential future use
// const _TRACK_INSERT_COLOR = '#00853d';
const TRACK_DELETE_COLOR = '#cb0e47';
const TRACK_FORMAT_COLOR = '#c19700';

type TrackedChangesRenderConfig = {
  mode: TrackedChangesMode;
  enabled: boolean;
};

type PdfTrackChangeStyle = {
  fill?: string;
  strike?: string;
  underline?: string;
};

const TRACK_CHANGE_PDF_STYLES: Record<
  TrackedChangeKind,
  Partial<Record<TrackedChangesMode, PdfTrackChangeStyle | undefined>>
> = {
  insert: {
    review: { fill: TRACK_INSERT_FILL },
  },
  delete: {
    review: { fill: TRACK_DELETE_FILL, strike: TRACK_DELETE_COLOR },
  },
  format: {
    review: { fill: TRACK_FORMAT_FILL, underline: TRACK_FORMAT_COLOR },
  },
};

const FONT_IDS = {
  regular: 'F1',
  bold: 'F2',
  italic: 'F3',
  boldItalic: 'F4',
} as const;

type FontKey = (typeof FONT_IDS)[keyof typeof FONT_IDS];

type BlockLookup = Map<string, { block: FlowBlock; measure: Measure }>;

type PdfImageResource = {
  blockId: string;
  name: string;
  data: Uint8Array;
  width: number;
  height: number;
  colorSpace: 'DeviceRGB' | 'DeviceGray';
  bitsPerComponent: number;
  filter?: 'DCTDecode' | 'FlateDecode';
  decodeParms?: string; // Raw PDF decode params, e.g., "<< /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns 100 >>"
  // Optional soft mask (alpha channel)
  smask?: {
    data: Uint8Array;
    width: number;
    height: number;
    bitsPerComponent: number; // typically 8
    filter?: 'FlateDecode';
    decodeParms?: string;
  };
};

type PageDecorationPayload = {
  fragments: Fragment[];
  height: number;
  /** Optional measured content height to aid bottom alignment in footers. */
  contentHeight?: number;
  offset?: number;
  marginLeft?: number;
};

type FragmentRenderContext = {
  pageNumber: number;
  totalPages: number;
  section: 'body' | 'header' | 'footer';
  /** Optional formatted page number text from layout (e.g., "i", "III", "23") */
  pageNumberText?: string;
};

const translateFragment = (fragment: Fragment, offsetY: number, offsetX: number = 0): Fragment => {
  if (!offsetY && !offsetX) return fragment;
  if (fragment.kind === 'para') {
    return { ...fragment, x: fragment.x + offsetX, y: fragment.y + offsetY };
  }
  if (fragment.kind === 'list-item') {
    return { ...fragment, x: fragment.x + offsetX, y: fragment.y + offsetY };
  }
  if (fragment.kind === 'image') {
    return { ...fragment, x: fragment.x + offsetX, y: fragment.y + offsetY };
  }
  if (fragment.kind === 'table') {
    return { ...fragment, x: fragment.x + offsetX, y: fragment.y + offsetY };
  }
  return fragment;
};

const resolveRunText = (run: Run, context: FragmentRenderContext): string => {
  if (run.kind === 'tab') {
    return run.text;
  }
  if (run.kind === 'image') {
    // Image runs don't have text content
    return '';
  }
  if (!run.token) {
    return run.text ?? '';
  }
  if (run.token === 'pageNumber') {
    // Use formatted page number text from layout if available
    return context.pageNumberText ?? String(context.pageNumber);
  }
  if (run.token === 'totalPageCount') {
    return context.totalPages ? String(context.totalPages) : (run.text ?? '');
  }
  return run.text ?? '';
};

type BorderBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type BorderLineCoords = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export class PdfPainter {
  private readonly lookup: BlockLookup;
  private imageResources: Map<string, PdfImageResource>;
  private readonly headerProvider?: PageDecorationProvider;
  private readonly footerProvider?: PageDecorationProvider;
  private totalPages = 0;

  constructor(
    blocks: FlowBlock[],
    measures: Measure[],
    options: { headerProvider?: PageDecorationProvider; footerProvider?: PageDecorationProvider } = {},
  ) {
    if (blocks.length !== measures.length) {
      throw new Error('PdfPainter requires equal numbers of blocks and measures');
    }

    this.lookup = new Map(blocks.map((block, index) => [block.id, { block, measure: measures[index] }]));
    // Defer image resource collection until render() so we can do async work (e.g., PNG RGBA decode in browser)
    this.imageResources = new Map();
    this.headerProvider = options.headerProvider;
    this.footerProvider = options.footerProvider;
  }

  private async collectImageResources(
    blocks: FlowBlock[],
    measures: Measure[],
  ): Promise<Map<string, PdfImageResource>> {
    const resources = new Map<string, PdfImageResource>();
    let counter = 1;

    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];

      // Handle regular image blocks
      if (block.kind === 'image') {
        const measure = measures[index];
        if (!measure || measure.kind !== 'image') continue;

        const resource = await createPdfImageResource(block, `Im${counter}`);
        if (resource) {
          resources.set(block.id, resource);
          counter += 1;
        }
      }

      // Handle image drawings
      if (block.kind === 'drawing' && block.drawingKind === 'image') {
        const measure = measures[index];
        if (!measure || measure.kind !== 'drawing') continue;

        const imageDrawing = block as ImageDrawing;
        // Create a temporary ImageBlock for the resource creation
        const tempImageBlock: ImageBlock = {
          kind: 'image',
          id: block.id,
          src: imageDrawing.src,
          width: imageDrawing.width,
          height: imageDrawing.height,
          alt: imageDrawing.alt,
          title: imageDrawing.title,
          objectFit: imageDrawing.objectFit,
        };

        const resource = await createPdfImageResource(tempImageBlock, `Im${counter}`);
        if (resource) {
          resources.set(block.id, resource);
          counter += 1;
        }
      }
    }

    return resources;
  }

  async render(layout: Layout): Promise<Blob> {
    this.totalPages = layout.pages.length;
    // Build image resources now (async to support PNG decode in browsers)
    const blocks: FlowBlock[] = Array.from(this.lookup.values()).map((e) => e.block);
    const measures: Measure[] = Array.from(this.lookup.values()).map((e) => e.measure);
    this.imageResources = await this.collectImageResources(blocks, measures);
    const pageData = layout.pages.map((page) => {
      const pageSize = page.size ?? layout.pageSize;
      return {
        stream: this.buildPageStream(page, pageSize.h),
        size: pageSize,
      };
    });

    const pdfBytes = buildPdfDocument({
      pageData,
      images: Array.from(this.imageResources.values()),
    });

    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  private buildPageStream(page: Page, pageHeightPx: number): string {
    const fragments: Array<{ fragment: Fragment; context: FragmentRenderContext }> = [];

    const addFragments = (
      payload: PageDecorationPayload | null | undefined,
      section: FragmentRenderContext['section'],
    ) => {
      if (!payload) return;
      const baseOffset = payload.offset ?? (section === 'footer' ? pageHeightPx - payload.height : 0);
      const marginLeft = payload.marginLeft ?? 0;
      let footerYOffset = 0;
      if (section === 'footer') {
        const contentHeight =
          typeof payload.contentHeight === 'number'
            ? payload.contentHeight
            : payload.fragments.reduce((max, f) => {
                const fragmentHeight =
                  'height' in f && typeof f.height === 'number' ? f.height : this.estimateFragmentHeight(f);
                return Math.max(max, f.y + Math.max(0, fragmentHeight));
              }, 0);
        footerYOffset = Math.max(0, payload.height - contentHeight);
      }
      payload.fragments.forEach((fragment) => {
        fragments.push({
          fragment: translateFragment(fragment, baseOffset + footerYOffset, marginLeft),
          context: {
            pageNumber: page.number,
            totalPages: this.totalPages,
            section,
            pageNumberText: page.numberText,
          },
        });
      });
    };

    addFragments(this.headerProvider?.(page.number, page.margins) ?? null, 'header');
    page.fragments.forEach((fragment) => {
      fragments.push({
        fragment,
        context: {
          pageNumber: page.number,
          totalPages: this.totalPages,
          section: 'body',
          pageNumberText: page.numberText,
        },
      });
    });
    addFragments(this.footerProvider?.(page.number, page.margins) ?? null, 'footer');

    return fragments.map(({ fragment, context }) => this.renderFragment(fragment, pageHeightPx, context)).join('');
  }

  private renderFragment(fragment: Fragment, pageHeightPx: number, context: FragmentRenderContext): string {
    if (fragment.kind === 'para') {
      return this.renderParagraphFragment(fragment, pageHeightPx, context);
    }
    if (fragment.kind === 'list-item') {
      return this.renderListItemFragment(fragment, pageHeightPx, context);
    }
    if (fragment.kind === 'image') {
      return this.renderImageFragment(fragment, pageHeightPx);
    }
    if (fragment.kind === 'drawing') {
      return this.renderDrawingFragment(fragment, pageHeightPx);
    }
    return '';
  }

  /**
   * Estimates the height of a fragment when explicit height is not available.
   *
   * This method provides fallback height calculations for footer bottom-alignment
   * by consulting measure data for paragraphs and list items, or using the
   * fragment's height property for tables, images, and drawings.
   *
   * @param fragment - The fragment to estimate height for
   * @returns Estimated height in pixels, or 0 if height cannot be determined
   */
  private estimateFragmentHeight(fragment: Fragment): number {
    const entry = this.lookup.get(fragment.blockId);
    const measure = entry?.measure;

    if (fragment.kind === 'para' && measure?.kind === 'paragraph') {
      return measure.totalHeight;
    }

    if (fragment.kind === 'list-item' && measure?.kind === 'list') {
      return measure.totalHeight;
    }

    if (fragment.kind === 'table') {
      return fragment.height;
    }

    if (fragment.kind === 'image' || fragment.kind === 'drawing') {
      return fragment.height;
    }

    return 0;
  }

  private renderParagraphFragment(
    fragment: ParaFragment,
    pageHeightPx: number,
    context: FragmentRenderContext,
  ): string {
    const entry = this.lookup.get(fragment.blockId);
    if (!entry || entry.block.kind !== 'paragraph' || entry.measure.kind !== 'paragraph') {
      throw new Error(`PdfPainter: missing paragraph data for ${fragment.blockId}`);
    }

    const { block, measure } = entry;
    const indent = block.attrs?.indent;
    const paddingLeft = sanitizePositive(indent?.left);
    const paddingRight = sanitizePositive(indent?.right);
    const availableWidth = Math.max(1, fragment.width - paddingLeft - paddingRight);

    let yCursor = fragment.y;
    const lines = measure.lines.slice(fragment.fromLine, fragment.toLine);
    const fragmentHeight = lines.reduce((sum, line) => sum + line.lineHeight, 0);

    // Check if the paragraph ends with a lineBreak run.
    // In Word, justified text stretches all lines EXCEPT the true last line of a paragraph.
    // However, if the paragraph ends with a <w:br/> (lineBreak), the visible text before
    // the break should still be justified because the "last line" is the empty line after the break.
    const lastRun = block.runs.length > 0 ? block.runs[block.runs.length - 1] : null;
    const paragraphEndsWithLineBreak = lastRun?.kind === 'lineBreak';

    const textContent = lines
      .map((line, index) => {
        const absoluteLineIndex = fragment.fromLine + index;
        const indentOffset = calculateLineIndentOffset(indent, absoluteLineIndex);
        const alignOffset = calculateAlignmentOffset(block.attrs, availableWidth, line.width);
        const lineX = fragment.x + paddingLeft + indentOffset + alignOffset;
        const baseline = yCursor + line.lineHeight - line.descent;
        yCursor += line.lineHeight;

        // Determine if this is the true last line of the paragraph that should skip justification.
        // Skip justify if: this is the last line of the last fragment AND no trailing lineBreak.
        const isLastLineOfFragment = index === lines.length - 1;
        const isLastLineOfParagraph = isLastLineOfFragment && !fragment.continuesOnNext;
        const shouldSkipJustifyForLastLine = isLastLineOfParagraph && !paragraphEndsWithLineBreak;

        return this.renderLine(
          block,
          line,
          lineX,
          baseline,
          pageHeightPx,
          context,
          availableWidth,
          shouldSkipJustifyForLastLine,
        );
      })
      .join('');

    const parts: string[] = [];
    const shadingChunk = this.renderShadingRect(
      {
        x: fragment.x,
        y: fragment.y,
        width: fragment.width,
        height: fragmentHeight,
      },
      block.attrs?.shading,
      pageHeightPx,
    );
    if (shadingChunk) {
      parts.push(shadingChunk);
    }
    const borderChunk = this.renderBorderBox(
      {
        x: fragment.x,
        y: fragment.y,
        width: fragment.width,
        height: fragmentHeight,
      },
      block.attrs?.borders,
      pageHeightPx,
    );
    if (borderChunk) {
      parts.push(borderChunk);
    }
    parts.push(textContent);

    // Paragraph marker rendering (Track B paragraph pipeline)
    const wordLayout = (block.attrs as Record<string, unknown>)?.wordLayout;
    if (!fragment.continuesFromPrev && fragment.markerWidth && wordLayout?.marker && measure.marker) {
      console.log('[PdfPainter.renderParagraphFragment] Rendering marker', {
        blockId: fragment.blockId,
        markerText: wordLayout.marker.markerText,
        markerWidth: fragment.markerWidth,
        indent: block.attrs?.indent,
      });
      const markerBaseline = fragment.y + (lines[0]?.lineHeight ?? 0) - (lines[0]?.descent ?? 0);
      const markerText = wordLayout.marker.markerText ?? '';
      const markerRun: Run = {
        text: markerText,
        fontFamily: toCssFontFamily(wordLayout.marker.run.fontFamily) ?? wordLayout.marker.run.fontFamily,
        fontSize: wordLayout.marker.run.fontSize,
        bold: wordLayout.marker.run.bold,
        italic: wordLayout.marker.run.italic,
        color: wordLayout.marker.run.color,
      };
      const fontId = selectFont(markerRun);
      const markerTextWidth = measure.marker.markerTextWidth;
      const justification = wordLayout.marker.justification ?? 'left';
      let markerX: number;
      const indentLeft = indent?.left ?? 0;
      const indentFirstLine = indent?.firstLine ?? 0;
      const indentHanging = indent?.hanging ?? 0;
      const textIndent = indentFirstLine - indentHanging;
      const textStartOffset = indentLeft + textIndent;
      const markerAreaStart = fragment.x + textStartOffset - fragment.markerWidth;
      const markerAreaWidth = Math.max(0, fragment.markerWidth - LIST_MARKER_GAP);
      if (justification === 'right') {
        markerX = markerAreaStart + Math.max(0, markerAreaWidth - markerTextWidth);
      } else if (justification === 'center') {
        markerX = markerAreaStart + Math.max(0, (markerAreaWidth - markerTextWidth) / 2);
      } else {
        markerX = markerAreaStart;
      }
      const markerChunk = [
        'BT',
        `1 0 0 1 ${toPt(markerX).toFixed(2)} ${toPt(pageHeightPx - markerBaseline).toFixed(2)} Tm`,
        `/${fontId} ${toPt(markerRun.fontSize).toFixed(2)} Tf`,
        toPdfTextOperand(markerText),
        'ET',
      ];
      parts.unshift(markerChunk.join('\n'));
    } else if (block.attrs?.numberingProperties) {
      console.warn('[PdfPainter.renderParagraphFragment] Missing marker data', {
        blockId: fragment.blockId,
        fragmentMarkerWidth: fragment.markerWidth,
        hasWordLayout: Boolean(wordLayout),
        hasMeasureMarker: Boolean(measure.marker),
        numberingProperties: block.attrs.numberingProperties,
      });
    }

    return parts.join('');
  }

  private renderListItemFragment(
    fragment: ListItemFragment,
    pageHeightPx: number,
    context: FragmentRenderContext,
  ): string {
    const entry = this.lookup.get(fragment.blockId);
    if (!entry || entry.block.kind !== 'list' || entry.measure.kind !== 'list') {
      throw new Error(`PdfPainter: missing list data for ${fragment.blockId}`);
    }

    const block = entry.block as ListBlock;
    const measure = entry.measure as ListMeasure;
    const item = block.items.find((candidate) => candidate.id === fragment.itemId);
    const itemMeasure = measure.items.find((candidate) => candidate.itemId === fragment.itemId);
    if (!item || !itemMeasure) {
      throw new Error(`PdfPainter: missing list item ${fragment.itemId}`);
    }

    const paragraphMeasure = itemMeasure.paragraph;
    let yCursor = fragment.y;
    const lines = paragraphMeasure.lines.slice(fragment.fromLine, fragment.toLine);
    const markerAlign = item.marker.align ?? 'left';
    const markerTextWidth = itemMeasure.markerTextWidth ?? itemMeasure.markerWidth;
    const fragmentHeight = lines.reduce((sum, line) => sum + line.lineHeight, 0);

    const paragraphContent = lines
      .map((line, _idx) => {
        const baseline = yCursor + line.lineHeight - line.descent;
        yCursor += line.lineHeight;
        // List paragraphs should not be justified - pass true for skipJustify
        return this.renderLine(
          item.paragraph,
          line,
          fragment.x,
          baseline,
          pageHeightPx,
          context,
          fragment.width,
          true, // skipJustify: list content should always be left-aligned
        );
      })
      .join('');

    const contentParts: string[] = [];
    const shadingChunk = this.renderShadingRect(
      {
        x: fragment.x,
        y: fragment.y,
        width: fragment.width,
        height: fragmentHeight,
      },
      item.paragraph.attrs?.shading,
      pageHeightPx,
    );
    if (shadingChunk) {
      contentParts.push(shadingChunk);
    }
    const borderChunk = this.renderBorderBox(
      {
        x: fragment.x,
        y: fragment.y,
        width: fragment.width,
        height: fragmentHeight,
      },
      item.paragraph.attrs?.borders,
      pageHeightPx,
    );
    if (borderChunk) {
      contentParts.push(borderChunk);
    }
    contentParts.push(paragraphContent);
    const content = contentParts.join('');

    if (fragment.continuesFromPrev) {
      return content;
    }

    const markerBaseline = fragment.y + (lines[0]?.lineHeight ?? 0) - (lines[0]?.descent ?? 0);

    // Track B: Use wordLayout for marker styling and positioning
    const wordLayout = item.paragraph.attrs?.wordLayout as Record<string, unknown> | undefined;
    let markerX: number;
    let markerRun: Run;
    let markerText: string;
    let markerJustification: string;

    if (wordLayout?.marker) {
      const marker = wordLayout.marker;
      markerText = marker.markerText;
      markerJustification = marker.justification;
      markerRun = {
        text: marker.markerText,
        fontFamily: toCssFontFamily(marker.run.fontFamily) ?? marker.run.fontFamily,
        fontSize: marker.run.fontSize,
        bold: marker.run.bold,
        italic: marker.run.italic,
        color: marker.run.color,
      };

      // Calculate markerX using wordLayout justification
      if (markerJustification === 'right') {
        markerX = fragment.x - LIST_MARKER_GAP - markerTextWidth;
      } else if (markerJustification === 'center') {
        const markerAreaStart = fragment.x - fragment.markerWidth;
        const markerAreaWidth = Math.max(0, fragment.markerWidth - LIST_MARKER_GAP);
        markerX = markerAreaStart + Math.max(0, (markerAreaWidth - markerTextWidth) / 2);
      } else {
        markerX = fragment.x - fragment.markerWidth + LIST_MARKER_GAP;
      }
    } else {
      // Fallback: legacy behavior
      markerText = item.marker.text ?? '';
      markerJustification = markerAlign;
      markerRun = getPrimaryRun(item.paragraph);

      if (markerAlign === 'right') {
        markerX = fragment.x - LIST_MARKER_GAP - markerTextWidth;
      } else if (markerAlign === 'center') {
        const markerAreaStart = fragment.x - fragment.markerWidth;
        const markerAreaWidth = Math.max(0, fragment.markerWidth - LIST_MARKER_GAP);
        markerX = markerAreaStart + Math.max(0, (markerAreaWidth - markerTextWidth) / 2);
      } else {
        markerX = fragment.x - fragment.markerWidth + LIST_MARKER_GAP;
      }
    }

    const fontId = selectFont(markerRun);
    const fontSize = markerRun.kind === 'text' ? markerRun.fontSize : 12;
    const markerParts = [
      'BT',
      `1 0 0 1 ${toPt(markerX).toFixed(2)} ${toPt(pageHeightPx - markerBaseline).toFixed(2)} Tm`,
      `/${fontId} ${toPt(fontSize).toFixed(2)} Tf`,
      toPdfTextOperand(markerText),
      'ET',
    ];

    return markerParts.join('\n') + '\n' + content;
  }

  /**
   * Renders a single line of a paragraph block.
   *
   * @param block - The paragraph block containing the line
   * @param line - The line measurement data
   * @param x - The x-coordinate for the line start
   * @param baseline - The baseline y-coordinate for the line
   * @param pageHeightPx - The page height in pixels for coordinate conversion
   * @param context - Rendering context with fragment information
   * @param availableWidthOverride - Optional override for available width used in justification calculations
   * @param skipJustify - When true, prevents justification even if alignment is 'justify'
   * @returns The rendered line as PDF content stream commands
   */
  private renderLine(
    block: ParagraphBlock,
    line: Line,
    x: number,
    baseline: number,
    pageHeightPx: number,
    context: FragmentRenderContext,
    availableWidthOverride?: number,
    skipJustify?: boolean,
  ): string {
    const runs = sliceRunsForLine(block, line);
    if (runs.length === 0) {
      return '';
    }
    const textSlices =
      runs.length > 0
        ? runs
            .filter((r): r is TextRun => (r.kind === 'text' || r.kind === undefined) && 'text' in r && r.text != null)
            .map((r) => r.text)
        : gatherTextSlicesForLine(block, line);

    const parts: string[] = [];
    const trackedConfig = this.resolveTrackedChangesConfig(block);
    const trackedDecorations = this.renderTrackedChangeDecorations(
      block,
      line,
      x,
      baseline,
      pageHeightPx,
      trackedConfig,
    );
    if (trackedDecorations) {
      parts.push(trackedDecorations);
    }
    const commentHighlights = this.renderCommentHighlights(block, line, x, baseline, pageHeightPx);
    if (commentHighlights) {
      parts.push(commentHighlights);
    }

    // Render tab leaders (horizontal lines before text)
    if (line.leaders && line.leaders.length > 0) {
      line.leaders.forEach((ld) => {
        const fromPt = toPt(x + ld.from);
        const toPt_ = toPt(x + ld.to);
        const yPt = toPt(pageHeightPx - baseline + 2); // 2px below baseline like DOM

        // Set line width and dash pattern based on leader style
        if (ld.style === 'heavy') {
          parts.push('2 w'); // 2pt width
        } else {
          parts.push('1 w'); // 1pt width
        }

        // Set dash pattern
        if (ld.style === 'dot') {
          parts.push('[1 2] 0 d'); // Dotted: 1pt on, 2pt off
        } else if (ld.style === 'hyphen') {
          parts.push('[3 2] 0 d'); // Dashed: 3pt on, 2pt off
        } else {
          parts.push('[] 0 d'); // Solid (underscore/heavy)
        }

        // Draw horizontal line
        parts.push(`${fromPt.toFixed(2)} ${yPt.toFixed(2)} m`); // Move to start
        parts.push(`${toPt_.toFixed(2)} ${yPt.toFixed(2)} l`); // Line to end
        parts.push('S'); // Stroke

        // Reset dash pattern to solid
        parts.push('[] 0 d');
      });
    }

    // Render bar tabs (vertical lines before text)
    if (line.bars && line.bars.length > 0) {
      line.bars.forEach((bar) => {
        const barXPt = toPt(x + bar.x);
        const topYPt = toPt(pageHeightPx - (baseline - line.ascent));
        const bottomYPt = toPt(pageHeightPx - (baseline + line.descent));

        parts.push('1 w'); // 1pt width
        parts.push('[] 0 d'); // Solid line
        parts.push('0.6 g'); // Gray opacity (approximation of DOM's opacity: 0.6)

        // Draw vertical line
        parts.push(`${barXPt.toFixed(2)} ${topYPt.toFixed(2)} m`); // Move to top
        parts.push(`${barXPt.toFixed(2)} ${bottomYPt.toFixed(2)} l`); // Line to bottom
        parts.push('S'); // Stroke

        parts.push('0 g'); // Reset to black
      });
    }

    // Render text: prefer segment-based positioning if any segment carries an explicit X
    const hasExplicitSegments = Array.isArray(line.segments) && line.segments.some((s) => s.x !== undefined);
    const availableWidth = availableWidthOverride ?? line.maxWidth ?? line.width;
    const isJustify = (block.attrs as ParagraphAttrs | undefined)?.alignment === 'justify';
    let justifyWordSpacing: number | undefined;
    if (isJustify && !hasExplicitSegments && !skipJustify) {
      const spaceCount = textSlices.reduce(
        (sum, s) => sum + Array.from(s).filter((ch) => ch === ' ' || ch === '\u00A0').length,
        0,
      );
      const slack = availableWidth - line.width;
      if (spaceCount > 0 && slack > 0) {
        const extraPerSpacePx = slack / spaceCount;
        const runWithFontSize = runs.find((r) => 'fontSize' in r && typeof (r as TextRun).fontSize === 'number') as
          | TextRun
          | undefined;
        const baseFontSizePx = runWithFontSize?.fontSize ?? getPrimaryRun(block).fontSize;
        if (baseFontSizePx && Number.isFinite(baseFontSizePx) && baseFontSizePx > 0) {
          justifyWordSpacing = extraPerSpacePx / baseFontSizePx;
        }
      }
    }
    parts.push('BT');
    if (justifyWordSpacing && Number.isFinite(justifyWordSpacing) && justifyWordSpacing > 0) {
      parts.push(`${justifyWordSpacing.toFixed(4)} Tw`);
    }
    if (hasExplicitSegments && line.segments) {
      // Segment-aware rendering:
      // - For segments with explicit X (tab-aligned), position with Tm to absolute X.
      // - For segments without explicit X, continue flowing from the current text position
      //   so spacing is computed by the PDF engine (avoids measurement drift).
      let positioned = false;
      const absY = toPt(pageHeightPx - baseline);
      for (const segment of line.segments) {
        // Prefer original block run for styling; slice text by absolute run chars
        const blockRun = block.runs[segment.runIndex] as Run | undefined;
        const isTab = blockRun?.kind === 'tab';
        const isImage = blockRun?.kind === 'image';
        if (!blockRun || isTab || isImage) continue;

        const fullText = blockRun.text ?? '';
        const segSlice = fullText.slice(segment.fromChar, segment.toChar);
        if (!segSlice) continue;
        const segRun: Run = { ...blockRun, text: segSlice } as Run;
        const fontId = selectFont(segRun);

        if (segment.x !== undefined) {
          const absX = toPt(x + segment.x);
          parts.push(`1 0 0 1 ${absX.toFixed(2)} ${absY.toFixed(2)} Tm`);
          positioned = true;
        } else if (!positioned) {
          // Ensure we have an initial origin when the first segment has no explicit X
          const absX = toPt(x);
          parts.push(`1 0 0 1 ${absX.toFixed(2)} ${absY.toFixed(2)} Tm`);
          positioned = true;
        }

        if (segRun.kind === 'text') {
          parts.push(`${formatColor(segRun.color)} rg`);
          parts.push(`/${fontId} ${toPt(segRun.fontSize).toFixed(2)} Tf`);
        }
        const text = resolveRunText(segRun, context);
        if (text) parts.push(toPdfTextOperand(text));
      }
    } else {
      // Fallback: sequential run-based rendering from the line origin
      parts.push(`1 0 0 1 ${toPt(x).toFixed(2)} ${toPt(pageHeightPx - baseline).toFixed(2)} Tm`);
      runs.forEach((run) => {
        if (run.kind === 'tab' || run.kind === 'image') return; // skip tabs and images
        const fontId = selectFont(run);
        parts.push(`${formatColor(run.color)} rg`);
        parts.push(`/${fontId} ${toPt(run.fontSize).toFixed(2)} Tf`);
        const text = resolveRunText(run, context);
        if (text) parts.push(toPdfTextOperand(text));
      });
    }
    if (justifyWordSpacing && Number.isFinite(justifyWordSpacing) && justifyWordSpacing > 0) {
      parts.push('0 Tw');
    }
    parts.push('ET');
    return parts.join('\n') + '\n';
  }

  private resolveTrackedChangesConfig(block: ParagraphBlock): TrackedChangesRenderConfig {
    const attrs = (block.attrs as ParagraphAttrs | undefined) ?? {};
    const mode = (attrs.trackedChangesMode as TrackedChangesMode | undefined) ?? 'review';
    const enabled = attrs.trackedChangesEnabled !== false;
    return { mode, enabled };
  }

  private renderTrackedChangeDecorations(
    block: ParagraphBlock,
    line: Line,
    lineOriginX: number,
    baseline: number,
    pageHeightPx: number,
    config: TrackedChangesRenderConfig,
  ): string {
    if (!config.enabled || config.mode === 'off') {
      return '';
    }
    const segments = line.segments;
    if (!segments || segments.length === 0) {
      return '';
    }
    const commands: string[] = [];
    let flowCursor = 0;
    segments.forEach((segment) => {
      const run = block.runs[segment.runIndex];
      if (!run || run.kind === 'tab') {
        flowCursor = (segment.x ?? flowCursor) + (segment.width ?? 0);
        return;
      }
      const textRun = run as TextRun;
      const meta = textRun.trackedChange;
      if (!meta) {
        flowCursor = (segment.x ?? flowCursor) + (segment.width ?? 0);
        return;
      }
      const style = TRACK_CHANGE_PDF_STYLES[meta.kind]?.[config.mode];
      if (!style) {
        flowCursor = (segment.x ?? flowCursor) + (segment.width ?? 0);
        return;
      }
      const segmentWidth = segment.width ?? 0;
      const startPx = lineOriginX + (segment.x ?? flowCursor);
      flowCursor = (segment.x ?? flowCursor) + segmentWidth;
      if (style.fill && segmentWidth > 0) {
        commands.push(
          ...this.drawHighlightRect(
            startPx,
            segmentWidth,
            line.lineHeight,
            baseline,
            line.ascent,
            pageHeightPx,
            style.fill,
          ),
        );
      }
      if (style.strike && segmentWidth > 0) {
        commands.push(
          ...this.drawStrikethrough(startPx, segmentWidth, baseline, line.ascent, pageHeightPx, style.strike),
        );
      }
      if (style.underline && segmentWidth > 0) {
        commands.push(
          ...this.drawUnderline(startPx, segmentWidth, baseline, line.descent, pageHeightPx, style.underline),
        );
      }
    });
    if (!commands.length) {
      return '';
    }
    return commands.join('\n') + '\n';
  }

  private renderCommentHighlights(
    block: ParagraphBlock,
    line: Line,
    lineOriginX: number,
    baseline: number,
    pageHeightPx: number,
  ): string {
    const segments = line.segments;
    if (!segments || segments.length === 0) return '';

    const commands: string[] = [];
    let flowCursor = 0;

    segments.forEach((segment) => {
      const run = block.runs[segment.runIndex];
      if (!run || run.kind === 'tab') {
        flowCursor = (segment.x ?? flowCursor) + (segment.width ?? 0);
        return;
      }
      const commentColor = getCommentFillColor((run as TextRun).comments);
      const segmentWidth = segment.width ?? 0;
      const startPx = lineOriginX + (segment.x ?? flowCursor);
      flowCursor = (segment.x ?? flowCursor) + segmentWidth;

      if (!commentColor || segmentWidth <= 0) return;

      commands.push(
        ...this.drawHighlightRect(
          startPx,
          segmentWidth,
          line.lineHeight,
          baseline,
          line.ascent,
          pageHeightPx,
          commentColor,
        ),
      );
    });

    if (!commands.length) return '';
    return commands.join('\n') + '\n';
  }

  private drawHighlightRect(
    startPx: number,
    widthPx: number,
    lineHeight: number,
    baseline: number,
    ascent: number,
    pageHeightPx: number,
    color: string,
  ): string[] {
    const topPx = baseline - ascent;
    const heightPx = lineHeight;
    const xPt = toPt(startPx);
    const yPt = toPt(pageHeightPx - topPx - heightPx);
    const widthPt = toPt(widthPx);
    const heightPt = toPt(heightPx);
    return [
      'q',
      `${formatColor(color)} rg`,
      `${xPt.toFixed(2)} ${yPt.toFixed(2)} ${widthPt.toFixed(2)} ${heightPt.toFixed(2)} re`,
      'f',
      'Q',
    ];
  }

  private drawStrikethrough(
    startPx: number,
    widthPx: number,
    baseline: number,
    ascent: number,
    pageHeightPx: number,
    color: string,
  ): string[] {
    const strikeYPx = baseline - Math.max(1, ascent * 0.4);
    const xStartPt = toPt(startPx);
    const xEndPt = toPt(startPx + widthPx);
    const yPt = toPt(pageHeightPx - strikeYPx);
    return [
      'q',
      `${formatColor(color)} RG`,
      '1 w',
      `${xStartPt.toFixed(2)} ${yPt.toFixed(2)} m`,
      `${xEndPt.toFixed(2)} ${yPt.toFixed(2)} l`,
      'S',
      'Q',
    ];
  }

  private drawUnderline(
    startPx: number,
    widthPx: number,
    baseline: number,
    descent: number,
    pageHeightPx: number,
    color: string,
  ): string[] {
    const underlineYPx = baseline + Math.max(1, Math.min(descent || 2, 4));
    const xStartPt = toPt(startPx);
    const xEndPt = toPt(startPx + widthPx);
    const yPt = toPt(pageHeightPx - underlineYPx);
    return [
      'q',
      `${formatColor(color)} RG`,
      '1 w',
      `${xStartPt.toFixed(2)} ${yPt.toFixed(2)} m`,
      `${xEndPt.toFixed(2)} ${yPt.toFixed(2)} l`,
      'S',
      'Q',
    ];
  }

  private renderImageFragment(fragment: ImageFragment, pageHeightPx: number): string {
    const entry = this.lookup.get(fragment.blockId);
    if (!entry || entry.block.kind !== 'image') {
      throw new Error(`PdfPainter: missing image data for ${fragment.blockId}`);
    }

    const resource = this.imageResources.get(fragment.blockId);
    const widthPt = toPt(fragment.width);
    const heightPt = toPt(fragment.height);
    const xPt = toPt(fragment.x);
    const yPt = toPt(pageHeightPx - fragment.y - fragment.height);

    const parts: string[] = [];
    parts.push('q');
    parts.push(`${widthPt.toFixed(2)} 0 0 ${heightPt.toFixed(2)} ${xPt.toFixed(2)} ${yPt.toFixed(2)} cm`);

    if (resource) {
      parts.push(`/${resource.name} Do`);
    } else {
      parts.push('0.9 0.9 0.9 rg');
      parts.push('0.75 0.75 0.75 RG');
      parts.push('0 0 m');
      parts.push('1 0 l');
      parts.push('1 1 l');
      parts.push('0 1 l');
      parts.push('h');
      parts.push('f');
    }

    parts.push('Q');
    return parts.join('\n') + '\n';
  }

  /**
   * Renders a drawing fragment to PDF commands.
   *
   * Handles vector shapes, shape groups, and image drawings.
   * Applies position, clipping, and geometry transforms.
   *
   * @param fragment - The drawing fragment to render
   * @param pageHeightPx - The page height in pixels (for coordinate conversion)
   * @returns PDF command string
   */
  private renderDrawingFragment(fragment: DrawingFragment, pageHeightPx: number): string {
    const entry = this.lookup.get(fragment.blockId);
    if (!entry || entry.block.kind !== 'drawing' || entry.measure.kind !== 'drawing') {
      return '';
    }

    const block = entry.block as DrawingBlock;
    const _measure = entry.measure as DrawingMeasure;

    // Calculate position (PDF coordinate system: origin at bottom-left)
    const xPt = toPt(fragment.x);
    const yPt = toPt(pageHeightPx - fragment.y - fragment.height);
    const widthPt = toPt(fragment.width);
    const heightPt = toPt(fragment.height);

    let pdf = '';
    pdf += 'q\n'; // save graphics state

    // Apply position and clipping
    pdf += `1 0 0 1 ${xPt.toFixed(2)} ${yPt.toFixed(2)} cm\n`; // translate to position
    pdf += `0 0 ${widthPt.toFixed(2)} ${heightPt.toFixed(2)} re W n\n`; // clip to bounds

    // Render content based on type
    if (block.drawingKind === 'vectorShape') {
      pdf += this.renderVectorShape(block as VectorShapeDrawing, fragment);
    } else if (block.drawingKind === 'shapeGroup') {
      pdf += this.renderShapeGroup(block as ShapeGroupDrawing, fragment);
    } else if (block.drawingKind === 'image') {
      pdf += this.renderDrawingImage(block as ImageDrawing, fragment);
    }

    pdf += 'Q\n'; // restore graphics state

    return pdf;
  }

  /**
   * Renders a vector shape drawing using PDF path commands.
   *
   * Supports basic shapes (rectangles and ellipses) with fill/stroke styling.
   * Applies geometry transforms (rotation, flips).
   *
   * @param block - The vector shape drawing block
   * @param fragment - The drawing fragment for positioning
   * @returns PDF command string
   */
  private renderVectorShape(block: VectorShapeDrawing, fragment: DrawingFragment): string {
    let pdf = '';

    // Apply geometry transforms (rotation, flips)
    const geometry = fragment.geometry;
    if (geometry.rotation || geometry.flipH || geometry.flipV) {
      const widthPt = toPt(fragment.width);
      const heightPt = toPt(fragment.height);
      pdf += this.applyDrawingTransform(geometry, widthPt, heightPt);
    }

    // Get shape dimensions
    const innerWidthPt = toPt(geometry.width);
    const innerHeightPt = toPt(geometry.height);

    // Set fill color
    if (block.fillColor) {
      // Handle complex fill types - extract color string or use fallback
      let colorStr: string | null = null;
      if (typeof block.fillColor === 'string') {
        colorStr = block.fillColor;
      } else if (block.fillColor && typeof block.fillColor === 'object' && 'type' in block.fillColor) {
        if (block.fillColor.type === 'solidWithAlpha') {
          colorStr = (block.fillColor as { color: string }).color;
          // TODO: Apply alpha via ExtGState
        } else if (block.fillColor.type === 'gradient') {
          // TODO: Implement PDF gradient shading patterns
          // For now, use first stop color as fallback
          const stops = (block.fillColor as { stops?: Array<{ color: string }> }).stops;
          colorStr = stops?.[0]?.color ?? '#cccccc';
        }
      }
      if (colorStr) {
        const rgb = this.parseColor(colorStr);
        pdf += `${rgb.r.toFixed(4)} ${rgb.g.toFixed(4)} ${rgb.b.toFixed(4)} rg\n`;
      }
    }

    // Set stroke color and width
    if (block.strokeColor && typeof block.strokeColor === 'string') {
      const rgb = this.parseColor(block.strokeColor);
      pdf += `${rgb.r.toFixed(4)} ${rgb.g.toFixed(4)} ${rgb.b.toFixed(4)} RG\n`;
    }
    if (block.strokeWidth) {
      pdf += `${toPt(block.strokeWidth).toFixed(2)} w\n`;
    }

    // Draw shape based on kind
    const shapeKind = block.shapeKind ?? 'rect';
    if (shapeKind === 'ellipse' || shapeKind === 'circle') {
      pdf += this.renderEllipse(0, 0, innerWidthPt, innerHeightPt);
    } else {
      // Default: rectangle
      pdf += `0 0 ${innerWidthPt.toFixed(2)} ${innerHeightPt.toFixed(2)} re\n`;
    }

    // Fill and/or stroke
    if (block.fillColor && block.strokeColor) {
      pdf += 'B\n'; // fill and stroke
    } else if (block.fillColor) {
      pdf += 'f\n'; // fill only
    } else if (block.strokeColor) {
      pdf += 'S\n'; // stroke only
    }

    return pdf;
  }

  /**
   * Renders a shape group drawing with positioned children.
   *
   * Applies group transform and renders each child shape.
   * For v1, renders children as simple rectangles.
   *
   * @param block - The shape group drawing block
   * @param fragment - The drawing fragment for positioning
   * @returns PDF command string
   */
  private renderShapeGroup(block: ShapeGroupDrawing, fragment: DrawingFragment): string {
    let pdf = '';

    // Apply group transform if present
    if (block.groupTransform) {
      pdf += this.applyGroupTransform(block.groupTransform, fragment.geometry);
    }

    // Render each child shape
    for (const child of block.shapes) {
      pdf += 'q\n'; // save state for child

      // Position child - safely extract properties from unknown child structure
      const childAttrs = (child as { attrs?: Record<string, unknown> }).attrs ?? {};
      const childX = typeof childAttrs.x === 'number' ? childAttrs.x : 0;
      const childY = typeof childAttrs.y === 'number' ? childAttrs.y : 0;
      const childXPt = toPt(childX);
      const childYPt = toPt(childY);
      pdf += `1 0 0 1 ${childXPt.toFixed(2)} ${childYPt.toFixed(2)} cm\n`;

      // For v1: Render children as simple rectangles
      const childWidth = typeof childAttrs.width === 'number' ? childAttrs.width : 10;
      const childHeight = typeof childAttrs.height === 'number' ? childAttrs.height : 10;
      const childWidthPt = toPt(childWidth);
      const childHeightPt = toPt(childHeight);

      // Apply child styling if available
      if (typeof childAttrs.fillColor === 'string') {
        const rgb = this.parseColor(childAttrs.fillColor);
        pdf += `${rgb.r.toFixed(4)} ${rgb.g.toFixed(4)} ${rgb.b.toFixed(4)} rg\n`;
      }
      if (typeof childAttrs.strokeColor === 'string') {
        const rgb = this.parseColor(childAttrs.strokeColor);
        pdf += `${rgb.r.toFixed(4)} ${rgb.g.toFixed(4)} ${rgb.b.toFixed(4)} RG\n`;
      }

      pdf += `0 0 ${childWidthPt.toFixed(2)} ${childHeightPt.toFixed(2)} re\n`;

      const hasFill = typeof childAttrs.fillColor === 'string';
      const hasStroke = typeof childAttrs.strokeColor === 'string';
      if (hasFill && hasStroke) {
        pdf += 'B\n';
      } else if (hasFill) {
        pdf += 'f\n';
      } else {
        pdf += 'S\n'; // stroke
      }

      pdf += 'Q\n'; // restore state
    }

    return pdf;
  }

  /**
   * Renders an image drawing by delegating to existing image rendering logic.
   *
   * @param block - The image drawing block
   * @param fragment - The drawing fragment for positioning
   * @returns PDF command string
   */
  private renderDrawingImage(block: ImageDrawing, fragment: DrawingFragment): string {
    // ImageDrawing wraps an ImageBlock - extract and use existing logic
    const imageId = this.imageResources.get(block.id)?.name;

    let pdf = '';
    const widthPt = toPt(fragment.width);
    const heightPt = toPt(fragment.height);

    if (imageId) {
      pdf += `${widthPt.toFixed(2)} 0 0 ${heightPt.toFixed(2)} 0 0 cm\n`;
      pdf += `/${imageId} Do\n`;
    } else {
      // Fallback: gray rectangle
      pdf += '0.9 0.9 0.9 rg\n';
      pdf += '0.75 0.75 0.75 RG\n';
      pdf += `0 0 ${widthPt.toFixed(2)} ${heightPt.toFixed(2)} re\n`;
      pdf += 'f\n';
    }

    return pdf;
  }

  /**
   * Applies drawing geometry transforms (rotation, flips) in PDF.
   *
   * Transforms are applied around the center of the shape.
   *
   * @param geometry - The drawing geometry with transform properties
   * @param widthPt - Width in points
   * @param heightPt - Height in points
   * @returns PDF transformation commands
   */
  private applyDrawingTransform(geometry: DrawingGeometry, widthPt: number, heightPt: number): string {
    let pdf = '';

    // Move to center for rotation
    const centerX = widthPt / 2;
    const centerY = heightPt / 2;
    pdf += `1 0 0 1 ${centerX.toFixed(2)} ${centerY.toFixed(2)} cm\n`;

    // Apply rotation
    if (geometry.rotation) {
      const rad = (geometry.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      pdf += `${cos.toFixed(6)} ${sin.toFixed(6)} ${(-sin).toFixed(6)} ${cos.toFixed(6)} 0 0 cm\n`;
    }

    // Apply flips
    const scaleX = geometry.flipH ? -1 : 1;
    const scaleY = geometry.flipV ? -1 : 1;
    if (scaleX !== 1 || scaleY !== 1) {
      pdf += `${scaleX} 0 0 ${scaleY} 0 0 cm\n`;
    }

    // Move back from center
    const innerWidthPt = toPt(geometry.width);
    const innerHeightPt = toPt(geometry.height);
    pdf += `1 0 0 1 ${(-innerWidthPt / 2).toFixed(2)} ${(-innerHeightPt / 2).toFixed(2)} cm\n`;

    return pdf;
  }

  /**
   * Applies group transform for shape groups.
   *
   * @param transform - The group transform specification
   * @param geometry - The drawing geometry
   * @returns PDF transformation commands
   */
  private applyGroupTransform(transform: Record<string, unknown>, geometry: DrawingGeometry): string {
    let pdf = '';

    // Apply offset translation - safely extract numeric values
    const offsetX = typeof transform.childX === 'number' ? transform.childX : 0;
    const offsetY = typeof transform.childY === 'number' ? transform.childY : 0;
    if (offsetX || offsetY) {
      const offsetXPt = toPt(-offsetX);
      const offsetYPt = toPt(-offsetY);
      pdf += `1 0 0 1 ${offsetXPt.toFixed(2)} ${offsetYPt.toFixed(2)} cm\n`;
    }

    // Apply scaling - safely extract numeric values with fallbacks
    const childWidth =
      typeof transform.childWidth === 'number'
        ? transform.childWidth
        : typeof transform.width === 'number'
          ? transform.width
          : (geometry.width ?? 1);
    const childHeight =
      typeof transform.childHeight === 'number'
        ? transform.childHeight
        : typeof transform.height === 'number'
          ? transform.height
          : (geometry.height ?? 1);
    const targetWidth = typeof transform.width === 'number' ? transform.width : (geometry.width ?? childWidth);
    const targetHeight = typeof transform.height === 'number' ? transform.height : (geometry.height ?? childHeight);
    const scaleX = childWidth ? targetWidth / childWidth : 1;
    const scaleY = childHeight ? targetHeight / childHeight : 1;
    if (scaleX !== 1 || scaleY !== 1) {
      pdf += `${scaleX.toFixed(6)} 0 0 ${scaleY.toFixed(6)} 0 0 cm\n`;
    }

    return pdf;
  }

  /**
   * Parses a color string to RGB triplet (0-1 range).
   *
   * Supports hex colors (#RRGGBB).
   *
   * @param color - Color string (hex format)
   * @returns RGB triplet with values 0-1
   */
  private parseColor(color: string): { r: number; g: number; b: number } {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
      const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
      const b = Number.parseInt(hex.slice(4, 6), 16) / 255;
      return { r, g, b };
    }
    // Fallback to black
    return { r: 0, g: 0, b: 0 };
  }

  /**
   * Renders an ellipse using cubic Bezier curves.
   *
   * Uses 4 Bezier curves to approximate a perfect ellipse.
   *
   * @param x - X coordinate (top-left)
   * @param y - Y coordinate (top-left)
   * @param widthPt - Width in points
   * @param heightPt - Height in points
   * @returns PDF path commands
   */
  private renderEllipse(x: number, y: number, widthPt: number, heightPt: number): string {
    // Ellipse approximation using 4 cubic bezier curves
    const rx = widthPt / 2;
    const ry = heightPt / 2;
    const cx = x + rx;
    const cy = y + ry;
    const k = 0.5522848; // magic constant for circle approximation

    let pdf = '';
    pdf += `${cx.toFixed(2)} ${(cy + ry).toFixed(2)} m\n`; // move to top
    pdf += `${(cx + rx * k).toFixed(2)} ${(cy + ry).toFixed(2)} ${(cx + rx).toFixed(2)} ${(cy + ry * k).toFixed(2)} ${(cx + rx).toFixed(2)} ${cy.toFixed(2)} c\n`; // right
    pdf += `${(cx + rx).toFixed(2)} ${(cy - ry * k).toFixed(2)} ${(cx + rx * k).toFixed(2)} ${(cy - ry).toFixed(2)} ${cx.toFixed(2)} ${(cy - ry).toFixed(2)} c\n`; // bottom
    pdf += `${(cx - rx * k).toFixed(2)} ${(cy - ry).toFixed(2)} ${(cx - rx).toFixed(2)} ${(cy - ry * k).toFixed(2)} ${(cx - rx).toFixed(2)} ${cy.toFixed(2)} c\n`; // left
    pdf += `${(cx - rx).toFixed(2)} ${(cy + ry * k).toFixed(2)} ${(cx - rx * k).toFixed(2)} ${(cy + ry).toFixed(2)} ${cx.toFixed(2)} ${(cy + ry).toFixed(2)} c\n`; // top
    pdf += 'h\n'; // close path

    return pdf;
  }

  private renderBorderBox(
    box: BorderBox,
    borders: ParagraphAttrs['borders'] | undefined,
    pageHeightPx: number,
  ): string {
    if (!borders) return '';

    const width = Math.max(0, box.width);
    const height = Math.max(0, box.height);
    const xEnd = box.x + width;
    const yEnd = box.y + height;

    const segments = [
      this.renderBorderSide(borders.top, { x1: box.x, y1: box.y, x2: xEnd, y2: box.y }, pageHeightPx),
      this.renderBorderSide(borders.right, { x1: xEnd, y1: box.y, x2: xEnd, y2: yEnd }, pageHeightPx),
      this.renderBorderSide(borders.bottom, { x1: box.x, y1: yEnd, x2: xEnd, y2: yEnd }, pageHeightPx),
      this.renderBorderSide(borders.left, { x1: box.x, y1: box.y, x2: box.x, y2: yEnd }, pageHeightPx),
    ].filter(Boolean) as string[];

    return segments.join('');
  }

  private renderBorderSide(
    border: ParagraphBorder | undefined,
    coords: BorderLineCoords,
    pageHeightPx: number,
  ): string {
    if (!border) return '';
    const style = resolveBorderStyle(border.style);
    if (!style) return '';

    const widthPx =
      typeof border.width === 'number' && Number.isFinite(border.width) ? Math.max(0, border.width) : undefined;
    if (widthPx === 0) {
      return '';
    }
    const strokeWidthPx = widthPx ?? 1;

    const commands: string[] = [];
    commands.push('q');
    commands.push(`${formatColor(border.color)} RG`);
    commands.push(`${toPt(strokeWidthPx).toFixed(2)} w`);
    const dashPattern = getDashPattern(style, strokeWidthPx);
    if (dashPattern) {
      commands.push(`[${dashPattern.map((value) => toPt(value).toFixed(2)).join(' ')}] 0 d`);
    } else {
      commands.push('[] 0 d');
    }
    commands.push(`${toPt(coords.x1).toFixed(2)} ${toPt(pageHeightPx - coords.y1).toFixed(2)} m`);
    commands.push(`${toPt(coords.x2).toFixed(2)} ${toPt(pageHeightPx - coords.y2).toFixed(2)} l`);
    commands.push('S');
    commands.push('Q');
    return commands.join('\n') + '\n';
  }

  private renderShadingRect(
    box: BorderBox,
    shading: ParagraphAttrs['shading'] | undefined,
    pageHeightPx: number,
  ): string {
    if (!shading?.fill) return '';
    const rgb = colorToRgbTriplet(shading.fill);
    if (!rgb) return '';

    const width = Math.max(0, box.width);
    const height = Math.max(0, box.height);
    if (width === 0 || height === 0) return '';

    const xPt = toPt(box.x);
    const yPt = toPt(pageHeightPx - box.y - height);
    const widthPt = toPt(width);
    const heightPt = toPt(height);

    const commands = [
      'q',
      `${rgb} rg`,
      `${xPt.toFixed(2)} ${yPt.toFixed(2)} ${widthPt.toFixed(2)} ${heightPt.toFixed(2)} re`,
      'f',
      'Q',
    ];
    return commands.join('\n') + '\n';
  }
}

type BorderStyle = Exclude<ParagraphBorder['style'], 'none' | undefined>;

const resolveBorderStyle = (style?: ParagraphBorder['style']): BorderStyle | undefined => {
  if (!style) return 'solid';
  if (style === 'none') return undefined;
  return style;
};

const getDashPattern = (style: BorderStyle, strokeWidthPx: number): number[] | null => {
  if (style === 'dashed') {
    const segment = Math.max(strokeWidthPx * 3, strokeWidthPx);
    return [segment, segment];
  }
  if (style === 'dotted') {
    const dot = Math.max(strokeWidthPx, 1);
    return [dot, dot * 1.5];
  }
  return null;
};

const toPt = (px: number) => px * PX_TO_PT;

const selectFont = (run: Run): FontKey => {
  if (run.kind === 'tab' || run.kind === 'image') return FONT_IDS.regular;
  if (run.bold && run.italic) return FONT_IDS.boldItalic;
  if (run.bold) return FONT_IDS.bold;
  if (run.italic) return FONT_IDS.italic;
  return FONT_IDS.regular;
};

const getCommentFillColor = (comments: TextRun['comments'] | undefined): string | undefined => {
  if (!comments || comments.length === 0) return undefined;
  const primary = comments[0];
  const base = primary.internal ? COMMENT_INTERNAL_COLOR : COMMENT_EXTERNAL_COLOR;
  return lightenHexColor(base, COMMENT_LIGHTEN_FACTOR);
};

const lightenHexColor = (hex: string, factor: number): string => {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return hex;
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  const r = Number.parseInt(cleaned.slice(0, 2), 16);
  const g = Number.parseInt(cleaned.slice(2, 4), 16);
  const b = Number.parseInt(cleaned.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return hex;

  const mix = (channel: number) => clamp(channel * factor + 255 * (1 - factor));
  return `#${mix(r).toString(16).padStart(2, '0').toUpperCase()}${mix(g)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()}${mix(b).toString(16).padStart(2, '0').toUpperCase()}`;
};

const formatColor = (value?: string) => colorToRgbTriplet(value) ?? '0 0 0';

const colorToRgbTriplet = (value?: string): string | undefined => {
  if (!value) return undefined;
  const hex = value.replace('#', '');
  if (hex.length !== 6) return undefined;

  const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(hex.slice(4, 6), 16) / 255;

  if ([r, g, b].some(Number.isNaN)) return undefined;
  return `${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)}`;
};

const escapePdfText = (text: string) => text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

// Map a subset of common Unicode punctuation to Windows-1252 (WinAnsi) codes used by Type1 fonts.
// Unknown characters fall back to '?'.
const unicodeToWinAnsi = (codePoint: number): number => {
  // ASCII
  if (codePoint >= 0x20 && codePoint <= 0x7e) return codePoint;
  // Non-breaking space
  if (codePoint === 0x00a0) return 0xa0;
  // Smart quotes / dashes / bullets / ellipsis
  switch (codePoint) {
    case 0x2018:
      return 0x91; // '
    case 0x2019:
      return 0x92; // '
    case 0x201c:
      return 0x93; // "
    case 0x201d:
      return 0x94; // "
    case 0x2013:
      return 0x96; // –
    case 0x2014:
      return 0x97; // —
    case 0x2022:
      return 0x95; // •
    case 0x2026:
      return 0x85; // …
    case 0x00b0:
      return 0xb0; // °
    default:
      return 0x3f; // '?'
  }
};

const toWinAnsiBytes = (text: string): Uint8Array => {
  const bytes: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    bytes.push(unicodeToWinAnsi(cp));
  }
  return new Uint8Array(bytes);
};

// Produce a PDF text operand for a string. Uses literal strings for ASCII; WinAnsi hex for non-ASCII.
const toPdfTextOperand = (text: string): string => {
  const isAscii = /^[\x20-\x7E]*$/.test(text);
  if (isAscii) {
    return `(${escapePdfText(text)}) Tj`;
  }
  const bytes = toWinAnsiBytes(text);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `<${hex}> Tj`;
};

const JPEG_SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

// Create a PDF image resource for JPEG or PNG (RGB/Gray via Flate predictor; RGBA via browser canvas to RGB + SMask)
async function createPdfImageResource(block: ImageBlock, name: string): Promise<PdfImageResource | null> {
  const parsed = parseDataUrl(block.src);
  if (!parsed) return null;

  if (/^image\/jpe?g$/i.test(parsed.mime)) {
    const dimensions = readJpegSize(parsed.data);
    if (!dimensions) return null;
    return {
      blockId: block.id,
      name,
      data: parsed.data,
      width: dimensions.width,
      height: dimensions.height,
      colorSpace: 'DeviceRGB',
      bitsPerComponent: 8,
      filter: 'DCTDecode',
    };
  }

  if (/^image\/png$/i.test(parsed.mime)) {
    const info = readPngInfo(parsed.data);
    if (!info) return null;

    // Only support 8-bit depth directly
    if (info.bitDepth !== 8) {
      return await createPngViaCanvas(block, name);
    }
    // Interlaced PNGs require full decode; use canvas path if available
    if (info.interlaceMethod !== 0) {
      return await createPngViaCanvas(block, name);
    }

    // Truecolor (RGB)
    if (info.colorType === 2 && info.idat) {
      return {
        blockId: block.id,
        name,
        data: info.idat,
        width: info.width,
        height: info.height,
        colorSpace: 'DeviceRGB',
        bitsPerComponent: 8,
        filter: 'FlateDecode',
        decodeParms: `<< /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns ${info.width} >>`,
      };
    }
    // Grayscale
    if (info.colorType === 0 && info.idat) {
      return {
        blockId: block.id,
        name,
        data: info.idat,
        width: info.width,
        height: info.height,
        colorSpace: 'DeviceGray',
        bitsPerComponent: 8,
        filter: 'FlateDecode',
        decodeParms: `<< /Predictor 15 /Colors 1 /BitsPerComponent 8 /Columns ${info.width} >>`,
      };
    }
    // RGBA or other complex types -> use canvas path if available
    return await createPngViaCanvas(block, name);
  }

  // Unsupported mime
  return null;
}

function parseDataUrl(value?: string): { mime: string; data: Uint8Array } | null {
  if (!value || !value.startsWith('data:')) {
    return null;
  }

  const match = value.match(/^data:(?<mime>[^;]+);base64,(?<data>[A-Za-z0-9+/=]+)$/);
  if (!match || !match.groups) {
    return null;
  }

  const mime = match.groups.mime;
  if (!/^image\/(?:jpe?g|png)$/i.test(mime)) {
    return null;
  }

  return { mime, data: decodeBase64(match.groups.data) };
}

// Minimal PNG reader for IHDR + concatenated IDAT. Returns null for invalid PNG.
function readPngInfo(bytes: Uint8Array): {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  interlaceMethod: number;
  idat: Uint8Array | null;
} | null {
  // PNG signature
  if (
    bytes.length < 33 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47 ||
    bytes[4] !== 0x0d ||
    bytes[5] !== 0x0a ||
    bytes[6] !== 0x1a ||
    bytes[7] !== 0x0a
  ) {
    return null;
  }

  let offset = 8; // after signature
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 2;
  let interlaceMethod = 0;
  const idatParts: Uint8Array[] = [];

  const readUInt32BE = (o: number) => (bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3];

  while (offset + 8 <= bytes.length) {
    const length = readUInt32BE(offset);
    const type0 = bytes[offset + 4];
    const type1 = bytes[offset + 5];
    const type2 = bytes[offset + 6];
    const type3 = bytes[offset + 7];
    const type = String.fromCharCode(type0, type1, type2, type3);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const crcEnd = dataEnd + 4;
    if (crcEnd > bytes.length) break;

    if (type === 'IHDR') {
      if (length !== 13) return null;
      width = readUInt32BE(dataStart);
      height = readUInt32BE(dataStart + 4);
      bitDepth = bytes[dataStart + 8];
      colorType = bytes[dataStart + 9];
      // compression method (expect 0), filter method (0)
      interlaceMethod = bytes[dataStart + 12];
    } else if (type === 'IDAT') {
      idatParts.push(bytes.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }

    offset = crcEnd;
  }

  const idat = idatParts.length ? concatBytes(...idatParts) : null;

  return { width, height, bitDepth, colorType, interlaceMethod, idat };
}

// Browser-only: decode PNG via canvas to RGB stream (+ optional SMask from alpha)
async function createPngViaCanvas(block: ImageBlock, name: string): Promise<PdfImageResource | null> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    // No browser canvas available
    return null;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'sync';
  const src = block.src;
  const loaded: Promise<HTMLImageElement> = new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode PNG'));
  });
  img.src = src;
  await loaded;

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Draw image; alpha preserved in imageData
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const srcData = imageData.data; // Uint8ClampedArray RGBA
  const rgb = new Uint8Array(w * h * 3);
  const alpha = new Uint8Array(w * h);
  let si = 0;
  let ri = 0;
  let ai = 0;
  const total = w * h;
  for (let i = 0; i < total; i += 1) {
    const r = srcData[si++];
    const g = srcData[si++];
    const b = srcData[si++];
    const a = srcData[si++];
    rgb[ri++] = r;
    rgb[ri++] = g;
    rgb[ri++] = b;
    alpha[ai++] = a;
  }

  return {
    blockId: block.id,
    name,
    data: rgb, // uncompressed RGB
    width: w,
    height: h,
    colorSpace: 'DeviceRGB',
    bitsPerComponent: 8,
    // no filter (raw)
    smask: {
      data: alpha,
      width: w,
      height: h,
      bitsPerComponent: 8,
    },
  };
}

function readJpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 7 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    offset += 2;

    if (marker === 0xd8 || marker === 0xd9) {
      continue;
    }

    const length = (bytes[offset] << 8) + bytes[offset + 1];
    if (offset + length > bytes.length) {
      break;
    }
    if (length <= 0) {
      break;
    }

    if (JPEG_SOF_MARKERS.has(marker)) {
      const height = (bytes[offset + 3] << 8) + bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) + bytes[offset + 6];
      return { width, height };
    }

    offset += length;
  }

  return null;
}

function decodeBase64(data: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  const bufferCtor = (
    globalThis as {
      Buffer?: {
        from: (value: string, encoding: string) => { buffer: ArrayBuffer; byteOffset: number; byteLength: number };
      };
    }
  ).Buffer;
  if (bufferCtor) {
    const buffer = bufferCtor.from(data, 'base64');
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }

  throw new Error('Base64 decoding is not supported in this environment');
}

type PdfDocumentOptions = {
  defaultPageSize: { w: number; h: number };
  pageData: Array<{ stream: string; size: { w: number; h: number } }>;
  images: PdfImageResource[];
};

const buildPdfDocument = ({ pageData, images }: Pick<PdfDocumentOptions, 'pageData' | 'images'>): Uint8Array => {
  const pageCount = pageData.length;
  const encoder = new TextEncoder();

  let nextObj = 1;
  const catalogNumber = nextObj++;
  const pagesNumber = nextObj++;
  const pageNumbers = pageData.map(() => nextObj++);
  const contentNumbers = pageData.map(() => nextObj++);
  const imageNumbers = images.map(() => nextObj++);
  const smaskNumbers = images.map((img) => (img.smask ? nextObj++ : 0));
  const fontNumbers = {
    regular: nextObj++,
    bold: nextObj++,
    italic: nextObj++,
    boldItalic: nextObj++,
  };

  const totalObjects = nextObj - 1;
  const objects: Uint8Array[] = new Array(totalObjects + 1);
  objects[0] = new Uint8Array(0);

  const encodeText = (value: string) => encoder.encode(value);

  objects[catalogNumber] = encodeText(`<< /Type /Catalog /Pages ${pagesNumber} 0 R >>`);
  objects[pagesNumber] = encodeText(
    `<< /Type /Pages /Kids [${pageNumbers.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageCount} >>`,
  );

  const fontResource = `/Font << /${FONT_IDS.regular} ${fontNumbers.regular} 0 R /${FONT_IDS.bold} ${fontNumbers.bold} 0 R /${FONT_IDS.italic} ${fontNumbers.italic} 0 R /${FONT_IDS.boldItalic} ${fontNumbers.boldItalic} 0 R >>`;
  const xObjectResource =
    imageNumbers.length > 0
      ? `/XObject << ${images.map((image, index) => `/${image.name} ${imageNumbers[index]} 0 R`).join(' ')} >>`
      : '';
  const resourceLine = `/Resources << ${fontResource}${xObjectResource ? ` ${xObjectResource}` : ''} >>`;

  pageNumbers.forEach((pageNumber, index) => {
    const contentNumber = contentNumbers[index];
    const pageSize = pageData[index].size;
    const widthPt = toPt(pageSize.w);
    const heightPt = toPt(pageSize.h);
    objects[pageNumber] = encodeText(
      [
        '<< /Type /Page',
        `/Parent ${pagesNumber} 0 R`,
        `/MediaBox [0 0 ${widthPt.toFixed(2)} ${heightPt.toFixed(2)}]`,
        `/Contents ${contentNumber} 0 R`,
        resourceLine,
        '>>',
      ].join('\n'),
    );
  });

  pageData.forEach(({ stream }, index) => {
    const streamBytes = encodeText(stream);
    const header = encodeText(`<< /Length ${streamBytes.length} >>\nstream\n`);
    const footer = encodeText('\nendstream');
    objects[contentNumbers[index]] = concatBytes(header, streamBytes, footer);
  });

  images.forEach((image, index) => {
    const lines: string[] = [
      '<< /Type /XObject',
      '/Subtype /Image',
      `/Width ${Math.max(1, Math.floor(image.width))}`,
      `/Height ${Math.max(1, Math.floor(image.height))}`,
      `/ColorSpace /${image.colorSpace}`,
      `/BitsPerComponent ${image.bitsPerComponent}`,
    ];
    if (smaskNumbers[index]) {
      lines.push(`/SMask ${smaskNumbers[index]} 0 R`);
    }
    if (image.filter) {
      lines.push(`/Filter /${image.filter}`);
    }
    if (image.decodeParms) {
      lines.push(`/DecodeParms ${image.decodeParms}`);
    }
    lines.push(`/Length ${image.data.length}`);
    lines.push('>>\nstream\n');
    const dict = lines.join('\n');
    const footer = '\nendstream';
    objects[imageNumbers[index]] = concatBytes(encodeText(dict), image.data, encodeText(footer));

    // Optional SMask object for alpha channel
    const sm = image.smask;
    if (sm && smaskNumbers[index]) {
      const smLines: string[] = [
        '<< /Type /XObject',
        '/Subtype /Image',
        `/Width ${Math.max(1, Math.floor(sm.width))}`,
        `/Height ${Math.max(1, Math.floor(sm.height))}`,
        '/ColorSpace /DeviceGray',
        `/BitsPerComponent ${sm.bitsPerComponent}`,
        '/Decode [0 1]',
      ];
      if (sm.filter) smLines.push(`/Filter /${sm.filter}`);
      if (sm.decodeParms) smLines.push(`/DecodeParms ${sm.decodeParms}`);
      smLines.push(`/Length ${sm.data.length}`);
      smLines.push('>>\nstream\n');
      const smDict = smLines.join('\n');
      const smFooter = '\nendstream';
      objects[smaskNumbers[index]] = concatBytes(encodeText(smDict), sm.data, encodeText(smFooter));
    }
  });

  objects[fontNumbers.regular] = encodeText(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  );
  objects[fontNumbers.bold] = encodeText(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  );
  objects[fontNumbers.italic] = encodeText(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>',
  );
  objects[fontNumbers.boldItalic] = encodeText(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique /Encoding /WinAnsiEncoding >>',
  );

  return assemblePdf(objects, catalogNumber, encoder);
};

const assemblePdf = (objects: Uint8Array[], catalogNumber: number, encoder: TextEncoder): Uint8Array => {
  let totalLength = 0;
  const chunks: Uint8Array[] = [];
  const pushChunk = (chunk: Uint8Array) => {
    chunks.push(chunk);
    totalLength += chunk.length;
  };
  const offsets = new Array<number>(objects.length).fill(0);

  pushChunk(encoder.encode('%PDF-1.4\n'));

  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = totalLength;
    pushChunk(encoder.encode(`${i} 0 obj\n`));
    pushChunk(objects[i]);
    pushChunk(encoder.encode('\nendobj\n'));
  }

  const xrefOffset = totalLength;
  pushChunk(encoder.encode('xref\n'));
  pushChunk(encoder.encode(`0 ${objects.length}\n`));
  pushChunk(encoder.encode('0000000000 65535 f \n'));

  for (let i = 1; i < objects.length; i += 1) {
    pushChunk(encoder.encode(`${offsets[i].toString().padStart(10, '0')} 00000 n \n`));
  }

  pushChunk(encoder.encode(`trailer << /Size ${objects.length} /Root ${catalogNumber} 0 R >>\n`));
  pushChunk(encoder.encode(`startxref\n${xrefOffset}\n%%EOF`));

  const result = new Uint8Array(totalLength);
  let cursor = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, cursor);
    cursor += chunk.length;
  });
  return result;
};

const calculateLineIndentOffset = (indent: ParagraphAttrs['indent'], lineIndex: number): number => {
  if (!indent) return 0;
  const firstLine = indent.firstLine ?? 0;
  const hanging = indent.hanging ?? 0;
  if (lineIndex === 0) {
    return firstLine - hanging;
  }
  return -hanging;
};

const calculateAlignmentOffset = (
  attrs: ParagraphAttrs | undefined,
  availableWidth: number,
  lineWidth: number,
): number => {
  if (!attrs?.alignment) return 0;
  const slack = availableWidth - lineWidth;
  if (slack <= 0) return 0;
  switch (attrs.alignment) {
    case 'center':
      return slack / 2;
    case 'right':
      return slack;
    default:
      return 0;
  }
};

/**
 * Extracts text content from all runs within a line for justification calculations.
 *
 * @param block - The paragraph block containing the runs
 * @param line - The line definition with run and character boundaries
 * @returns Array of text slices from the line, used to count spaces for justification
 */
const gatherTextSlicesForLine = (block: ParagraphBlock, line: Line): string[] => {
  const slices: string[] = [];
  const startRun = line.fromRun ?? 0;
  const endRun = line.toRun ?? startRun;
  for (let runIndex = startRun; runIndex <= endRun; runIndex += 1) {
    const run = block.runs[runIndex];
    if (!run || (run.kind !== 'text' && run.kind !== undefined) || !('text' in run) || !run.text) continue;
    const isFirst = runIndex === startRun;
    const isLast = runIndex === endRun;
    const start = isFirst ? (line.fromChar ?? 0) : 0;
    const end = isLast ? (line.toChar ?? run.text.length) : run.text.length;
    if (start >= end) continue;
    const slice = run.text.slice(start, end);
    if (slice) slices.push(slice);
  }
  return slices;
};

const sanitizePositive = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;

const concatBytes = (...buffers: Uint8Array[]): Uint8Array => {
  const total = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  buffers.forEach((buffer) => {
    result.set(buffer, offset);
    offset += buffer.length;
  });
  return result;
};

const getPrimaryRun = (paragraph: ParagraphBlock): Run => {
  return (
    paragraph.runs.find((run) => run.kind === 'text' && Boolean(run.fontFamily && run.fontSize)) || {
      text: '',
      fontFamily: 'Arial',
      fontSize: 16,
    }
  );
};
