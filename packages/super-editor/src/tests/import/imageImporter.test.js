import { getTestDataByFileName } from '../helpers/helpers.js';
import { defaultNodeListHandler } from '@converter/v2/importer/docxImporter.js';
import { handleDrawingNode } from '../../core/super-converter/v2/importer/imageImporter.js';
import { handleParagraphNode } from '../../core/super-converter/v2/importer/paragraphNodeImporter.js';

const collectImagesFromParagraph = (paragraphNode) =>
  paragraphNode.content.flatMap((child) => {
    if (child.type === 'run' && Array.isArray(child.content)) {
      return child.content.filter((inner) => inner.type === 'image');
    }
    return child.type === 'image' ? [child] : [];
  });

describe('ImageNodeImporter', () => {
  it('imports image node correctly', async () => {
    const dataName = 'image_doc.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;
    const { nodes } = handleParagraphNode({ nodes: [content[0]], docx, nodeListHandler: defaultNodeListHandler() });

    const paragraphNode = nodes[0];
    const [drawingNode] = collectImagesFromParagraph(paragraphNode);
    expect(drawingNode).toBeDefined();
    const { attrs } = drawingNode;
    const { padding, size } = attrs;

    expect(paragraphNode.type).toBe('paragraph');
    expect(drawingNode.type).toBe('image');

    expect(attrs).toHaveProperty('rId', 'rId4');
    expect(attrs).toHaveProperty('src', 'word/media/image1.jpeg');

    expect(size).toHaveProperty('width', 602);
    expect(size).toHaveProperty('height', 903);

    expect(padding).toHaveProperty('left', 0);
    expect(padding).toHaveProperty('top', 0);
    expect(padding).toHaveProperty('bottom', 0);
    expect(padding).toHaveProperty('right', 0);
  });

  it('imports anchor image node correctly', async () => {
    const dataName = 'anchor_images.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;
    const { nodes } = handleParagraphNode({ nodes: [content[1]], docx, nodeListHandler: defaultNodeListHandler() });

    const paragraphNode = nodes[0];
    const images = collectImagesFromParagraph(paragraphNode);
    const drawingNode = images.find((img) => img.attrs?.anchorData);
    expect(drawingNode).toBeDefined();
    const { attrs } = drawingNode;
    const { anchorData } = attrs;

    expect(anchorData).toHaveProperty('hRelativeFrom', 'margin');
    expect(anchorData).toHaveProperty('vRelativeFrom', 'margin');
    expect(anchorData).toHaveProperty('alignH', 'left');
    expect(anchorData).toHaveProperty('alignV', 'top');
  });

  it('imports image with absolute path in Target correctly', async () => {
    const dataName = 'image-out-of-folder.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;

    const { nodes } = handleParagraphNode({ nodes: [content[0]], docx, nodeListHandler: defaultNodeListHandler() });

    let paragraphNode = nodes[0];
    let [drawingNode] = collectImagesFromParagraph(paragraphNode);
    expect(drawingNode).toBeDefined();
    const { attrs } = drawingNode;
    expect(attrs.src).toBe('media/image.png');

    const { nodes: nodes1 } = handleParagraphNode({
      nodes: [content[5]],
      docx,
      nodeListHandler: defaultNodeListHandler(),
    });
    paragraphNode = nodes1[0];
    const imagesSecondParagraph = collectImagesFromParagraph(paragraphNode);
    expect(imagesSecondParagraph[0].attrs.src).toBe('word/media/image1.jpeg');
  });
});
