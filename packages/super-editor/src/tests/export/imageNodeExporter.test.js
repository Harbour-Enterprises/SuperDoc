import { getExportedResult, getExportMediaFiles } from './export-helpers/index';

const findShape = (body, name) => {
  const paragraphs = body.elements.filter((el) => el.name === 'w:p');
  for (const p of paragraphs) {
    for (const r of p.elements || []) {
      if (r.name !== 'w:r') continue;
      const drawing = r.elements?.find((el) => el.name === 'w:drawing');
      if (!drawing) continue;
      const shape = drawing.elements.find((el) => el.name === name);
      if (shape) return shape;
    }
  }
  return null;
};

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
    const imageNode = findShape(body, 'wp:inline');
    expect(imageNode.attributes.distT).toBe('0');
    expect(imageNode.attributes.distB).toBe('0');
    expect(imageNode.attributes.distL).toBe('0');
    expect(imageNode.attributes.distR).toBe('0');

    expect(imageNode.elements[0].attributes.cx).toBe(5734050);
    expect(imageNode.elements[0].attributes.cy).toBe(8601075);

    expect(imageNode.elements[4].elements[0].elements[0].elements[1].elements[0].attributes['r:embed']).toBe('rId4');
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
    const anchorNode = findShape(body, 'wp:anchor');

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
