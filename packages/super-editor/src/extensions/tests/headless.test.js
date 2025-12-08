/**
 * Headless Mode Node View Tests
 *
 * Focused test suite verifying node views are properly disabled in headless mode
 * while maintaining full document functionality.
 */

import { describe, it, expect } from 'vitest';
import { Editor } from '@core/Editor.js';
import { getStarterExtensions } from '@extensions/index.js';
import { getTestDataAsFileBuffer } from '@tests/helpers/helpers.js';

describe('Headless Mode Optimization', () => {
  it('should filter optimized node views in headless mode', async () => {
    const buffer = await getTestDataAsFileBuffer('complex2.docx');
    const [content, , mediaFiles, fonts] = await Editor.loadXmlData(buffer, true);

    const editor = new Editor({
      isHeadless: true,
      mode: 'docx',
      documentId: 'headless-test',
      extensions: getStarterExtensions(),
      content,
      mediaFiles,
      fonts,
    });

    const nodeViews = editor.extensionService.nodeViews;
    const activeNodeViewNames = Object.keys(nodeViews);

    // Optimized node views that shouldn't be present in headless mode
    const optimizedNodeViews = ['paragraph'];

    optimizedNodeViews.forEach((name) => {
      expect(activeNodeViewNames).not.toContain(name);
    });

    editor.destroy();
  });

  it('should maintain full document functionality without node views', async () => {
    const buffer = await getTestDataAsFileBuffer('simple-ordered-list.docx');
    const [content, , mediaFiles, fonts] = await Editor.loadXmlData(buffer, true);

    const editor = new Editor({
      isHeadless: true,
      mode: 'docx',
      documentId: 'headless-functionality',
      extensions: getStarterExtensions(),
      content,
      mediaFiles,
      fonts,
    });

    // Check for document import
    const json = editor.getJSON();
    expect(json.type).toBe('doc');
    expect(json.content.length).toBeGreaterThan(0);

    // Check for document edit
    expect(editor.commands.toggleOrderedList).toBeDefined();
    editor.commands.insertContent({
      type: 'paragraph',
      content: [{ type: 'text', text: 'Test' }],
    });
    expect(editor.state.doc.textContent).toContain('Test');

    // Check export still works
    const exported = await editor.exportDocx();
    expect(Buffer.isBuffer(exported)).toBe(true);
    expect(exported.length).toBeGreaterThan(0);

    editor.destroy();
  });

  it('preserves list attributes in headless mode even without node views', async () => {
    const buffer = await getTestDataAsFileBuffer('simple-ordered-list.docx');
    const [content, , mediaFiles, fonts] = await Editor.loadXmlData(buffer, true);

    const editor = new Editor({
      isHeadless: true,
      mode: 'docx',
      documentId: 'headless-list-attrs',
      extensions: getStarterExtensions(),
      content,
      mediaFiles,
      fonts,
    });

    const json = editor.getJSON();
    const stack = [...(json.content || [])];
    let listItemNode = null;

    while (stack.length && !listItemNode) {
      const node = stack.shift();
      if (node.type === 'paragraph' && node.attrs?.paragraphProperties?.numberingProperties != null) {
        listItemNode = node;
        break;
      }
      if (Array.isArray(node?.content)) {
        stack.push(...node.content);
      }
    }

    expect(listItemNode).toBeTruthy();
    expect(listItemNode.attrs.listRendering.path.length).toBeGreaterThan(0);
    expect(listItemNode?.attrs.paragraphProperties?.numberingProperties?.numId).toBe(1);
    expect(listItemNode?.attrs.paragraphProperties?.numberingProperties?.ilvl).toBe(0);

    editor.destroy();
  });
});
