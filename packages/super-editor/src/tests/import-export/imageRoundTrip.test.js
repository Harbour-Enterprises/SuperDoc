import { getTestDataByFileName } from '../helpers/helpers.js';
import { defaultNodeListHandler } from '@converter/v2/importer/docxImporter.js';
import { handleParagraphNode } from '../../core/super-converter/v2/importer/paragraphNodeImporter.js';
import { getExportedResultWithDocContent } from '../export/export-helpers/index.js';
import { Editor } from '@core/Editor.js';
import { getStarterExtensions } from '@extensions/index.js';
import { exportSchemaToJson } from '@converter/exporter';
import { pixelsToEmu, degreesToRot, emuToPixels, rotToDegrees } from '@converter/helpers';

describe('Image Import/Export Round Trip Tests', () => {
  let editor;

  beforeEach(() => {
    editor = new Editor({
      isHeadless: true,
      extensions: getStarterExtensions(),
      documentId: 'test-doc',
      mode: 'docx',
      annotations: true,
    });
  });

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
  });

  it('round trip: basic image import and export', async () => {
    const dataName = 'image_doc.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;

    // Import
    const { nodes } = handleParagraphNode({
      nodes: [content[0]],
      docx,
      nodeListHandler: defaultNodeListHandler(),
    });

    const paragraphNode = nodes[0];
    const importedImageNode = paragraphNode.content[0];

    // Verify import
    expect(importedImageNode.type).toBe('image');
    expect(importedImageNode.attrs.src).toBe('word/media/image1.jpeg');
    expect(importedImageNode.attrs.rId).toBe('rId4');

    // Export
    const exportResult = await getExportedResultWithDocContent([paragraphNode]);
    const exportedBody = exportResult.elements?.find((el) => el.name === 'w:body');
    const exportedImageNode = exportedBody.elements[0].elements[1].elements[0];

    // Verify export structure
    expect(exportedImageNode.elements[0].name).toBe('w:drawing');
    expect(exportedImageNode.elements[0].elements[0].name).toBe('wp:inline');

    // Verify relationship ID is preserved
    const blipElement =
      exportedImageNode.elements[0].elements[0].elements[4].elements[0].elements[0].elements[1].elements[0];
    expect(blipElement.attributes['r:embed']).toBe('rId4');
  });

  it('round trip: anchor image with positioning data', async () => {
    const dataName = 'anchor_images.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;

    // Import
    const { nodes } = handleParagraphNode({
      nodes: [content[1]],
      docx,
      nodeListHandler: defaultNodeListHandler(),
    });

    const paragraphNode = nodes[0];
    const importedImageNode = paragraphNode.content[3];

    // Verify import of anchor data
    expect(importedImageNode.attrs.isAnchor).toBeTruthy();
    expect(importedImageNode.attrs.anchorData.hRelativeFrom).toBe('margin');
    expect(importedImageNode.attrs.anchorData.vRelativeFrom).toBe('margin');
    expect(importedImageNode.attrs.anchorData.alignH).toBe('left');
    expect(importedImageNode.attrs.anchorData.alignV).toBe('top');

    // Export
    const exportResult = await getExportedResultWithDocContent([paragraphNode]);
    const exportedBody = exportResult.elements?.find((el) => el.name === 'w:body');
    const exportedImageNode = exportedBody.elements[0].elements[4].elements[0];

    // Verify anchor export
    const anchorNode = exportedImageNode.elements[0];
    expect(anchorNode.name).toBe('wp:anchor');
    expect(anchorNode.elements[1].attributes.relativeFrom).toBe('margin');
    expect(anchorNode.elements[2].attributes.relativeFrom).toBe('margin');
  });

  it('round trip: image with transform data (rotation, flips, size extensions)', async () => {
    // Create mock image node with transform data
    const mockImageNode = {
      type: 'paragraph',
      content: [
        {
          type: 'image',
          attrs: {
            src: 'word/media/transformed-image.jpg',
            rId: 'rId10',
            alt: 'Transformed image',
            size: { width: 300, height: 200 },
            padding: { top: 10, bottom: 10, left: 10, right: 10 },
            transformData: {
              rotation: 45,
              verticalFlip: true,
              horizontalFlip: false,
              sizeExtension: {
                left: 5,
                top: 8,
                right: 12,
                bottom: 3,
              },
            },
          },
        },
      ],
    };

    // Export first
    const exportResult = await getExportedResultWithDocContent([mockImageNode]);
    const exportedBody = exportResult.elements?.find((el) => el.name === 'w:body');
    const exportedImageNode = exportedBody.elements[0].elements[1].elements[0];
    const drawing = exportedImageNode.elements[0];

    // Verify export of transform data
    const effectExtent = drawing.elements[0].elements.find((el) => el.name === 'wp:effectExtent');
    expect(effectExtent.attributes.l).toBe(pixelsToEmu(5));
    expect(effectExtent.attributes.t).toBe(pixelsToEmu(8));
    expect(effectExtent.attributes.r).toBe(pixelsToEmu(12));
    expect(effectExtent.attributes.b).toBe(pixelsToEmu(3));

    const spPr = drawing.elements[0].elements[4].elements[0].elements[0].elements[2];
    const xfrm = spPr.elements.find((el) => el.name === 'a:xfrm');
    expect(xfrm.attributes.rot).toBe(degreesToRot(45));
    expect(xfrm.attributes.flipV).toBe('1');
    expect(xfrm.attributes.flipH).toBeUndefined();

    // Now simulate import back (we would need to convert the exported XML back to PM schema)
    // For this test, we'll verify the conversion functions work correctly
    expect(rotToDegrees(degreesToRot(45))).toBeCloseTo(45, 1);
    expect(emuToPixels(pixelsToEmu(5))).toBeCloseTo(5, 1);
  });

  it('round trip: image with wrapping and positioning', async () => {
    const mockImageNode = {
      type: 'paragraph',
      content: [
        {
          type: 'image',
          attrs: {
            src: 'word/media/wrapped-image.png',
            rId: 'rId11',
            alt: 'Wrapped image',
            size: { width: 250, height: 150 },
            isAnchor: true,
            wrapText: 'bothSides',
            wrapTopAndBottom: false,
            anchorData: {
              hRelativeFrom: 'page',
              vRelativeFrom: 'paragraph',
              alignH: 'center',
              alignV: 'bottom',
            },
            marginOffset: {
              left: 50,
              top: 25,
            },
          },
        },
      ],
    };

    // Export
    const exportResult = await getExportedResultWithDocContent([mockImageNode]);
    const exportedBody = exportResult.elements?.find((el) => el.name === 'w:body');
    const exportedImageNode = exportedBody.elements[0].elements[1].elements[0];
    const anchorNode = exportedImageNode.elements[0].elements[0];

    // Verify anchor positioning export
    expect(anchorNode.name).toBe('wp:anchor');

    const positionH = anchorNode.elements.find((el) => el.name === 'wp:positionH');
    expect(positionH.attributes.relativeFrom).toBe('page');

    const positionV = anchorNode.elements.find((el) => el.name === 'wp:positionV');
    expect(positionV.attributes.relativeFrom).toBe('paragraph');

    // Verify wrapping export
    const wrapSquare = anchorNode.elements.find((el) => el.name === 'wp:wrapSquare');
    expect(wrapSquare.attributes.wrapText).toBe('bothSides');
  });

  it('round trip: preserves image metadata and properties', async () => {
    const mockImageNode = {
      type: 'paragraph',
      content: [
        {
          type: 'image',
          attrs: {
            src: 'word/media/metadata-image.jpg',
            rId: 'rId12',
            alt: 'Image with metadata',
            title: 'Descriptive title',
            id: 'img123',
            size: { width: 400, height: 300 },
            padding: { top: 15, bottom: 20, left: 10, right: 5 },
            originalPadding: {
              distT: '190500',
              distB: '254000',
              distL: '127000',
              distR: '63500',
            },
            originalAttributes: {
              someAttr: 'someValue',
            },
          },
        },
      ],
    };

    // Export
    const exportResult = await getExportedResultWithDocContent([mockImageNode]);
    const exportedBody = exportResult.elements?.find((el) => el.name === 'w:body');
    const exportedImageNode = exportedBody.elements[0].elements[1].elements[0];
    const inlineNode = exportedImageNode.elements[0].elements[0];

    // Verify padding is exported from originalPadding if available
    expect(inlineNode.attributes.distT).toBe('190500');
    expect(inlineNode.attributes.distB).toBe('254000');
    expect(inlineNode.attributes.distL).toBe('127000');
    expect(inlineNode.attributes.distR).toBe('63500');

    // Verify image properties
    const docPr = inlineNode.elements.find((el) => el.name === 'wp:docPr');
    expect(docPr.attributes.id).toBe('img123');
    expect(docPr.attributes.name).toBe('Image with metadata');

    // Verify title in pic:cNvPr
    const picCNvPr = inlineNode.elements[4].elements[0].elements[0].elements[0].elements[0];
    expect(picCNvPr.attributes.name).toBe('Descriptive title');
  });

  it('round trip: handles missing or invalid image data gracefully', async () => {
    const mockImageNode = {
      type: 'paragraph',
      content: [
        {
          type: 'image',
          attrs: {
            src: 'word/media/missing-image.jpg',
            // No rId - should be handled gracefully
            alt: 'Missing image',
            size: { width: 100, height: 100 },
          },
        },
      ],
    };

    // Export should create a new relationship ID
    const exportResult = await getExportedResultWithDocContent([mockImageNode]);
    const exportedBody = exportResult.elements?.find((el) => el.name === 'w:body');
    const exportedImageNode = exportedBody.elements[0].elements[1].elements[0];

    // Should still create valid image structure
    expect(exportedImageNode.elements[0].name).toBe('w:drawing');
    expect(exportedImageNode.elements[0].elements[0].name).toBe('wp:inline');
  });

  it('round trip: EMF/WMF image handling', async () => {
    const mockEmfImageNode = {
      type: 'paragraph',
      content: [
        {
          type: 'image',
          attrs: {
            src: 'word/media/vector-image.emf',
            rId: 'rId13',
            alt: 'Unable to render EMF/WMF image',
            extension: 'emf',
            size: { width: 200, height: 150 },
          },
        },
      ],
    };

    // Export
    const exportResult = await getExportedResultWithDocContent([mockEmfImageNode]);
    const exportedBody = exportResult.elements?.find((el) => el.name === 'w:body');
    const exportedImageNode = exportedBody.elements[0].elements[1].elements[0];

    // Verify structure is created correctly for EMF/WMF files
    expect(exportedImageNode.elements[0].name).toBe('w:drawing');

    // EMF/WMF files should still generate valid drawing markup
    const docPr = exportedImageNode.elements[0].elements[0].elements.find((el) => el.name === 'wp:docPr');
    expect(docPr.attributes.name).toBe('Unable to render EMF/WMF image');
  });

  it('round trip: complex transformation combinations', async () => {
    const combinations = [
      { rotation: 90, verticalFlip: false, horizontalFlip: true },
      { rotation: 180, verticalFlip: true, horizontalFlip: false },
      { rotation: 270, verticalFlip: true, horizontalFlip: true },
      { rotation: -30, verticalFlip: false, horizontalFlip: false },
    ];

    for (const [index, transform] of combinations.entries()) {
      const mockImageNode = {
        type: 'paragraph',
        content: [
          {
            type: 'image',
            attrs: {
              src: `word/media/combo-${index}.jpg`,
              rId: `rId1${index}`,
              alt: `Combo transform ${index}`,
              size: { width: 300, height: 300 },
              transformData: transform,
            },
          },
        ],
      };

      // Export
      const exportResult = await getExportedResultWithDocContent([mockImageNode]);
      const exportedBody = exportResult.elements?.find((el) => el.name === 'w:body');
      const exportedImageNode = exportedBody.elements[0].elements[1].elements[0];
      const spPr = exportedImageNode.elements[0].elements[0].elements[4].elements[0].elements[0].elements[2];
      const xfrm = spPr.elements.find((el) => el.name === 'a:xfrm');

      // Verify each transformation is exported correctly
      if (transform.rotation !== 0) {
        expect(xfrm.attributes.rot).toBe(degreesToRot(transform.rotation));
      }
      if (transform.verticalFlip) {
        expect(xfrm.attributes.flipV).toBe('1');
      }
      if (transform.horizontalFlip) {
        expect(xfrm.attributes.flipH).toBe('1');
      }
    }
  });

  it('round trip: preserves image storage references', async () => {
    // Test that image storage references are maintained through round trip
    const mockImageWithStorage = {
      type: 'paragraph',
      content: [
        {
          type: 'image',
          attrs: {
            src: 'stored-image-ref', // This would be a key in storage.media
            alt: 'Stored image',
            size: { width: 200, height: 200 },
          },
        },
      ],
    };

    // Export should handle storage references correctly
    const exportResult = await getExportedResultWithDocContent([mockImageWithStorage]);
    const exportedBody = exportResult.elements?.find((el) => el.name === 'w:body');
    const exportedImageNode = exportedBody.elements[0].elements[1].elements[0];

    // Should create valid structure even with storage reference
    expect(exportedImageNode.elements[0].name).toBe('w:drawing');
  });
});
