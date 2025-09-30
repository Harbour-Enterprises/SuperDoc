import { loadTestDataForEditorTests, initTestEditor } from '@tests/helpers/helpers';
import { expect } from 'vitest';
import {
  getStructuredContentBlockTags,
  getStructuredContentInlineTags,
  getStructuredContentTags,
  getStructuredContentTagsById,
} from '@extensions/structured-content/structuredContentHelpers/index';

describe('Structured content tests', () => {
  const filename = 'blank-doc.docx';
  let docx, media, mediaFiles, fonts, editor;

  beforeAll(async () => ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(filename)));
  beforeEach(() => ({ editor } = initTestEditor({ content: docx, media, mediaFiles, fonts })));

  it('tests commands and helpers for structued content inline', () => {
    editor.commands.insertStructuredContentInline({
      text: 'Structured content inline 1',
      attrs: { id: '1' },
    });
    editor.commands.insertStructuredContentInline({
      json: { type: 'text', text: 'Structured content inline 2' },
      attrs: { id: '2' },
    });

    expect(getStructuredContentTags(editor.state).length).toBe(2);
    expect(getStructuredContentInlineTags(editor.state).length).toBe(2);
    expect(getStructuredContentBlockTags(editor.state).length).toBe(0);

    expect(getStructuredContentTagsById('1', editor.state).length).toBe(1);
    expect(getStructuredContentTagsById('2', editor.state).length).toBe(1);
    expect(getStructuredContentTagsById(['1', '2'], editor.state).length).toBe(2);

    const structuredContent1 = getStructuredContentTagsById('1', editor.state)[0];
    const structuredContent2 = getStructuredContentTagsById('2', editor.state)[0];

    expect(structuredContent1.node.textContent).toBe('Structured content inline 1');
    expect(structuredContent2.node.textContent).toBe('Structured content inline 2');

    editor.commands.updateStructuredContentById('1', {
      text: 'Structured content inline 1 - Updated',
      attrs: { alias: 'Updated' },
    });
    editor.commands.updateStructuredContentById('2', {
      json: { type: 'text', text: 'Structured content inline 2 - Updated' },
      attrs: { alias: 'Updated' },
    });

    const structuredContent1Updated = getStructuredContentTagsById('1', editor.state)[0];
    const structuredContent2Updated = getStructuredContentTagsById('2', editor.state)[0];

    expect(structuredContent1Updated.node.textContent).toBe('Structured content inline 1 - Updated');
    expect(structuredContent2Updated.node.textContent).toBe('Structured content inline 2 - Updated');

    expect(structuredContent1Updated.node.attrs.alias).toBe('Updated');
    expect(structuredContent2Updated.node.attrs.alias).toBe('Updated');

    editor.commands.deleteStructuredContentById(['1', '2']);

    expect(getStructuredContentTags(editor.state).length).toBe(0);
  });

  it('tests commands and helpers for structued content block', () => {
    editor.commands.insertStructuredContentBlock({
      html: '<p>Structured content block 1</p>',
      attrs: { id: '1' },
    });
    editor.commands.insertStructuredContentBlock({
      json: { type: 'paragraph', content: [{ type: 'text', text: 'Structured content block 2' }] },
      attrs: { id: '2' },
    });

    expect(getStructuredContentTags(editor.state).length).toBe(2);
    expect(getStructuredContentBlockTags(editor.state).length).toBe(2);
    expect(getStructuredContentInlineTags(editor.state).length).toBe(0);

    expect(getStructuredContentTagsById('1', editor.state).length).toBe(1);
    expect(getStructuredContentTagsById('2', editor.state).length).toBe(1);
    expect(getStructuredContentTagsById(['1', '2'], editor.state).length).toBe(2);

    const structuredContent1 = getStructuredContentTagsById('1', editor.state)[0];
    const structuredContent2 = getStructuredContentTagsById('2', editor.state)[0];

    expect(structuredContent1.node.textContent).toBe('Structured content block 1');
    expect(structuredContent2.node.textContent).toBe('Structured content block 2');

    editor.commands.updateStructuredContentById('1', {
      html: '<p>Structured content block 1 - Updated</p>',
      attrs: { alias: 'Updated' },
    });
    editor.commands.updateStructuredContentById('2', {
      json: { type: 'paragraph', content: [{ type: 'text', text: 'Structured content block 2 - Updated' }] },
      attrs: { alias: 'Updated' },
    });

    const structuredContent1Updated = getStructuredContentTagsById('1', editor.state)[0];
    const structuredContent2Updated = getStructuredContentTagsById('2', editor.state)[0];

    expect(structuredContent1Updated.node.textContent).toBe('Structured content block 1 - Updated');
    expect(structuredContent2Updated.node.textContent).toBe('Structured content block 2 - Updated');

    expect(structuredContent1Updated.node.attrs.alias).toBe('Updated');
    expect(structuredContent2Updated.node.attrs.alias).toBe('Updated');

    editor.commands.deleteStructuredContent(getStructuredContentTags(editor.state));

    expect(getStructuredContentTags(editor.state).length).toBe(0);
  });
});
