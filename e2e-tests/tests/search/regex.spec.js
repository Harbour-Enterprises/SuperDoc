import { test, expect } from '@playwright/test';

test.describe('regex search', () => {
  test('matches placeholder braces with regex', async ({ page }) => {
    await page.goto('http://localhost:4173/');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./test-data/search-documents/regex-search.docx');

    await page.waitForFunction(
      () => {
        try {
          return Boolean(window.editor?.commands?.search);
        } catch (err) {
          return false;
        }
      },
      null,
      { polling: 100, timeout: 10_000 },
    );

    const { baselineMatch, matches } = await page.evaluate(() => {
      const editor = window.editor;
      if (!editor) throw new Error('Editor not ready');

      const target = '{DATE}';
      let placeholderRange = null;

      editor.state.doc.descendants((node, pos) => {
        if (placeholderRange || !node.isText) return undefined;
        const idx = node.text.indexOf(target);
        if (idx === -1) return undefined;
        placeholderRange = { from: pos + idx, to: pos + idx + target.length };
        return false;
      });

      if (!placeholderRange) {
        throw new Error('Could not find placeholder to wrap');
      }

      const baselineResults = editor.commands.search(/\{([^}]*)\}/gi);
      const baselineMatch = baselineResults.find(
        (match) => editor.state.doc.textBetween(match.from, match.to) === target,
      );

      const { state, view } = editor;
      const SelectionCtor = state.selection.constructor;
      const tr = state.tr.setSelection(SelectionCtor.create(state.doc, placeholderRange.from, placeholderRange.to));
      view.dispatch(tr);

      const toggled = editor.commands.toggleLink({ href: 'https://example.com', text: target });
      if (!toggled) {
        throw new Error('toggleLink command failed');
      }

      const results = editor.commands.search(/\{([^}]*)\}/gi);
      const mappedMatches = results.map((match) => ({
        text: editor.state.doc.textBetween(match.from, match.to),
        from: match.from,
        to: match.to,
      }));

      return {
        baselineMatch,
        matches: mappedMatches,
      };
    });

    expect(matches).toHaveLength(3);
    expect(matches[0].text).toBe('{DATE}');
    expect(baselineMatch?.from).toBeDefined();
    expect(baselineMatch?.to).toBeDefined();
    expect(matches[0].from).toBe(baselineMatch.from);
    expect(matches[0].to).toBe(baselineMatch.to);

    expect(matches.slice(1).map((m) => m.text)).toEqual(['{MONTH}', '{MONTH}']);

    matches.forEach((match) => {
      expect(match.from).toBeLessThan(match.to);
    });
  });
});
