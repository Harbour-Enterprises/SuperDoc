import { loadTestDataForEditorTests, initTestEditor } from '@tests/helpers/helpers';
import { expect } from 'vitest';
import {
  getStructuredContentBlockTags,
  getStructuredContentInlineTags,
  getStructuredContentTags,
  getStructuredContentTagsById,
  getStructuredContentTagsByAlias,
} from '@extensions/structured-content/structuredContentHelpers/index';

describe('Structured content tests', () => {
  const filename = 'blank-doc.docx';
  let docx, media, mediaFiles, fonts, editor;

  beforeAll(async () => ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(filename)));
  beforeEach(() => ({ editor } = initTestEditor({ content: docx, media, mediaFiles, fonts })));

  it('tests commands and helpers for structued content inline', () => {
    editor.commands.insertStructuredContentInline({
      text: 'Structured content inline 1',
      attrs: { id: '1', alias: 'alias1' },
    });
    editor.commands.insertStructuredContentInline({
      json: { type: 'text', text: 'Structured content inline 2' },
      attrs: { id: '2', alias: 'alias2' },
    });

    expect(getStructuredContentTags(editor.state).length).toBe(2);
    expect(getStructuredContentInlineTags(editor.state).length).toBe(2);
    expect(getStructuredContentBlockTags(editor.state).length).toBe(0);

    expect(getStructuredContentTagsById('1', editor.state).length).toBe(1);
    expect(getStructuredContentTagsById('2', editor.state).length).toBe(1);
    expect(getStructuredContentTagsById(['1', '2'], editor.state).length).toBe(2);

    expect(getStructuredContentTagsByAlias('alias1', editor.state).length).toBe(1);
    expect(getStructuredContentTagsByAlias('alias2', editor.state).length).toBe(1);

    const structuredContent1 = getStructuredContentTagsById('1', editor.state)[0];
    const structuredContent2 = getStructuredContentTagsById('2', editor.state)[0];

    expect(structuredContent1.node.textContent).toBe('Structured content inline 1');
    expect(structuredContent2.node.textContent).toBe('Structured content inline 2');

    editor.commands.updateStructuredContentById('1', {
      text: 'Structured content inline 1 - Updated',
      attrs: { alias: 'Updated' },
    });
    editor.commands.updateStructuredContentByAlias('alias2', {
      json: { type: 'text', text: 'Structured content inline 2 - Updated by alias' },
    });

    const structuredContent1Updated = getStructuredContentTagsById('1', editor.state)[0];
    const structuredContent2Updated = getStructuredContentTagsByAlias('alias2', editor.state)[0];

    expect(structuredContent1Updated.node.textContent).toBe('Structured content inline 1 - Updated');
    expect(structuredContent2Updated.node.textContent).toBe('Structured content inline 2 - Updated by alias');

    expect(structuredContent1Updated.node.attrs.alias).toBe('Updated');

    editor.commands.deleteStructuredContentById(['1', '2']);

    expect(getStructuredContentTags(editor.state).length).toBe(0);
  });

  it('tests commands and helpers for structued content block', () => {
    editor.commands.insertStructuredContentBlock({
      html: '<p>Structured content block 1</p>',
      attrs: { id: '1', alias: 'blockAlias1' },
    });
    editor.commands.insertStructuredContentBlock({
      json: { type: 'paragraph', content: [{ type: 'text', text: 'Structured content block 2' }] },
      attrs: { id: '2', alias: 'blockAlias2' },
    });

    expect(getStructuredContentTags(editor.state).length).toBe(2);
    expect(getStructuredContentBlockTags(editor.state).length).toBe(2);
    expect(getStructuredContentInlineTags(editor.state).length).toBe(0);

    expect(getStructuredContentTagsById('1', editor.state).length).toBe(1);
    expect(getStructuredContentTagsById('2', editor.state).length).toBe(1);
    expect(getStructuredContentTagsById(['1', '2'], editor.state).length).toBe(2);

    expect(getStructuredContentTagsByAlias('blockAlias1', editor.state).length).toBe(1);
    expect(getStructuredContentTagsByAlias('blockAlias2', editor.state).length).toBe(1);

    const structuredContent1 = getStructuredContentTagsById('1', editor.state)[0];
    const structuredContent2 = getStructuredContentTagsById('2', editor.state)[0];

    expect(structuredContent1.node.textContent).toBe('Structured content block 1');
    expect(structuredContent2.node.textContent).toBe('Structured content block 2');

    editor.commands.updateStructuredContentById('1', {
      html: '<p>Structured content block 1 - Updated</p>',
      attrs: { alias: 'Updated' },
    });
    editor.commands.updateStructuredContentByAlias('blockAlias2', {
      json: { type: 'paragraph', content: [{ type: 'text', text: 'Structured content block 2 - Updated by alias' }] },
    });

    const structuredContent1Updated = getStructuredContentTagsById('1', editor.state)[0];
    const structuredContent2Updated = getStructuredContentTagsByAlias('blockAlias2', editor.state)[0];

    expect(structuredContent1Updated.node.textContent).toBe('Structured content block 1 - Updated');
    expect(structuredContent2Updated.node.textContent).toBe('Structured content block 2 - Updated by alias');

    expect(structuredContent1Updated.node.attrs.alias).toBe('Updated');

    editor.commands.deleteStructuredContent(getStructuredContentTags(editor.state));

    expect(getStructuredContentTags(editor.state).length).toBe(0);
  });

  it('tests updating multiple fields with same alias', () => {
    // Create 3 fields with same alias
    editor.commands.insertStructuredContentInline({
      text: 'Customer Name 1',
      attrs: { id: '1', alias: 'customer_name' },
    });
    editor.commands.insertStructuredContentInline({
      text: 'Customer Name 2',
      attrs: { id: '2', alias: 'customer_name' },
    });
    editor.commands.insertStructuredContentInline({
      text: 'Customer Name 3',
      attrs: { id: '3', alias: 'customer_name' },
    });

    // Verify all 3 have same alias
    expect(getStructuredContentTagsByAlias('customer_name', editor.state).length).toBe(3);

    // Update by alias should update ALL fields with that alias
    editor.commands.updateStructuredContentByAlias('customer_name', {
      text: 'John Doe',
    });

    // Verify all 3 were updated
    const updatedFields = getStructuredContentTagsByAlias('customer_name', editor.state);
    expect(updatedFields.length).toBe(3);
    expect(updatedFields[0].node.textContent).toBe('John Doe');
    expect(updatedFields[1].node.textContent).toBe('John Doe');
    expect(updatedFields[2].node.textContent).toBe('John Doe');

    // Update by ID should only update one
    editor.commands.updateStructuredContentById('2', {
      text: 'Jane Doe',
    });

    // Verify only the one with ID '2' changed
    const field1 = getStructuredContentTagsById('1', editor.state)[0];
    const field2 = getStructuredContentTagsById('2', editor.state)[0];
    const field3 = getStructuredContentTagsById('3', editor.state)[0];

    expect(field1.node.textContent).toBe('John Doe');
    expect(field2.node.textContent).toBe('Jane Doe');
    expect(field3.node.textContent).toBe('John Doe');
  });
});
