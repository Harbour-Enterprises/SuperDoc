import { loadTestDataForEditorTests, initTestEditor } from '@tests/helpers/helpers';
import { expect } from 'vitest';
import {
  getStructuredContentBlockTags,
  getStructuredContentInlineTags,
  getStructuredContentTags,
  getStructuredContentTagsById,
  getStructuredContentTagsByTag,
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

  it('tests tag-based operations for inline structured content', () => {
    // Create multiple fields with the same tag
    editor.commands.insertStructuredContentInline({
      text: 'Customer Name 1',
      attrs: { id: '1', tag: 'customer-info', alias: 'Customer' },
    });
    editor.commands.insertStructuredContentInline({
      text: 'Customer Name 2',
      attrs: { id: '2', tag: 'customer-info', alias: 'Customer' },
    });
    editor.commands.insertStructuredContentInline({
      text: 'Customer Name 3',
      attrs: { id: '3', tag: 'customer-info', alias: 'Customer' },
    });
    editor.commands.insertStructuredContentInline({
      text: 'Invoice Number',
      attrs: { id: '4', tag: 'invoice-info', alias: 'Invoice' },
    });

    // Test retrieval by tag
    const customerFields = getStructuredContentTagsByTag('customer-info', editor.state);
    const invoiceFields = getStructuredContentTagsByTag('invoice-info', editor.state);

    expect(customerFields.length).toBe(3);
    expect(invoiceFields.length).toBe(1);

    expect(customerFields[0].node.textContent).toBe('Customer Name 1');
    expect(customerFields[1].node.textContent).toBe('Customer Name 2');
    expect(customerFields[2].node.textContent).toBe('Customer Name 3');
    expect(invoiceFields[0].node.textContent).toBe('Invoice Number');

    // Test retrieval by multiple tags
    const multipleTagFields = getStructuredContentTagsByTag(['customer-info', 'invoice-info'], editor.state);
    expect(multipleTagFields.length).toBe(4);

    // Test update all fields by tag
    editor.commands.updateStructuredContentByTag('customer-info', {
      text: 'John Doe',
      attrs: { alias: 'Customer Updated' },
    });

    const updatedCustomerFields = getStructuredContentTagsByTag('customer-info', editor.state);
    expect(updatedCustomerFields.length).toBe(3);
    expect(updatedCustomerFields[0].node.textContent).toBe('John Doe');
    expect(updatedCustomerFields[1].node.textContent).toBe('John Doe');
    expect(updatedCustomerFields[2].node.textContent).toBe('John Doe');
    expect(updatedCustomerFields[0].node.attrs.alias).toBe('Customer Updated');

    // Invoice field should remain unchanged
    const unchangedInvoiceFields = getStructuredContentTagsByTag('invoice-info', editor.state);
    expect(unchangedInvoiceFields[0].node.textContent).toBe('Invoice Number');

    // Test delete by tag
    editor.commands.deleteStructuredContentByTag('customer-info');

    expect(getStructuredContentTagsByTag('customer-info', editor.state).length).toBe(0);
    expect(getStructuredContentTagsByTag('invoice-info', editor.state).length).toBe(1);
    expect(getStructuredContentTags(editor.state).length).toBe(1);

    // Clean up
    editor.commands.deleteStructuredContentByTag('invoice-info');
    expect(getStructuredContentTags(editor.state).length).toBe(0);
  });

  it('tests tag-based operations for block structured content', () => {
    // Create multiple blocks with the same tag
    editor.commands.insertStructuredContentBlock({
      html: '<p>Terms Section 1</p>',
      attrs: { id: '1', tag: 'terms', alias: 'Terms' },
    });
    editor.commands.insertStructuredContentBlock({
      html: '<p>Terms Section 2</p>',
      attrs: { id: '2', tag: 'terms', alias: 'Terms' },
    });
    editor.commands.insertStructuredContentBlock({
      html: '<p>Privacy Policy</p>',
      attrs: { id: '3', tag: 'privacy', alias: 'Privacy' },
    });

    // Test retrieval by tag
    const termsBlocks = getStructuredContentTagsByTag('terms', editor.state);
    const privacyBlocks = getStructuredContentTagsByTag('privacy', editor.state);

    expect(termsBlocks.length).toBe(2);
    expect(privacyBlocks.length).toBe(1);

    // Test update all blocks by tag
    editor.commands.updateStructuredContentByTag('terms', {
      html: '<p>Updated Terms Content</p>',
      attrs: { alias: 'Terms Updated' },
    });

    const updatedTermsBlocks = getStructuredContentTagsByTag('terms', editor.state);
    expect(updatedTermsBlocks.length).toBe(2);
    expect(updatedTermsBlocks[0].node.textContent).toBe('Updated Terms Content');
    expect(updatedTermsBlocks[1].node.textContent).toBe('Updated Terms Content');
    expect(updatedTermsBlocks[0].node.attrs.alias).toBe('Terms Updated');

    // Test delete multiple tags at once
    editor.commands.deleteStructuredContentByTag(['terms', 'privacy']);
    expect(getStructuredContentTags(editor.state).length).toBe(0);
  });

  it('tests mixed operations with tag and id', () => {
    // Create fields with tags
    editor.commands.insertStructuredContentInline({
      text: 'Field 1',
      attrs: { id: '1', tag: 'group-a' },
    });
    editor.commands.insertStructuredContentInline({
      text: 'Field 2',
      attrs: { id: '2', tag: 'group-a' },
    });
    editor.commands.insertStructuredContentInline({
      text: 'Field 3',
      attrs: { id: '3', tag: 'group-b' },
    });

    // Update by tag
    editor.commands.updateStructuredContentByTag('group-a', { text: 'Updated by tag' });

    // Update one specific field by id
    editor.commands.updateStructuredContentById('2', { text: 'Updated by id' });

    const field1 = getStructuredContentTagsById('1', editor.state)[0];
    const field2 = getStructuredContentTagsById('2', editor.state)[0];
    const field3 = getStructuredContentTagsById('3', editor.state)[0];

    expect(field1.node.textContent).toBe('Updated by tag');
    expect(field2.node.textContent).toBe('Updated by id');
    expect(field3.node.textContent).toBe('Field 3');

    // Delete by id, then by tag
    editor.commands.deleteStructuredContentById('1');
    expect(getStructuredContentTagsByTag('group-a', editor.state).length).toBe(1);

    editor.commands.deleteStructuredContentByTag('group-a');
    expect(getStructuredContentTagsByTag('group-a', editor.state).length).toBe(0);
    expect(getStructuredContentTags(editor.state).length).toBe(1);

    // Clean up
    editor.commands.deleteStructuredContentByTag('group-b');
  });

  it('tests tag operations with mixed inline and block content', () => {
    // Create mixed content with same tag
    editor.commands.insertStructuredContentInline({
      text: 'Inline Header',
      attrs: { id: '1', tag: 'header' },
    });
    editor.commands.insertStructuredContentBlock({
      html: '<p>Block Header</p>',
      attrs: { id: '2', tag: 'header' },
    });
    editor.commands.insertStructuredContentInline({
      text: 'Another Inline Header',
      attrs: { id: '3', tag: 'header' },
    });

    // Should find all types with the same tag
    const headerFields = getStructuredContentTagsByTag('header', editor.state);
    expect(headerFields.length).toBe(3);

    // Update all by tag
    editor.commands.updateStructuredContentByTag('header', {
      attrs: { alias: 'Header Updated' },
    });

    const updatedHeaders = getStructuredContentTagsByTag('header', editor.state);
    expect(updatedHeaders[0].node.attrs.alias).toBe('Header Updated');
    expect(updatedHeaders[1].node.attrs.alias).toBe('Header Updated');
    expect(updatedHeaders[2].node.attrs.alias).toBe('Header Updated');

    // Delete all by tag
    editor.commands.deleteStructuredContentByTag('header');
    expect(getStructuredContentTags(editor.state).length).toBe(0);
  });

  it('tests tag operations with non-existent tags', () => {
    // Try to get non-existent tag
    const nonExistent = getStructuredContentTagsByTag('non-existent', editor.state);
    expect(nonExistent.length).toBe(0);

    // Try to update non-existent tag (should not throw error)
    expect(() => {
      editor.commands.updateStructuredContentByTag('non-existent', { text: 'Test' });
    }).not.toThrow();

    // Try to delete non-existent tag (should not throw error)
    expect(() => {
      editor.commands.deleteStructuredContentByTag('non-existent');
    }).not.toThrow();
  });
});
