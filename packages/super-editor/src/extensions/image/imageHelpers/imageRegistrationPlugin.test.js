import { describe, it, expect, vi } from 'vitest';

vi.mock('@extensions/image/imageHelpers/startImageUpload.js', () => ({
  addImageRelationship: vi.fn(() => null),
}));

import { handleNodePath } from './imageRegistrationPlugin.js';

const createStateStub = () => ({
  tr: {
    setNodeMarkup: vi.fn(),
  },
});

const createEditorStub = () => ({
  storage: {
    image: {
      media: {},
    },
  },
  options: {
    mode: 'docx',
  },
});

describe('handleNodePath', () => {
  it('registers unique media paths for duplicate base64 images', () => {
    const payload = 'duplicate-image';
    const base64 = `data:image/png;base64,${Buffer.from(payload).toString('base64')}`;

    const foundImages = [
      { node: { attrs: { src: base64 } }, pos: 0 },
      { node: { attrs: { src: base64 } }, pos: 5 },
    ];

    const state = createStateStub();
    const editor = createEditorStub();

    handleNodePath(foundImages, editor, state);

    const mediaEntries = Object.entries(editor.storage.image.media);

    expect(mediaEntries).toHaveLength(2);
    const [firstPath] = mediaEntries[0];
    const [secondPath] = mediaEntries[1];

    expect(firstPath).toMatch(/^word\/media\//);
    expect(secondPath).toMatch(/^word\/media\//);

    const firstName = firstPath.split('/').pop();
    const secondName = secondPath.split('/').pop();

    expect(firstName).not.toBe(secondName);

    const [base, ext = ''] = firstName.split(/\.(?=[^.]+$)/);
    if (ext) {
      expect(secondName).toBe(`${base}-1.${ext}`);
    } else {
      expect(secondName).toBe(`${base}-1`);
    }

    expect(mediaEntries[0][1]).toBe(base64);
    expect(mediaEntries[1][1]).toBe(base64);

    expect(state.tr.setNodeMarkup).toHaveBeenCalledTimes(2);
    expect(state.tr.setNodeMarkup).toHaveBeenNthCalledWith(
      1,
      foundImages[0].pos,
      undefined,
      expect.objectContaining({ src: firstPath }),
    );
    expect(state.tr.setNodeMarkup).toHaveBeenNthCalledWith(
      2,
      foundImages[1].pos,
      undefined,
      expect.objectContaining({ src: secondPath }),
    );
  });
});
