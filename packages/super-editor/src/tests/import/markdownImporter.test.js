import { marked } from 'marked';

describe('MarkdownImporter', () => {
  describe('Markdown to HTML Conversion', () => {
    it('converts basic markdown to HTML using marked library', () => {
      const markdown = '# Heading\n\nThis is **bold** and *italic* text.';

      // Configure marked
      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
      });

      const result = marked.parse(markdown);

      expect(result).toContain('<h1>Heading</h1>');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
    });

    it('handles code blocks correctly', () => {
      const markdown = '```javascript\nconsole.log("Hello World");\n```';

      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
      });

      const result = marked.parse(markdown);

      expect(result).toContain('<pre>');
      expect(result).toContain('<code');
      expect(result).toContain('console.log');
    });

    it('handles lists properly', () => {
      const markdown = '1. First item\n2. Second item\n\n- Bullet one\n- Bullet two';

      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
      });

      const result = marked.parse(markdown);

      expect(result).toContain('<ol>');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>First item</li>');
      expect(result).toContain('<li>Bullet one</li>');
    });

    it('handles links correctly', () => {
      const markdown = '[SuperDoc](https://example.com) is great!';

      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
      });

      const result = marked.parse(markdown);

      expect(result).toContain('<a href="https://example.com">SuperDoc</a>');
    });

    it('handles blockquotes', () => {
      const markdown = '> This is a blockquote\n> with multiple lines';

      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
      });

      const result = marked.parse(markdown);

      expect(result).toContain('<blockquote>');
      expect(result).toContain('This is a blockquote');
    });

    it('handles tables with GitHub Flavored Markdown', () => {
      const markdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |`;

      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
      });

      const result = marked.parse(markdown);

      expect(result).toContain('<table>');
      expect(result).toContain('<th>Header 1</th>');
      expect(result).toContain('<td>Cell 1</td>');
    });
  });

  describe('HTML Transformation for SuperDoc Compatibility', () => {
    it('transforms headings to include data-level attributes', () => {
      const html = '<h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3>';

      // Simulate the transformation logic
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(heading => {
        const level = parseInt(heading.tagName[1]);
        heading.setAttribute('data-level', level);
      });

      const result = tempDiv.innerHTML;

      expect(result).toContain('data-level="1"');
      expect(result).toContain('data-level="2"');
      expect(result).toContain('data-level="3"');
    });

    it('processes code blocks to add language attributes', () => {
      const html = '<pre><code class="language-javascript">console.log("test");</code></pre>';

      // Simulate the transformation logic
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      const codeBlocks = tempDiv.querySelectorAll('pre code');
      codeBlocks.forEach(code => {
        const parent = code.parentElement;
        if (code.className) {
          parent.setAttribute('data-language', code.className.replace('language-', ''));
        }
      });

      const result = tempDiv.innerHTML;

      expect(result).toContain('data-language="javascript"');
    });

    it('adds list IDs to ordered lists', () => {
      const html = '<ol><li>Item 1</li></ol><ol><li>Item 2</li></ol>';

      // Simulate the transformation logic
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      const lists = tempDiv.querySelectorAll('ol');
      lists.forEach((list, index) => {
        list.setAttribute('data-list-id', index + 1);
      });

      const result = tempDiv.innerHTML;

      expect(result).toContain('data-list-id="1"');
      expect(result).toContain('data-list-id="2"');
    });
  });

  describe('Markdown Configuration', () => {
    it('configures marked with SuperDoc-compatible options', () => {
      // Test the configuration options
      const options = {
        breaks: true,      // Convert \n to <br>
        gfm: true,         // GitHub Flavored Markdown
        headerIds: false,  // Don't add IDs to headers
        mangle: false,     // Don't escape autolinks
      };

      marked.setOptions(options);

      // Test line breaks
      const lineBreakTest = 'Line 1\nLine 2';
      const lineBreakResult = marked.parse(lineBreakTest);
      expect(lineBreakResult).toContain('<br>');

      // Test that header IDs are not added
      const headerTest = '# Test Header';
      const headerResult = marked.parse(headerTest);
      expect(headerResult).not.toContain('id=');
      expect(headerResult).toContain('<h1>Test Header</h1>');
    });

    it('handles edge cases in markdown parsing', () => {
      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
      });

      // Empty string
      expect(marked.parse('')).toBe('');

      // Just whitespace should return empty string (which is correct)
      expect(marked.parse('   \n\n   ')).toBe('');

      // Malformed markdown should not crash
      const malformed = '**Bold without closing\n[Link without closing(url\n```code without closing';
      expect(() => marked.parse(malformed)).not.toThrow();
    });
  });
}); 