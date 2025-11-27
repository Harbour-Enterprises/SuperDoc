import type { ParagraphBlock, ParagraphMeasure, Line, Run, TextRun } from '@superdoc/contracts';

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

function getCtx(): CanvasRenderingContext2D | null {
  if (ctx) return ctx;
  if (typeof document === 'undefined') return null;
  canvas = document.createElement('canvas');
  ctx = canvas.getContext('2d');
  return ctx;
}

function isTextRun(run: Run): run is TextRun {
  return run.kind === 'tab' ? false : true;
}

function fontString(run: Run): string {
  const textRun = isTextRun(run) ? run : null;
  const size = textRun?.fontSize ?? 16;
  const family = textRun?.fontFamily ?? 'Arial';
  const italic = textRun?.italic ? 'italic ' : '';
  const bold = textRun?.bold ? 'bold ' : '';
  return `${italic}${bold}${size}px ${family}`.trim();
}

function runText(run: Run): string {
  return run.kind === 'image' ? '' : (run.text ?? '');
}

function measureRunSliceWidth(run: Run, fromChar: number, toChar: number): number {
  const context = getCtx();
  const text = runText(run).slice(fromChar, toChar);
  if (!context) {
    // Fallback: simple proportional width (approximate)
    const textRun = isTextRun(run) ? run : null;
    const size = textRun?.fontSize ?? 16;
    return Math.max(1, text.length * (size * 0.6));
  }
  context.font = fontString(run);
  const metrics = context.measureText(text);
  return metrics.width;
}

function lineHeightForRuns(runs: Run[], fromRun: number, toRun: number): number {
  let maxSize = 0;
  for (let i = fromRun; i <= toRun; i += 1) {
    const run = runs[i];
    const textRun = run && isTextRun(run) ? run : null;
    const size = textRun?.fontSize ?? 16;
    if (size > maxSize) maxSize = size;
  }
  return maxSize * 1.2;
}

export function remeasureParagraph(block: ParagraphBlock, maxWidth: number): ParagraphMeasure {
  const runs = block.runs ?? [];
  const lines: Line[] = [];

  let currentRun = 0;
  let currentChar = 0;

  while (currentRun < runs.length) {
    const startRun = currentRun;
    const startChar = currentChar;
    let width = 0;
    let lastBreakRun = -1;
    let lastBreakChar = -1;
    let endRun = currentRun;
    let endChar = currentChar;

    for (let r = currentRun; r < runs.length; r += 1) {
      const run = runs[r];
      const text = runText(run);
      const start = r === currentRun ? currentChar : 0;
      for (let c = start; c < text.length; c += 1) {
        const w = measureRunSliceWidth(run, c, c + 1);
        if (width + w > maxWidth && width > 0) {
          // Break line
          if (lastBreakRun >= 0) {
            endRun = lastBreakRun;
            endChar = lastBreakChar;
          } else {
            endRun = r;
            endChar = c;
          }
          break;
        }
        width += w;
        endRun = r;
        endChar = c + 1;
        const ch = text[c];
        if (ch === ' ' || ch === '\t' || ch === '-') {
          lastBreakRun = r;
          lastBreakChar = c + 1;
        }
      }
      if (endRun !== r || (endRun === r && (r === lastBreakRun ? endChar === lastBreakChar : false))) {
        // broke in this run
        break;
      }
    }

    // If we didn't consume any chars (e.g., very long single char), force one char
    if (startRun === endRun && startChar === endChar) {
      endRun = startRun;
      endChar = startChar + 1;
    }

    const line: Line = {
      fromRun: startRun,
      fromChar: startChar,
      toRun: endRun,
      toChar: endChar,
      width,
      ascent: 0,
      descent: 0,
      lineHeight: lineHeightForRuns(runs, startRun, endRun),
    };
    lines.push(line);

    // Advance to next line start
    currentRun = endRun;
    currentChar = endChar;
    if (currentChar >= runText(runs[currentRun]).length) {
      currentRun += 1;
      currentChar = 0;
    }
  }

  const totalHeight = lines.reduce((s, l) => s + l.lineHeight, 0);
  return { kind: 'paragraph', lines, totalHeight };
}
