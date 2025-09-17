import { getExportedResult, getExportMediaFiles, getExportedResultWithDocContent } from './export-helpers/index';
import { exportSchemaToJson } from '@converter/exporter';
import { pixelsToEmu, degreesToRot } from '@converter/helpers';

describe('ImageNodeExporter', async () => {
  window.URL.createObjectURL = vi.fn().mockImplementation((file) => {
    return file.name;
  });

  const fileName = 'image_doc.docx';
  const result = await getExportedResult(fileName);
  const body = {};

  beforeEach(() => {
    Object.assign(
      body,
      result.elements?.find((el) => el.name === 'w:body'),
    );
  });

  it('export image node correctly', () => {
    const imageNode = body.elements[0].elements[1].elements[0];
    expect(imageNode.elements[0].attributes.distT).toBe('0');
    expect(imageNode.elements[0].attributes.distB).toBe('0');
    expect(imageNode.elements[0].attributes.distL).toBe('0');
    expect(imageNode.elements[0].attributes.distR).toBe('0');

    expect(imageNode.elements[0].elements[0].attributes.cx).toBe(5734050);
    expect(imageNode.elements[0].elements[0].attributes.cy).toBe(8601075);

    expect(
      imageNode.elements[0].elements[4].elements[0].elements[0].elements[1].elements[0].attributes['r:embed'],
    ).toBe('rId4');
  });

  it('exports image with transformData correctly', async () => {
    const imageNodeWithTransform = {
      type: 'paragraph',
      content: [
        {
          type: 'image',
          attrs: {
            src: 'word/media/test-image.jpg',
            rId: 'rId5',
            alt: 'Test transformed image',
            size: { width: 400, height: 300 },
            padding: { top: 8, bottom: 8, left: 8, right: 8 },
            transformData: {
              rotation: 30,
              verticalFlip: true,
              horizontalFlip: false,
              sizeExtension: {
                left: 5,
                top: 0,
                right: 0,
                bottom: 10,
              },
            },
          },
        },
      ],
    };

    const result = await getExportedResultWithDocContent([imageNodeWithTransform]);
    const body = result.elements?.find((el) => el.name === 'w:body');

    // Navigate to the image more carefully
    const paragraph = body.elements[0];
    expect(paragraph.name).toBe('w:p');

    const run = paragraph.elements.find((el) => el.name === 'w:r');
    expect(run).toBeTruthy();

    const imageNode = run.elements.find((el) => el.name === 'w:drawing');
    expect(imageNode).toBeTruthy();

    const drawing = imageNode;

    // Check basic structure
    expect(drawing.name).toBe('w:drawing');
    const inlineElement = drawing.elements[0];
    expect(inlineElement.name).toBe('wp:inline');

    // Check effectExtent (sizeExtension)
    const effectExtent = inlineElement.elements.find((el) => el.name === 'wp:effectExtent');
    expect(effectExtent).toBeTruthy();
    expect(effectExtent.attributes.l).toBe(pixelsToEmu(5));
    expect(effectExtent.attributes.t).toBe(0);
    expect(effectExtent.attributes.r).toBe(0);
    expect(effectExtent.attributes.b).toBe(pixelsToEmu(10));

    // Navigate to spPr more carefully
    const graphic = inlineElement.elements.find((el) => el.name === 'a:graphic');
    const graphicData = graphic.elements.find((el) => el.name === 'a:graphicData');
    const pic = graphicData.elements.find((el) => el.name === 'pic:pic');
    const spPr = pic.elements.find((el) => el.name === 'pic:spPr');

    expect(spPr.name).toBe('pic:spPr');
    const xfrm = spPr.elements.find((el) => el.name === 'a:xfrm');
    expect(xfrm).toBeTruthy();
    expect(xfrm.attributes.rot).toBe(degreesToRot(30));
    expect(xfrm.attributes.flipV).toBe('1');
    expect(xfrm.attributes.flipH).toBeUndefined();
  });

  it('exports anchor image node correctly', async () => {});
});

