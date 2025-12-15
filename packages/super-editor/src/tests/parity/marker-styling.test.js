import { beforeAll, describe, expect, it } from 'vitest';
import { initTestEditor, loadTestDataForEditorTests } from '@tests/helpers/helpers.js';
import { computeParagraphReferenceSnapshot } from '@tests/helpers/paragraphReference.js';
import { computeParagraphAttrs } from '@superdoc/pm-adapter/attributes/paragraph.js';
import {
  buildStyleContextFromEditor,
  buildConverterContextFromEditor,
  createListCounterContext,
} from '../helpers/adapterTestHelpers.js';

const findParagraphAt = (doc, predicate) => {
  let match = null;
  doc.descendants((node, pos) => {
    if (node.type.name !== 'paragraph') return;
    if (predicate(node)) {
      match = { node, pos };
      return false;
    }
  });
  return match;
};

describe('marker styling parity', () => {
  let listDocx;

  beforeAll(async () => {
    const list = await loadTestDataForEditorTests('basic-list.docx');
    listDocx = list;
  });

  it('compares marker text between reference and wordLayout', () => {
    const { editor } = initTestEditor({
      content: listDocx.docx,
      media: listDocx.media,
      mediaFiles: listDocx.mediaFiles,
      fonts: listDocx.fonts,
    });

    const match = findParagraphAt(editor.state.doc, (node) => Boolean(node.attrs?.listRendering));
    expect(match).toBeTruthy();

    // Get reference snapshot from NodeView
    const reference = computeParagraphReferenceSnapshot(editor, match.node, match.pos);
    expect(reference.list).not.toBeNull();

    // Get adapter attrs with wordLayout
    const styleContext = buildStyleContextFromEditor(editor);
    const converterContext = buildConverterContextFromEditor(editor);
    const listCounterContext = createListCounterContext();
    const adapterAttrs = computeParagraphAttrs(match.node, styleContext, listCounterContext, converterContext);

    expect(adapterAttrs?.wordLayout).toBeDefined();
    expect(adapterAttrs?.wordLayout?.marker).toBeDefined();

    // Compare marker text
    if (reference.list.markerText) {
      expect(adapterAttrs.wordLayout.marker.markerText).toBe(reference.list.markerText);
    }

    editor.destroy();
  });

  it('compares marker justification between reference and wordLayout', () => {
    const { editor } = initTestEditor({
      content: listDocx.docx,
      media: listDocx.media,
      mediaFiles: listDocx.mediaFiles,
      fonts: listDocx.fonts,
    });

    const match = findParagraphAt(editor.state.doc, (node) => Boolean(node.attrs?.listRendering));
    expect(match).toBeTruthy();

    const reference = computeParagraphReferenceSnapshot(editor, match.node, match.pos);
    const styleContext = buildStyleContextFromEditor(editor);
    const converterContext = buildConverterContextFromEditor(editor);
    const listCounterContext = createListCounterContext();
    const adapterAttrs = computeParagraphAttrs(match.node, styleContext, listCounterContext, converterContext);

    // Compare justification
    if (reference.list?.justification) {
      expect(adapterAttrs?.wordLayout?.marker?.justification).toBe(reference.list.justification);
    }

    editor.destroy();
  });

  it('compares marker suffix between reference and wordLayout', () => {
    const { editor } = initTestEditor({
      content: listDocx.docx,
      media: listDocx.media,
      mediaFiles: listDocx.mediaFiles,
      fonts: listDocx.fonts,
    });

    const match = findParagraphAt(editor.state.doc, (node) => Boolean(node.attrs?.listRendering));
    expect(match).toBeTruthy();

    const reference = computeParagraphReferenceSnapshot(editor, match.node, match.pos);
    const styleContext = buildStyleContextFromEditor(editor);
    const converterContext = buildConverterContextFromEditor(editor);
    const listCounterContext = createListCounterContext();
    const adapterAttrs = computeParagraphAttrs(match.node, styleContext, listCounterContext, converterContext);

    // Compare suffix
    if (reference.list?.suffix) {
      expect(adapterAttrs?.wordLayout?.marker?.suffix).toBe(reference.list.suffix);
    }

    editor.destroy();
  });

  it('compares marker run styling (colors, bold, italic, etc)', () => {
    const { editor } = initTestEditor({
      content: listDocx.docx,
      media: listDocx.media,
      mediaFiles: listDocx.mediaFiles,
      fonts: listDocx.fonts,
    });

    const match = findParagraphAt(editor.state.doc, (node) => Boolean(node.attrs?.listRendering));
    expect(match).toBeTruthy();

    const reference = computeParagraphReferenceSnapshot(editor, match.node, match.pos);
    const styleContext = buildStyleContextFromEditor(editor);
    const converterContext = buildConverterContextFromEditor(editor);
    const listCounterContext = createListCounterContext();
    const adapterAttrs = computeParagraphAttrs(match.node, styleContext, listCounterContext, converterContext);

    // Compare run properties
    const referenceRun = reference.list?.markerRunProps;
    const wordLayoutRun = adapterAttrs?.wordLayout?.marker?.run;

    if (referenceRun && wordLayoutRun) {
      if (referenceRun.color) {
        expect(wordLayoutRun.color).toBe(referenceRun.color);
      }
      if (referenceRun.fontFamily) {
        expect(wordLayoutRun.fontFamily).toBeDefined();
      }
      if (referenceRun.size != null) {
        expect(typeof wordLayoutRun.fontSize).toBe('number');
      }
      if (referenceRun.bold !== undefined) {
        expect(wordLayoutRun.bold).toBe(referenceRun.bold);
      }
      if (referenceRun.italic !== undefined) {
        expect(wordLayoutRun.italic).toBe(referenceRun.italic);
      }
      if (referenceRun.letterSpacing !== undefined) {
        expect(wordLayoutRun.letterSpacing).toBe(referenceRun.letterSpacing);
      }
    }

    editor.destroy();
  });

  it('compares marker CSS styling between reference and wordLayout', () => {
    const { editor } = initTestEditor({
      content: listDocx.docx,
      media: listDocx.media,
      mediaFiles: listDocx.mediaFiles,
      fonts: listDocx.fonts,
    });

    const match = findParagraphAt(editor.state.doc, (node) => Boolean(node.attrs?.listRendering));
    expect(match).toBeTruthy();

    const reference = computeParagraphReferenceSnapshot(editor, match.node, match.pos);
    const styleContext = buildStyleContextFromEditor(editor);
    const converterContext = buildConverterContextFromEditor(editor);
    const listCounterContext = createListCounterContext();
    const adapterAttrs = computeParagraphAttrs(match.node, styleContext, listCounterContext, converterContext);

    // The reference has markerCss from encodeCSSFromRPr
    // The wordLayout.marker.run should have equivalent styling properties
    const referenceCss = reference.list?.markerCss;
    const wordLayoutRun = adapterAttrs?.wordLayout?.marker?.run;

    if (referenceCss && wordLayoutRun) {
      if (referenceCss.fontFamily) {
        expect(wordLayoutRun.fontFamily).toBe(referenceCss.fontFamily);
      }
      if (referenceCss.fontSize) {
        expect(wordLayoutRun.fontSize).toBe(referenceCss.fontSize);
      }
      if (referenceCss.color) {
        expect(wordLayoutRun.color).toBe(referenceCss.color);
      }
    }

    editor.destroy();
  });

  it('handles missing numberingProperties by still producing a marker run', () => {
    const mockListPara = {
      type: { name: 'paragraph' },
      attrs: {
        listRendering: { markerText: '1.', justification: 'right', suffix: 'tab' },
        paragraphProperties: {},
      },
    };

    const styleContext = {
      styles: {},
      defaults: { defaultTabIntervalTwips: 720, decimalSeparator: '.' },
    };

    const adapterAttrs = computeParagraphAttrs(mockListPara, styleContext, createListCounterContext());

    // When listRendering is present, wordLayout should be computed even without numberingProperties
    expect(adapterAttrs?.wordLayout).toBeDefined();
    expect(adapterAttrs?.wordLayout?.marker?.markerText).toBe('1.');
  });
});
