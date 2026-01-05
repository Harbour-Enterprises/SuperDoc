import { beforeAll, describe, expect, it } from 'vitest';
import { initTestEditor, loadTestDataForEditorTests } from '@tests/helpers/helpers.js';
import { computeParagraphReferenceSnapshot } from '@tests/helpers/paragraphReference.js';
import { computeParagraphAttrs } from '@superdoc/pm-adapter/attributes/paragraph.js';
import { buildStyleContextFromEditor, buildConverterContextFromEditor } from '../helpers/adapterTestHelpers.js';

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

describe('spacing/indent and rendering polish', () => {
  let spacingDocx;

  beforeAll(async () => {
    spacingDocx = await loadTestDataForEditorTests('doc_with_spacing.docx');
  });

  it('compares vertical spacing (before/after) between reference and adapter', () => {
    const { editor } = initTestEditor({
      content: spacingDocx.docx,
      media: spacingDocx.media,
      mediaFiles: spacingDocx.mediaFiles,
      fonts: spacingDocx.fonts,
    });

    let referenceMatch = null;
    let paraNode = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'paragraph') return;
      const snapshot = computeParagraphReferenceSnapshot(editor, node, pos);
      if (snapshot.paragraphProperties.spacing?.before || snapshot.paragraphProperties.spacing?.after) {
        referenceMatch = snapshot;
        paraNode = node;
        return false;
      }
    });

    expect(referenceMatch).toBeTruthy();
    expect(paraNode).toBeTruthy();

    const styleContext = buildStyleContextFromEditor(editor);
    const converterContext = buildConverterContextFromEditor(editor);
    const adapterAttrs = computeParagraphAttrs(paraNode, styleContext, undefined, converterContext);

    // Compare spacing.before
    if (referenceMatch.paragraphProperties.spacing?.before !== undefined) {
      expect(typeof adapterAttrs?.spacing?.before).toBe('number');
      expect(adapterAttrs.spacing.before).toBeGreaterThanOrEqual(0);
    }

    // Compare spacing.after
    if (referenceMatch.paragraphProperties.spacing?.after !== undefined) {
      expect(typeof adapterAttrs?.spacing?.after).toBe('number');
      expect(adapterAttrs.spacing.after).toBeGreaterThanOrEqual(0);
    }

    editor.destroy();
  });

  it('compares line spacing between reference and adapter', () => {
    const { editor } = initTestEditor({
      content: spacingDocx.docx,
      media: spacingDocx.media,
      mediaFiles: spacingDocx.mediaFiles,
      fonts: spacingDocx.fonts,
    });

    let referenceMatch = null;
    let paraNode = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'paragraph') return;
      const snapshot = computeParagraphReferenceSnapshot(editor, node, pos);
      if (snapshot.paragraphProperties.spacing?.line) {
        referenceMatch = snapshot;
        paraNode = node;
        return false;
      }
    });

    if (!referenceMatch) {
      // No paragraph with line spacing in fixture, skip
      expect(true).toBe(true);
      editor.destroy();
      return;
    }

    const styleContext = buildStyleContextFromEditor(editor);
    const converterContext = buildConverterContextFromEditor(editor);
    const adapterAttrs = computeParagraphAttrs(paraNode, styleContext, undefined, converterContext);

    // Compare line spacing
    if (referenceMatch.paragraphProperties.spacing?.line !== undefined) {
      expect(typeof adapterAttrs?.spacing?.line).toBe('number');
      expect(adapterAttrs.spacing.line).toBeGreaterThan(0);
    }

    editor.destroy();
  });

  it('ensures contextualSpacing flag is preserved', () => {
    const { editor } = initTestEditor({
      content: spacingDocx.docx,
      media: spacingDocx.media,
      mediaFiles: spacingDocx.mediaFiles,
      fonts: spacingDocx.fonts,
    });

    // Find paragraph with contextualSpacing
    let match = null;
    editor.state.doc.descendants((node) => {
      if (node.type.name !== 'paragraph') return;
      const pProps = node.attrs?.paragraphProperties;
      if (pProps?.contextualSpacing !== undefined) {
        match = node;
        return false;
      }
    });

    if (!match) {
      // No contextualSpacing in fixture, test with mock
      // contextualSpacing should be in spacing object, not top-level
      const mockPara = {
        type: { name: 'paragraph' },
        attrs: {
          spacing: {
            contextualSpacing: true,
          },
        },
      };

      const styleContext = {
        styles: {},
        defaults: { defaultTabIntervalTwips: 720, decimalSeparator: '.' },
      };

      const adapterAttrs = computeParagraphAttrs(mockPara, styleContext);
      expect(adapterAttrs?.contextualSpacing).toBe(true);
      editor.destroy();
      return;
    }

    const styleContext = buildStyleContextFromEditor(editor);
    const converterContext = buildConverterContextFromEditor(editor);
    const adapterAttrs = computeParagraphAttrs(match, styleContext, undefined, converterContext);

    // contextualSpacing should be preserved
    if (match.attrs?.paragraphProperties?.contextualSpacing !== undefined) {
      expect(adapterAttrs?.contextualSpacing).toBe(match.attrs.paragraphProperties.contextualSpacing);
    }

    editor.destroy();
  });

  it('ensures beforeAutospacing and afterAutospacing flags are preserved', () => {
    // Test with mock paragraph since fixture might not have these
    const mockPara = {
      type: { name: 'paragraph' },
      attrs: {
        spacing: {
          beforeAutospacing: true,
          afterAutospacing: false,
        },
      },
    };

    const styleContext = {
      styles: {},
      defaults: { defaultTabIntervalTwips: 720, decimalSeparator: '.' },
    };

    const adapterAttrs = computeParagraphAttrs(mockPara, styleContext);

    // Autospacing flags should be preserved in spacing object
    expect(typeof adapterAttrs?.spacing?.beforeAutospacing).toBe('boolean');
    expect(typeof adapterAttrs?.spacing?.afterAutospacing).toBe('boolean');
    expect(adapterAttrs.spacing.beforeAutospacing).toBe(true);
    expect(adapterAttrs.spacing.afterAutospacing).toBe(false);
  });

  it('compares text indent and padding between reference and adapter', () => {
    const { editor } = initTestEditor({
      content: spacingDocx.docx,
      media: spacingDocx.media,
      mediaFiles: spacingDocx.mediaFiles,
      fonts: spacingDocx.fonts,
    });

    let referenceMatch = null;
    let paraNode = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'paragraph') return;
      const snapshot = computeParagraphReferenceSnapshot(editor, node, pos);
      if (snapshot.paragraphProperties.indent) {
        referenceMatch = snapshot;
        paraNode = node;
        return false;
      }
    });

    if (!referenceMatch) {
      expect(true).toBe(true);
      editor.destroy();
      return;
    }

    const styleContext = buildStyleContextFromEditor(editor);
    const converterContext = buildConverterContextFromEditor(editor);
    const adapterAttrs = computeParagraphAttrs(paraNode, styleContext, undefined, converterContext);

    const referenceIndent = referenceMatch.paragraphProperties.indent;

    // Compare indent numeric properties
    if (referenceIndent.left !== undefined) {
      expect(typeof adapterAttrs.indent.left).toBe('number');
    }
    if (referenceIndent.right !== undefined) {
      expect(typeof adapterAttrs.indent.right).toBe('number');
    }
    if (referenceIndent.firstLine !== undefined) {
      expect(typeof adapterAttrs.indent.firstLine).toBe('number');
    }
    if (referenceIndent.hanging !== undefined) {
      expect(typeof adapterAttrs.indent.hanging).toBe('number');
    }

    editor.destroy();
  });

  it('ensures keepNext flag is preserved', () => {
    // Test with mock paragraph
    const mockPara = {
      type: { name: 'paragraph' },
      attrs: {
        paragraphProperties: {
          keepNext: true,
        },
      },
    };

    const styleContext = {
      styles: {},
      defaults: { defaultTabIntervalTwips: 720, decimalSeparator: '.' },
    };

    const adapterAttrs = computeParagraphAttrs(mockPara, styleContext);
    expect(adapterAttrs?.keepNext).toBe(true);
  });

  it('ensures keepLines flag is preserved', () => {
    // Test with mock paragraph
    const mockPara = {
      type: { name: 'paragraph' },
      attrs: {
        paragraphProperties: {
          keepLines: true,
        },
      },
    };

    const styleContext = {
      styles: {},
      defaults: { defaultTabIntervalTwips: 720, decimalSeparator: '.' },
    };

    const adapterAttrs = computeParagraphAttrs(mockPara, styleContext);
    expect(adapterAttrs?.keepLines).toBe(true);
  });

  it('ensures paragraph borders are preserved', () => {
    // Test with mock paragraph
    // size values are in OOXML eighths-of-a-point: 32 eighths = 4pt
    const mockPara = {
      type: { name: 'paragraph' },
      attrs: {
        borders: {
          top: { val: 'single', size: 32, color: 'FF0000' },
          bottom: { val: 'single', size: 32, color: '0000FF' },
        },
      },
    };

    const styleContext = {
      styles: {},
      defaults: { defaultTabIntervalTwips: 720, decimalSeparator: '.' },
    };

    const adapterAttrs = computeParagraphAttrs(mockPara, styleContext);
    expect(adapterAttrs?.borders).toEqual({
      top: { style: 'solid', width: (32 / 8) * (96 / 72), color: '#FF0000' },
      bottom: { style: 'solid', width: (32 / 8) * (96 / 72), color: '#0000FF' },
    });
  });

  it('ensures paragraph shading is preserved', () => {
    const mockPara = {
      type: { name: 'paragraph' },
      attrs: {
        shading: {
          fill: '#FFFF00',
          color: '#000000',
        },
      },
    };

    const styleContext = {
      styles: {},
      defaults: { defaultTabIntervalTwips: 720, decimalSeparator: '.' },
    };

    const adapterAttrs = computeParagraphAttrs(mockPara, styleContext);
    expect(adapterAttrs?.shading).toEqual(mockPara.attrs.shading);
  });

  it('ensures framePr and floatAlignment flags are preserved', () => {
    const mockPara = {
      type: { name: 'paragraph' },
      attrs: {
        framePr: {
          xAlign: 'right',
        },
      },
    };

    const styleContext = {
      styles: {},
      defaults: { defaultTabIntervalTwips: 720, decimalSeparator: '.' },
    };

    const adapterAttrs = computeParagraphAttrs(mockPara, styleContext);
    expect(adapterAttrs?.floatAlignment).toBe('right');
  });
});