describe('ImageNodeExporter anchor image', async () => {
  window.URL.createObjectURL = vi.fn().mockImplementation((file) => {
    return file.name;
  });

  const fileName = 'anchor_images.docx';
  const result = await getExportedResult(fileName);
  const body = {};

  beforeEach(() => {
    Object.assign(
      body,
      result.elements?.find((el) => el.name === 'w:body'),
    );
  });

  it('exports anchor image node correctly', async () => {
    const imageNode = body.elements[1].elements[4].elements[0];
    const anchorNode = imageNode.elements[0];

    expect(anchorNode.attributes).toHaveProperty('simplePos', '0');
    expect(anchorNode.elements[0].name).toBe('wp:simplePos');
    expect(anchorNode.elements[1].attributes.relativeFrom).toBe('margin');
    expect(anchorNode.elements[1].elements[0].name).toBe('wp:align');
    expect(anchorNode.elements[1].elements[0].elements[0].text).toBe('left');

    expect(anchorNode.elements[2].attributes.relativeFrom).toBe('margin');
    expect(anchorNode.elements[2].elements[0].name).toBe('wp:align');
    expect(anchorNode.elements[2].elements[0].elements[0].text).toBe('top');

    expect(anchorNode.elements[5].name).toBe('wp:wrapSquare');
    expect(anchorNode.elements[5].attributes.wrapText).toBe('bothSides');
  });
});

