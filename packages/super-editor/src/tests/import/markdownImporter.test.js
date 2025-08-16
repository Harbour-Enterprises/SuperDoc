import { marked } from 'marked';

// Helper function to simulate the SuperDoc attribute addition
const addSuperDocAttributes = (html) => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // 1. Headings need data-level
  tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    h.setAttribute('data-level', h.tagName[1]);
  });

  // 2. Code blocks benefit from language info
  tempDiv.querySelectorAll('pre code').forEach((code) => {
    const lang = code.className.replace('language-', '');
    if (lang) code.parentElement.setAttribute('data-language', lang);
  });

  return tempDiv.innerHTML;
};

describe('Markdown Basics', () => {
  it('converts markdown to HTML', () => {
    const md = '# Title\n\nParagraph with **bold**';
    const html = marked.parse(md);

    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('adds SuperDoc attributes', () => {
    const html = '<h1>Title</h1><pre><code class="language-js">code</code></pre>';
    const transformed = addSuperDocAttributes(html);

    expect(transformed).toContain('data-level="1"');
    expect(transformed).toContain('data-language="js"');
  });

  it('handles basic markdown features', () => {
    // Configure marked with sensible defaults
    marked.setOptions({
      breaks: true, // Respect line breaks
      gfm: true, // GitHub flavored markdown (tables, etc)
    });

    const testMD = `# Test Document

This tests **basic** markdown features.

\`\`\`javascript
console.log("It works!");
\`\`\`

- List item one
- List item two

| Header | Value |
|--------|-------|
| Cell   | Data  |`;

    const html = marked.parse(testMD);
    const result = addSuperDocAttributes(html);

    // Check essential features work
    expect(result).toContain('<h1');
    expect(result).toContain('data-level="1"');
    expect(result).toContain('<strong>basic</strong>');
    expect(result).toContain('<ul>');
    expect(result).toContain('<table>');
  });

  it('handles errors gracefully', () => {
    // Empty markdown should not crash
    expect(() => marked.parse('')).not.toThrow();
    expect(() => addSuperDocAttributes('')).not.toThrow();

    // Malformed markdown should not crash
    const malformed = '**Bold without closing\n```code without closing';
    expect(() => marked.parse(malformed)).not.toThrow();
  });
});
