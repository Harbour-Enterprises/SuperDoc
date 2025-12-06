import { describe, it, expect } from 'vitest';
import { loadTestDataForEditorTests, initTestEditor } from '@tests/helpers/helpers.js';

describe('OnlyOffice import test', () => {
  it('should import OnlyOffice document "Unique font.docx" without errors', async () => {
    const { docx } = await loadTestDataForEditorTests('Unique font.docx');

    // Create editor
    const { editor } = await initTestEditor({ content: docx });

    // Verify document loaded with content
    const doc = editor.state?.doc;
    expect(editor).toBeDefined();
    expect(doc?.content?.childCount).toBe(3); // 3 paragraphs

    // Check that paragraphs have text content
    const firstPara = doc?.content?.child(0);
    expect(firstPara?.textContent).toContain('This is Arial');

    const secondPara = doc?.content?.child(1);
    expect(secondPara?.textContent).toContain('This is Time New Roman');

    const thirdPara = doc?.content?.child(2);
    expect(thirdPara?.textContent).toContain('Maellen');
  });

  it('should import OnlyOffice document "Simple OnlyOffice.docx" without errors', async () => {
    const { docx } = await loadTestDataForEditorTests('Simple OnlyOffice.docx');

    // Create editor
    const { editor } = await initTestEditor({ content: docx });

    // Verify document loaded with content
    expect(editor).toBeDefined();
    expect(editor.state?.doc?.content?.childCount).toBeGreaterThan(0);

    // Check that there's some text content
    const textContent = editor.state?.doc?.textContent;
    expect(textContent?.length).toBeGreaterThan(0);
  });
});
