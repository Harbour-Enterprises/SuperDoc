import { beforeAll, describe, expect, it } from 'vitest';
import { dirname, join } from 'path';
import { fileURLToPath } from 'node:url';
import { initTestEditor, loadTestDataForEditorTests } from '@tests/helpers/helpers.js';
import { computeParagraphReferenceSnapshot } from '@tests/helpers/paragraphReference.js';
import { zipFolderToBuffer } from '@tests/helpers/zipFolderToBuffer.js';
import { Editor } from '@core/Editor.js';
import { computeParagraphAttrs } from '@superdoc/pm-adapter/attributes/paragraph.js';
import {
  buildStyleContextFromEditor,
  buildConverterContextFromEditor,
  createListCounterContext,
} from '../helpers/adapterTestHelpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

describe('adapter parity (computeParagraphAttrs)', () => {
  let basicDocx;
  let listDocx;
  let spacingDocx;

  beforeAll(async () => {
    const basic = await loadTestDataForEditorTests('basic-paragraph.docx');
    basicDocx = basic;
    const list = await loadTestDataForEditorTests('basic-list.docx');
    listDocx = list;
    spacingDocx = await loadTestDataForEditorTests('doc_with_spacing.docx');
  });

  it('computes attrs matching reference for plain paragraph', () => {
    const { editor } = initTestEditor({
      content: basicDocx.docx,
      media: basicDocx.media,
      mediaFiles: basicDocx.mediaFiles,
      fonts: basicDocx.fonts,
    });

    const match = findParagraphAt(editor.state.doc, () => true);
    expect(match).toBeTruthy();

    // Get reference snapshot from NodeView logic
    const reference = computeParagraphReferenceSnapshot(editor, match.node, match.pos);

    // Compute attrs via layout-engine adapter
    const styleContext = buildStyleContextFromEditor(editor);
    const converterContext = buildConverterContextFromEditor(editor);
    const adapterAttrs = computeParagraphAttrs(match.node, styleContext, undefined, converterContext);

    // Compare spacing: adapter should produce px numbers when reference defines spacing
    const refSpacing = reference.paragraphProperties.spacing;
    if (refSpacing) {
      expect(adapterAttrs?.spacing).toBeDefined();
      if (refSpacing.before != null) {
        expect(typeof adapterAttrs?.spacing?.before).toBe('number');
        expect(adapterAttrs.spacing.before).toBeGreaterThanOrEqual(0);
      }
      if (refSpacing.after != null) {
        expect(typeof adapterAttrs?.spacing?.after).toBe('number');
        expect(adapterAttrs.spacing.after).toBeGreaterThanOrEqual(0);
      }
    }

    // Compare indent: ensure adapter returns object with matching keys
    const refIndent = reference.paragraphProperties.indent;
    if (refIndent) {
      expect(adapterAttrs?.indent).toBeDefined();
      if (refIndent.left != null) {
        expect(adapterAttrs.indent?.left).toBeDefined();
      }
      if (refIndent.right != null) {
        expect(adapterAttrs.indent?.right).toBeDefined();
      }
      if (refIndent.firstLine != null) {
        expect(adapterAttrs.indent?.firstLine ?? adapterAttrs.indent?.hanging).toBeDefined();
      }
      if (refIndent.hanging != null) {
        expect(adapterAttrs.indent?.hanging ?? adapterAttrs.indent?.firstLine).toBeDefined();
      }
    }

    // Compare alignment (justification)
    if (reference.paragraphProperties.justification) {
      const referenceAlign = reference.paragraphProperties.justification;
      expect(adapterAttrs?.alignment).toBe(referenceAlign);
    }

    editor.destroy();
  });

  it('computes attrs matching reference for list paragraph', () => {
    const { editor } = initTestEditor({
      content: listDocx.docx,
      media: listDocx.media,
      mediaFiles: listDocx.mediaFiles,
      fonts: listDocx.fonts,
    });

    const match = findParagraphAt(editor.state.doc, (node) => Boolean(node.attrs?.listRendering));
    expect(match).toBeTruthy();

    // Get reference snapshot
    const reference = computeParagraphReferenceSnapshot(editor, match.node, match.pos);
    expect(reference.list).not.toBeNull();

    // Compute attrs via adapter
    const styleContext = buildStyleContextFromEditor(editor);
    const converterContext = buildConverterContextFromEditor(editor);
    const listCounterContext = createListCounterContext();
    const adapterAttrs = computeParagraphAttrs(match.node, styleContext, listCounterContext, converterContext);

    // Verify numberingProperties are present and correct
    expect(adapterAttrs?.numberingProperties).toBeDefined();
    expect(adapterAttrs?.numberingProperties.ilvl).toEqual(reference.paragraphProperties.numberingProperties.ilvl);
    expect(adapterAttrs?.numberingProperties.numId).toEqual(reference.paragraphProperties.numberingProperties.numId);

    // Verify wordLayout is computed and matches reference
    expect(adapterAttrs?.wordLayout).toBeDefined();
    if (reference.list.markerText) {
      expect(adapterAttrs?.wordLayout?.marker?.markerText).toBe(reference.list.markerText);
    }
    if (reference.list.justification) {
      expect(adapterAttrs?.wordLayout?.marker?.justification).toBe(reference.list.justification);
    }
    if (reference.list.suffix) {
      expect(adapterAttrs?.wordLayout?.marker?.suffix).toBe(reference.list.suffix);
    }

    editor.destroy();
  });

  it('computes spacing/indent matching reference', () => {
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
      if (snapshot.paragraphProperties.spacing || snapshot.paragraphProperties.indent) {
        referenceMatch = snapshot;
        paraNode = node;
        return false;
      }
    });

    expect(referenceMatch).toBeTruthy();
    expect(paraNode).toBeTruthy();

    // Compute adapter attrs
    const styleContext = buildStyleContextFromEditor(editor);
    const converterContext = buildConverterContextFromEditor(editor);
    const adapterAttrs = computeParagraphAttrs(paraNode, styleContext, undefined, converterContext);

    // Verify spacing precedence
    if (referenceMatch.paragraphProperties.spacing) {
      expect(adapterAttrs?.spacing).toBeDefined();

      // Check for contextualSpacing if present
      if (referenceMatch.paragraphProperties.spacing.contextualSpacing != null) {
        expect(adapterAttrs?.contextualSpacing).toBe(referenceMatch.paragraphProperties.spacing.contextualSpacing);
      }
    }

    // Verify indent precedence
    if (referenceMatch.paragraphProperties.indent) {
      expect(adapterAttrs?.indent).toEqual(referenceMatch.paragraphProperties.indent);
    }

    editor.destroy();
  });

  it('computes tab stops when present', async () => {
    const buffer = await zipFolderToBuffer(join(__dirname, '../data/tab_stops_basic_test'));
    const [docx, media, mediaFiles, fonts] = await Editor.loadXmlData(buffer, true);
    const { editor } = initTestEditor({ content: docx, media, mediaFiles, fonts });

    let paraIndex = -1;
    let match = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'paragraph') return;
      paraIndex += 1;
      // Paragraph index 3 has custom tab stop
      if (paraIndex === 3) {
        match = { node, pos };
        return false;
      }
    });

    expect(match).toBeTruthy();

    // Get reference
    const reference = computeParagraphReferenceSnapshot(editor, match.node, match.pos);
    expect(reference.paragraphProperties.tabStops).toBeTruthy();

    // Compute adapter attrs
    const styleContext = buildStyleContextFromEditor(editor);
    const converterContext = buildConverterContextFromEditor(editor);
    const adapterAttrs = computeParagraphAttrs(match.node, styleContext, undefined, converterContext);

    // Verify tabs are present and correct shape/values
    expect(adapterAttrs?.tabs).toBeDefined();
    expect(Array.isArray(adapterAttrs.tabs)).toBe(true);
    const refTab = reference.paragraphProperties.tabStops[0];
    const adapterTab = adapterAttrs.tabs?.[0];
    if (refTab.pos != null) {
      expect(adapterTab?.pos).toBe(refTab.pos);
    } else {
      expect(adapterTab?.pos).toBeDefined();
    }
    if (refTab.val != null) {
      expect(adapterTab?.val).toBe(refTab.val);
    } else {
      expect(adapterTab?.val).toBeDefined();
    }
    if (refTab.leader) {
      expect(adapterTab?.leader).toBe(refTab.leader);
    }

    // Verify tabIntervalTwips default is set
    expect(adapterAttrs?.tabIntervalTwips).toBe(styleContext.defaults.defaultTabIntervalTwips);

    editor.destroy();
  });

  it('propagates tab interval defaults correctly', () => {
    const { editor } = initTestEditor({
      content: basicDocx.docx,
      media: basicDocx.media,
      mediaFiles: basicDocx.mediaFiles,
      fonts: basicDocx.fonts,
    });

    const match = findParagraphAt(editor.state.doc, () => true);
    expect(match).toBeTruthy();

    const styleContext = buildStyleContextFromEditor(editor);
    const converterContext = buildConverterContextFromEditor(editor);
    const adapterAttrs = computeParagraphAttrs(match.node, styleContext, undefined, converterContext);

    // Tab interval should be set from styleContext defaults
    expect(adapterAttrs?.tabIntervalTwips).toBe(styleContext.defaults.defaultTabIntervalTwips);

    editor.destroy();
  });

  it('returns minimal attrs for empty paragraph (defaults only)', () => {
    const emptyPara = { type: { name: 'paragraph' }, attrs: {} };
    const styleContext = { styles: {}, defaults: { defaultTabIntervalTwips: 720, decimalSeparator: '.' } };
    const adapterAttrs = computeParagraphAttrs(emptyPara, styleContext);
    // Even empty paragraphs get default alignment and tab interval from styleContext.defaults
    expect(adapterAttrs).toBeDefined();
    expect(adapterAttrs?.tabIntervalTwips).toBe(720);
  });

  it('handles bidi + adjustRightInd by forcing right alignment and indent', () => {
    const para = {
      type: { name: 'paragraph' },
      attrs: { bidi: true, adjustRightInd: true },
    };
    const styleContext = { styles: {}, defaults: { defaultTabIntervalTwips: 720, decimalSeparator: '.' } };
    const adapterAttrs = computeParagraphAttrs(para, styleContext);
    expect(adapterAttrs?.alignment).toBe('right');
    expect(adapterAttrs?.indent?.left).toBeGreaterThan(0);
    expect(adapterAttrs?.indent?.right).toBeGreaterThan(0);
  });

  it('extracts framePr flags correctly', () => {
    // Create a mock paragraph with framePr
    const paraWithFramePr = {
      type: { name: 'paragraph' },
      attrs: {
        framePr: { xAlign: 'right' },
      },
    };

    const styleContext = {
      styles: {},
      defaults: { defaultTabIntervalTwips: 720, decimalSeparator: '.' },
    };

    const adapterAttrs = computeParagraphAttrs(paraWithFramePr, styleContext);

    expect(adapterAttrs?.floatAlignment).toBe('right');
  });

  it('extracts framePr from paragraphProperties elements', () => {
    // Create a mock paragraph with framePr in paragraphProperties
    const paraWithFramePr = {
      type: { name: 'paragraph' },
      attrs: {
        paragraphProperties: {
          elements: [
            {
              name: 'w:framePr',
              attributes: { 'w:xAlign': 'center' },
            },
          ],
        },
      },
    };

    const styleContext = {
      styles: {},
      defaults: { defaultTabIntervalTwips: 720, decimalSeparator: '.' },
    };

    const adapterAttrs = computeParagraphAttrs(paraWithFramePr, styleContext);

    expect(adapterAttrs?.floatAlignment).toBe('center');
  });
});
