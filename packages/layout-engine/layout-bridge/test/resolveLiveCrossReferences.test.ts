import { describe, expect, it } from 'vitest';
import type { FlowBlock, Layout, ParagraphBlock, TextRun } from '@superdoc/contracts';
import {
  buildPageStyleReferenceResolver,
  isLiveCrossReferenceFieldCloneOf,
  resolveLiveCrossReferences,
} from '../src/resolveLiveCrossReferences';
import { incrementalLayout, measureCache } from '../src/incrementalLayout';
import { createCanonicalPaginationSourceReader } from '@superdoc/layout-engine/internal-source-preparation';

const textRun = (text: string, extra: Partial<TextRun> = {}): TextRun => ({
  kind: 'text',
  text,
  fontFamily: 'Arial',
  fontSize: 16,
  ...extra,
});

const paragraph = (id: string, runs: TextRun[], styleId?: string): ParagraphBlock => ({
  kind: 'paragraph',
  id,
  runs,
  ...(styleId ? { attrs: { styleId } } : {}),
});

describe('resolveLiveCrossReferences', () => {
  const referenceFixture = (cachedText: string) => [
    paragraph('field', [
      textRun(cachedText, {
        crossReferenceMetadata: {
          kind: 'ref',
          instruction: 'REF Target',
          target: 'Target',
        },
      }),
    ]),
    paragraph('target', [
      textRun('', {
        dataAttrs: { 'data-bookmark-marker': 'start', 'data-bookmark-id': '7', 'data-bookmark-name': 'Target' },
      }),
      textRun('Current target'),
      textRun('', { dataAttrs: { 'data-bookmark-marker': 'end', 'data-bookmark-id': '7' } }),
    ]),
  ];
  const referenceOptions = { pageSize: { w: 300, h: 400 }, margins: { top: 10, right: 10, bottom: 10, left: 10 } };
  const referenceMeasure = async (block: FlowBlock) => {
    if (block.kind !== 'paragraph') throw new Error('Expected paragraph');
    return {
      kind: 'paragraph' as const,
      totalHeight: 12,
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: block.runs.length - 1,
          toChar: (block.runs.at(-1) as TextRun).text.length,
          width: 100,
          ascent: 10,
          descent: 2,
          lineHeight: 12,
        },
      ],
    };
  };

  it('retains the canonical source vector when resolving live REF changes no current result text', async () => {
    measureCache.clear();
    const source = referenceFixture('Current target');
    const result = await incrementalLayout([], null, source, referenceOptions, referenceMeasure);
    expect(result.blocks, 'Unchanged live fields must preserve the source preparation owner').toBe(source);
    expect(result.blocks).toEqual(source);
  });

  it.each(['Current target', 'stale'])(
    'keeps current coordinates when the owned text view contains %s field text',
    async (cachedText) => {
      measureCache.clear();
      const textSource = referenceFixture(cachedText);
      const source = textSource.map((block) => ({
        ...block,
        runs: block.runs.map((run, i) => ({ ...run, pmStart: 100 + i, pmEnd: 101 + i })),
      }));
      const owner = createCanonicalPaginationSourceReader(
        () => null,
        (candidate) => candidate === source,
        () => textSource,
      );
      const result = await incrementalLayout(
        [],
        null,
        source,
        referenceOptions,
        Object.assign((block: FlowBlock) => referenceMeasure(block), { paginationSourceOwner: owner }),
      );
      expect((result.blocks[0] as ParagraphBlock).runs[0]).toMatchObject({
        text: 'Current target',
        pmStart: 100,
        pmEnd: 101,
      });
      expect(source[0]!.runs[0]!.text).toBe(cachedText);
      expect(textSource[0]!.runs[0]!.text).toBe(cachedText);
      if (cachedText === 'Current target') expect(result.blocks).toBe(source);
    },
  );

  it('resolves stale current REF caches even when they agree with the previous computed plane', async () => {
    measureCache.clear();
    const previous = await incrementalLayout([], null, referenceFixture('stale'), referenceOptions, referenceMeasure);
    const source = referenceFixture('stale');
    Object.freeze(source[0]!.runs[0]);
    const result = await incrementalLayout(
      previous.blocks,
      previous.layout,
      source,
      referenceOptions,
      referenceMeasure,
      undefined,
      previous.measures,
    );
    expect((result.blocks[0] as ParagraphBlock).runs[0]!.text).toBe('Current target');
    expect(result.blocks).not.toBe(source);
    expect(source[0]!.runs[0]!.text).toBe('stale');
    expect(isLiveCrossReferenceFieldCloneOf(result.blocks[0], source[0]!)).toBe(true);
    expect(isLiveCrossReferenceFieldCloneOf(result.blocks[0], { ...source[0]! })).toBe(false);
  });

  it('re-evaluates REF content from current bookmark text and reports a deleted target truthfully', () => {
    const metadata = {
      kind: 'ref' as const,
      instruction: 'REF Target \\h',
      target: 'Target',
    };
    const field = paragraph('field', [textRun('stale', { crossReferenceMetadata: metadata })]);
    const target = paragraph('target', [
      textRun('', {
        dataAttrs: {
          'data-bookmark-marker': 'start',
          'data-bookmark-id': '7',
          'data-bookmark-name': 'Target',
        },
      }),
      textRun('Current target'),
      textRun('', {
        dataAttrs: {
          'data-bookmark-marker': 'end',
          'data-bookmark-id': '7',
        },
      }),
    ]);

    resolveLiveCrossReferences([field, target]);
    expect(field.runs[0]?.text).toBe('Current target');

    resolveLiveCrossReferences([field]);
    expect(field.runs[0]?.text).toBe('Error! Reference source not found.');
  });

  it('projects the full contextual paragraph number for a REF \\w field', () => {
    const outer = paragraph('outer', [textRun('Definitions')]);
    outer.attrs = {
      numberingProperties: { numId: 10, ilvl: 0 },
      wordLayout: {
        marker: {
          markerText: '2.',
          run: { fontFamily: 'Arial', fontSize: 16 },
        },
      },
    };
    const section = paragraph('section', [textRun('Descendants')]);
    section.attrs = {
      numberingProperties: { numId: 10, ilvl: 1 },
      wordLayout: {
        marker: {
          markerText: '(s)',
          run: { fontFamily: 'Arial', fontSize: 16 },
        },
      },
    };
    const field = paragraph('field', [
      textRun('', {
        crossReferenceMetadata: {
          kind: 'ref',
          instruction: 'REF Target \\w \\h',
          target: 'Target',
        },
      }),
    ]);
    field.attrs = {
      numberingProperties: { numId: 10, ilvl: 2 },
      wordLayout: {
        marker: {
          markerText: '(3)',
          run: { fontFamily: 'Arial', fontSize: 16 },
        },
      },
    };
    const target = paragraph('target', [
      textRun('', {
        dataAttrs: {
          'data-bookmark-marker': 'start',
          'data-bookmark-id': '7',
          'data-bookmark-name': 'Target',
        },
      }),
      textRun('', {
        dataAttrs: {
          'data-bookmark-marker': 'end',
          'data-bookmark-id': '7',
        },
      }),
      textRun('Target paragraph'),
    ]);
    target.attrs = {
      wordLayout: {
        marker: {
          markerText: '(4)',
          run: { fontFamily: 'Arial', fontSize: 16 },
        },
      },
      numberingProperties: { numId: 10, ilvl: 2 },
    };

    resolveLiveCrossReferences([outer, section, field, target]);

    expect(field.runs[0]?.text).toBe('2.(s)(4)');
  });

  it('re-evaluates NOTEREF from a Word bookmark around the current note-reference marker', () => {
    const field = paragraph('field', [
      textRun('3', {
        crossReferenceMetadata: {
          kind: 'noteRef',
          instruction: 'NOTEREF NoteTarget \\h',
          target: 'NoteTarget',
        },
      }),
    ]);
    const markerOwner = paragraph('marker-owner', [
      textRun('', {
        dataAttrs: {
          'data-bookmark-marker': 'start',
          'data-bookmark-id': '12',
          'data-bookmark-name': 'NoteTarget',
        },
      }),
      textRun('4', { dataAttrs: { 'data-v2-note-ref': 'footnote:note-7' } }),
      textRun('', {
        dataAttrs: {
          'data-bookmark-marker': 'end',
          'data-bookmark-id': '12',
        },
      }),
    ]);

    resolveLiveCrossReferences([field, markerOwner]);
    expect(field.runs[0]?.text).toBe('4');
  });

  it('does not resolve NOTEREF when the body note-reference marker is not bookmarked', () => {
    const field = paragraph('field', [
      textRun('3', {
        crossReferenceMetadata: {
          kind: 'noteRef',
          instruction: 'NOTEREF NoteTarget \\h',
          target: 'NoteTarget',
        },
      }),
    ]);
    const markerOwner = paragraph('marker-owner', [
      textRun('4', { dataAttrs: { 'data-v2-note-ref': 'footnote:note-7' } }),
    ]);
    resolveLiveCrossReferences([field, markerOwner]);
    expect(field.runs[0]?.text).toBe('Error! Reference source not found.');
  });

  it('re-evaluates body STYLEREF using the nearest matching paragraph in the requested direction', () => {
    const before = paragraph('before', [textRun('Earlier heading')], 'Heading1');
    const defaultField = paragraph('default-field', [
      textRun('stale', {
        crossReferenceMetadata: {
          kind: 'styleRef',
          instruction: 'STYLEREF "Heading 1"',
          target: 'Heading 1',
        },
      }),
    ]);
    const lowerField = paragraph('lower-field', [
      textRun('stale', {
        crossReferenceMetadata: {
          kind: 'styleRef',
          instruction: 'STYLEREF "Heading 1" \\l',
          target: 'Heading 1',
          preferFollowing: true,
        },
      }),
    ]);
    const after = paragraph('after', [textRun('Later heading')], 'Heading1');
    const blocks: FlowBlock[] = [before, defaultField, lowerField, after];

    resolveLiveCrossReferences(blocks);

    expect(defaultField.runs[0]?.text).toBe('Earlier heading');
    expect(lowerField.runs[0]?.text).toBe('Later heading');
  });

  it('preserves cached multi-paragraph REF results until paragraph-structure projection is available', () => {
    const metadata = {
      kind: 'ref' as const,
      instruction: 'REF MultiParagraph',
      target: 'MultiParagraph',
    };
    const first = paragraph('field-1', [textRun('First cached', { crossReferenceMetadata: metadata })]);
    const second = paragraph('field-2', [textRun('Second cached', { crossReferenceMetadata: metadata })]);
    const target = paragraph('target', [
      textRun('', {
        dataAttrs: {
          'data-bookmark-marker': 'start',
          'data-bookmark-id': '9',
          'data-bookmark-name': 'MultiParagraph',
        },
      }),
      textRun('Current target'),
      textRun('', { dataAttrs: { 'data-bookmark-marker': 'end', 'data-bookmark-id': '9' } }),
    ]);

    resolveLiveCrossReferences([first, second, target]);

    expect(first.runs[0]?.text).toBe('First cached');
    expect(second.runs[0]?.text).toBe('Second cached');
  });
});

describe('buildPageStyleReferenceResolver', () => {
  it('selects the first or last matching styled paragraph on each physical page', () => {
    const blocks: FlowBlock[] = [
      paragraph('heading-1', [textRun('Page one')], 'Heading1'),
      paragraph('body', [textRun('Body')]),
      paragraph('heading-2a', [textRun('Page two first')], 'Heading1'),
      paragraph('heading-2b', [textRun('Page two last')], 'Heading1'),
    ];
    const layout = {
      pages: [
        {
          fragments: [
            { kind: 'para', blockId: 'heading-1' },
            { kind: 'para', blockId: 'body' },
          ],
        },
        {
          fragments: [
            { kind: 'para', blockId: 'heading-2a' },
            { kind: 'para', blockId: 'heading-2b' },
          ],
        },
      ],
    } as Layout;
    const resolve = buildPageStyleReferenceResolver(blocks, layout);

    expect(resolve({ pageNumber: 2, styleName: 'Heading 1', preferFollowing: false })).toBe('Page two first');
    expect(resolve({ pageNumber: 2, styleName: 'Heading 1', preferFollowing: true })).toBe('Page two last');
  });
});
