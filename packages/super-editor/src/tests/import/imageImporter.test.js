import { getTestDataByFileName } from '../helpers/helpers.js';
import { defaultNodeListHandler } from '@converter/v2/importer/docxImporter.js';
import { handleDrawingNode } from '../../core/super-converter/v2/importer/imageImporter.js';
import { handleParagraphNode } from '../../core/super-converter/v2/importer/paragraphNodeImporter.js';

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
    const runNode = paragraphNode.content.find(
      (n) => n.type === 'run' && Array.isArray(n.content) && n.content.some((c) => c.type === 'image'),
    );
    const drawingNode = runNode.content.find((c) => c.type === 'image');
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
    // Find the first paragraph that yields at least one ANCHORED image node
    let paragraphNode;
    let drawingNode;
    for (let i = 0; i < content.length; i++) {
      if (content[i].name !== 'w:p') continue;
      const { nodes } = handleParagraphNode({ nodes: [content[i]], docx, nodeListHandler: defaultNodeListHandler() });
      const maybeParagraph = nodes?.[0];
      if (!maybeParagraph) continue;
      const images = (maybeParagraph.content || []).flatMap((n) => {
        if (n?.type === 'run' && Array.isArray(n.content)) {
          return n.content.filter((c) => c?.type === 'image');
        }
        return n?.type === 'image' ? [n] : [];
      });
      const anchored = images.filter((img) => img?.attrs?.anchorData);
      if (!anchored.length) continue;
      paragraphNode = maybeParagraph;
      drawingNode = anchored[0];
      break;
    }
    expect(paragraphNode).toBeTruthy();
    expect(drawingNode).toBeTruthy();
    const { attrs } = drawingNode || {};
    const { anchorData } = attrs || {};

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
    let runNode = paragraphNode.content.find(
      (n) => n.type === 'run' && Array.isArray(n.content) && n.content.some((c) => c.type === 'image'),
    );
    let drawingNode = runNode.content.find((c) => c.type === 'image');
    const { attrs } = drawingNode;
    expect(attrs.src).toBe('media/image.png');

    const { nodes: nodes1 } = handleParagraphNode({
      nodes: [content[5]],
      docx,
      nodeListHandler: defaultNodeListHandler(),
    });
    paragraphNode = nodes1[0];
    const images2 = (paragraphNode.content || []).flatMap((n) => {
      if (n?.type === 'run' && Array.isArray(n.content)) {
        return n.content.filter((c) => c?.type === 'image');
      }
      return n?.type === 'image' ? [n] : [];
    });
    expect(images2.length).toBeGreaterThan(0);
    drawingNode = images2[0];
    expect(drawingNode?.attrs?.src).toBe('word/media/image1.jpeg');
  });
});
