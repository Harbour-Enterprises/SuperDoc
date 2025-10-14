import { describe, it, expect } from 'vitest';
import { createDocumentJson } from '@core/super-converter/v2/importer/docxImporter.js';
import { getTestDataByFileName } from '@tests/helpers/helpers.js';

describe('text-wrap anchored image import', () => {
  it('preserves anchor alignment when only alignment is provided', async () => {
    const docx = await getTestDataByFileName('text-wrap-images.docx');
    const result = createDocumentJson(docx);

    expect(result).toBeTruthy();
    const collectImages = (node, acc) => {
      if (!node) return acc;
      if (node.type === 'image') acc.push(node);
      if (Array.isArray(node.content)) {
        node.content.forEach((child) => collectImages(child, acc));
      }
      return acc;
    };

    const images = collectImages(result.pmDoc, []);

    expect(images.length).toBe(3);
    const anchoredImages = images.filter((img) => img.attrs.isAnchor);
    expect(anchoredImages.length).toBe(2);

    const leftAnchor = anchoredImages.find((img) => img.attrs.anchorData?.alignH === 'left');
    const rightAnchor = anchoredImages.find((img) => img.attrs.anchorData?.alignH === 'right');

    expect(leftAnchor).toBeTruthy();
    expect(rightAnchor).toBeTruthy();

    expect(leftAnchor.attrs.wrap.type).toBe('Square');
    expect(rightAnchor.attrs.wrap.type).toBe('Square');

    expect(leftAnchor.attrs.marginOffset.horizontal).toBeUndefined();
    expect(rightAnchor.attrs.marginOffset.horizontal).toBeUndefined();
  });
});
