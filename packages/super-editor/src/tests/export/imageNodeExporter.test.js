import { getExportedResult, getExportMediaFiles } from './export-helpers/index';

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
    const paragraph = body.elements[0];
    const drawingRun = paragraph.elements.find(
      (el) => el.name === 'w:r' && el.elements?.some((child) => child.name === 'w:drawing'),
    );
    const drawingNode = drawingRun.elements.find((child) => child.name === 'w:drawing');
    const inlineNode = drawingNode.elements.find((child) => child.name === 'wp:inline');

    expect(inlineNode.attributes.distT).toBe('0');
    expect(inlineNode.attributes.distB).toBe('0');
    expect(inlineNode.attributes.distL).toBe('0');
    expect(inlineNode.attributes.distR).toBe('0');

    const extent = inlineNode.elements.find((el) => el.name === 'wp:extent');
    expect(extent.attributes.cx).toBe(5734050);
    expect(extent.attributes.cy).toBe(8601075);

    const embed = inlineNode.elements
      .find((el) => el.name === 'a:graphic')
      .elements.find((el) => el.name === 'a:graphicData')
      .elements.find((el) => el.name === 'pic:pic')
      .elements.find((el) => el.name === 'pic:blipFill')
      .elements.find((el) => el.name === 'a:blip').attributes['r:embed'];

    expect(embed).toBe('rId4');
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
    const paragraph = body.elements[1];
    const drawingRun = paragraph.elements.find(
      (el) =>
        el.name === 'w:r' &&
        el.elements?.some(
          (child) => child.name === 'w:drawing' && child.elements?.some((grand) => grand.name === 'wp:anchor'),
        ),
    );
    const drawingNode = drawingRun.elements.find((child) => child.name === 'w:drawing');
    const anchorNode = drawingNode.elements.find((child) => child.name === 'wp:anchor');

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
});