describe('ImageNodeExporter images with absolute path', async () => {
  window.URL.createObjectURL = vi.fn().mockImplementation((file) => {
    return file.name;
  });

  const fileName = 'image-out-of-folder.docx';
  const result = await getExportMediaFiles(fileName);

  it('exports image with absolute path correctly', async () => {
    expect(result).toHaveProperty('word/media/image1.jpeg');
    expect(result).toHaveProperty('media/image.png');
  });

  it('exports image with minimal transformData correctly', async () => {
    const imageNodeMinimal = {
      type: 'paragraph',
      content: [
        {
          type: 'image',
          attrs: {
            src: 'word/media/simple-image.png',
            rId: 'rId1',
            alt: 'Simple image',
            size: { width: 200, height: 150 },
            transformData: {
              rotation: 0,
              verticalFlip: false,
              horizontalFlip: false,
            },
          },
        },
      ],
    };

    const result = await getExportedResultWithDocContent([imageNodeMinimal]);
    const body = result.elements?.find((el) => el.name === 'w:body');

    const paragraph = body.elements[0];
    const run = paragraph.elements.find((el) => el.name === 'w:r');
    const drawing = run.elements.find((el) => el.name === 'w:drawing');

    // Check that transform data is handled correctly even when minimal
    const inlineElement = drawing.elements[0];
    const graphic = inlineElement.elements.find((el) => el.name === 'a:graphic');
    const graphicData = graphic.elements.find((el) => el.name === 'a:graphicData');
    const pic = graphicData.elements.find((el) => el.name === 'pic:pic');
    const spPr = pic.elements.find((el) => el.name === 'pic:spPr');
    const xfrm = spPr.elements.find((el) => el.name === 'a:xfrm');
    expect(xfrm).toBeTruthy();
    expect(xfrm.attributes.rot).toBeUndefined(); // No rotation should not add attribute
    expect(xfrm.attributes.flipV).toBeUndefined(); // No vertical flip
    expect(xfrm.attributes.flipH).toBeUndefined(); // No horizontal flip
  });

  it('exports image with horizontal flip only', async () => {
    const imageNodeHorizontalFlip = {
      type: 'paragraph',
      content: [
        {
          type: 'image',
          attrs: {
            src: 'word/media/flipped-image.jpg',
            rId: 'rId2',
            alt: 'Horizontally flipped image',
            size: { width: 300, height: 200 },
            transformData: {
              rotation: 0,
              verticalFlip: false,
              horizontalFlip: true,
            },
          },
        },
      ],
    };

    const result = await getExportedResultWithDocContent([imageNodeHorizontalFlip]);
    const body = result.elements?.find((el) => el.name === 'w:body');

    const paragraph = body.elements[0];
    const run = paragraph.elements.find((el) => el.name === 'w:r');
    const drawing = run.elements.find((el) => el.name === 'w:drawing');

    const inlineElement = drawing.elements[0];
    const graphic = inlineElement.elements.find((el) => el.name === 'a:graphic');
    const graphicData = graphic.elements.find((el) => el.name === 'a:graphicData');
    const pic = graphicData.elements.find((el) => el.name === 'pic:pic');
    const spPr = pic.elements.find((el) => el.name === 'pic:spPr');
    const xfrm = spPr.elements.find((el) => el.name === 'a:xfrm');
    expect(xfrm).toBeTruthy();
    expect(xfrm.attributes.flipH).toBe('1');
    expect(xfrm.attributes.flipV).toBeUndefined();
  });

  it('exports image with rotation and both flips', async () => {
    const imageNodeFullTransform = {
      type: 'paragraph',
      content: [
        {
          type: 'image',
          attrs: {
            src: 'word/media/complex-transform.png',
            rId: 'rId3',
            alt: 'Fully transformed image',
            size: { width: 400, height: 400 },
            transformData: {
              rotation: -45,
              verticalFlip: true,
              horizontalFlip: true,
              sizeExtension: {
                left: 10,
                top: 15,
                right: 20,
                bottom: 5,
              },
            },
          },
        },
      ],
    };

    const result = await getExportedResultWithDocContent([imageNodeFullTransform]);
    const body = result.elements?.find((el) => el.name === 'w:body');

    const paragraph = body.elements[0];
    const run = paragraph.elements.find((el) => el.name === 'w:r');
    const drawing = run.elements.find((el) => el.name === 'w:drawing');

    // Check effectExtent
    const inlineElement = drawing.elements[0];
    const effectExtent = inlineElement.elements.find((el) => el.name === 'wp:effectExtent');
    expect(effectExtent.attributes.l).toBe(pixelsToEmu(10));
    expect(effectExtent.attributes.t).toBe(pixelsToEmu(15));
    expect(effectExtent.attributes.r).toBe(pixelsToEmu(20));
    expect(effectExtent.attributes.b).toBe(pixelsToEmu(5));

    // Check transform
    const graphic = inlineElement.elements.find((el) => el.name === 'a:graphic');
    const graphicData = graphic.elements.find((el) => el.name === 'a:graphicData');
    const pic = graphicData.elements.find((el) => el.name === 'pic:pic');
    const spPr = pic.elements.find((el) => el.name === 'pic:spPr');
    const xfrm = spPr.elements.find((el) => el.name === 'a:xfrm');
    expect(xfrm.attributes.rot).toBe(degreesToRot(-45));
    expect(xfrm.attributes.flipV).toBe('1');
    expect(xfrm.attributes.flipH).toBe('1');
  });

  it('exports image without transformData correctly', async () => {
    const imageNodeNoTransform = {
      type: 'paragraph',
      content: [
        {
          type: 'image',
          attrs: {
            src: 'word/media/normal-image.jpg',
            rId: 'rId4',
            alt: 'Normal image without transforms',
            size: { width: 250, height: 180 },
          },
        },
      ],
    };

    const result = await getExportedResultWithDocContent([imageNodeNoTransform]);
    const body = result.elements?.find((el) => el.name === 'w:body');

    const paragraph = body.elements[0];
    const run = paragraph.elements.find((el) => el.name === 'w:r');
    const drawing = run.elements.find((el) => el.name === 'w:drawing');

    // Check that no effectExtent is added when no sizeExtension
    const inlineElement = drawing.elements[0];
    const effectExtent = inlineElement.elements.find((el) => el.name === 'wp:effectExtent');
    expect(effectExtent.attributes.l).toBe(0);
    expect(effectExtent.attributes.t).toBe(0);
    expect(effectExtent.attributes.r).toBe(0);
    expect(effectExtent.attributes.b).toBe(0);

    // Check that no transform attributes are added
    const graphic = inlineElement.elements.find((el) => el.name === 'a:graphic');
    const graphicData = graphic.elements.find((el) => el.name === 'a:graphicData');
    const pic = graphicData.elements.find((el) => el.name === 'pic:pic');
    const spPr = pic.elements.find((el) => el.name === 'pic:spPr');
    const xfrm = spPr.elements.find((el) => el.name === 'a:xfrm');
    expect(xfrm).toBeTruthy();
    expect(xfrm.attributes.rot).toBeUndefined();
    expect(xfrm.attributes.flipV).toBeUndefined();
    expect(xfrm.attributes.flipH).toBeUndefined();
  });
});
