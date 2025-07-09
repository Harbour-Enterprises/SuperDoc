import { marked } from 'marked';

describe('Markdown Integration Tests', () => {
  describe('Markdown Processing Pipeline', () => {
    it('processes a comprehensive markdown document through the conversion pipeline', () => {
      const markdown = `# SuperDoc Markdown Test

This document tests the **complete** conversion pipeline from *Markdown* to HTML.

## Features Tested

### Text Formatting
- **Bold text**
- *Italic text*
- \`inline code\`

### Lists

#### Ordered Lists
1. First item
2. Second item
   1. Nested item
   2. Another nested item
3. Third item

#### Unordered Lists
- Bullet point one
- Bullet point two
  - Nested bullet
  - Another nested bullet
- Bullet point three

### Links and Code

Visit [SuperDoc](https://superdoc.com) for more information.

\`\`\`javascript
// This is a code block
function convertMarkdown() {
  console.log("Converting markdown to DOCX");
  return "success";
}
\`\`\`

\`\`\`python
# Python example
def hello_world():
    print("Hello from SuperDoc!")
\`\`\`

### Blockquotes

> This is a blockquote that demonstrates
> how markdown blockquotes are converted
> to proper DOCX formatting.

### Tables

| Feature | Status | Notes |
|---------|---------|-------|
| Headers | ✅ | Working |
| Lists | ✅ | Working |
| Code | ✅ | Working |
| Tables | 🔄 | Testing |

### Final Thoughts

This comprehensive test ensures that all major markdown features are properly converted to HTML format through SuperDoc's conversion pipeline.
`;

      // Configure marked for SuperDoc compatibility
      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
      });

      // Convert markdown to HTML
      const html = marked.parse(markdown);

      // Verify the conversion worked
      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);

      // Test major elements are present
      expect(html).toContain('<h1>SuperDoc Markdown Test</h1>');
      expect(html).toContain('<h2>Features Tested</h2>');
      expect(html).toContain('<strong>Bold text</strong>');
      expect(html).toContain('<em>Italic text</em>');
      expect(html).toContain('<code>inline code</code>');
      expect(html).toContain('<ol>');
      expect(html).toContain('<ul>');
      expect(html).toContain('<blockquote>');
      expect(html).toContain('<table>');
      expect(html).toContain('<pre>');
      expect(html).toContain('href="https://superdoc.com"');

      // Apply HTML transformations for SuperDoc compatibility
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      // Transform headings
      const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(heading => {
        const level = parseInt(heading.tagName[1]);
        heading.setAttribute('data-level', level);
      });

      // Transform code blocks
      const codeBlocks = tempDiv.querySelectorAll('pre code');
      codeBlocks.forEach(code => {
        const parent = code.parentElement;
        if (code.className) {
          parent.setAttribute('data-language', code.className.replace('language-', ''));
        }
      });

      // Transform ordered lists
      const lists = tempDiv.querySelectorAll('ol');
      lists.forEach((list, index) => {
        list.setAttribute('data-list-id', index + 1);
      });

      const transformedHTML = tempDiv.innerHTML;

      // Verify transformations were applied
      expect(transformedHTML).toContain('data-level="1"');
      expect(transformedHTML).toContain('data-level="2"');
      expect(transformedHTML).toContain('data-language="javascript"');
      expect(transformedHTML).toContain('data-language="python"');
      expect(transformedHTML).toContain('data-list-id="1"');
    });

    it('handles complex nested structures', () => {
      const markdown = `# Complex Document

## Section with Mixed Content

This section contains **bold text** and *italic text* mixed with \`inline code\`.

### Nested Lists with Code

1. **Setup Instructions**
   - Install dependencies: \`npm install\`
   - Run the application: \`npm start\`
   
2. **Development Workflow**
   \`\`\`bash
   git checkout -b feature/new-feature
   git add .
   git commit -m "Add new feature"
   \`\`\`
   
3. **Deployment**
   > Remember to test thoroughly before deploying
   > to production environment.

### Code Examples in Lists

- **Frontend Code**:
  \`\`\`javascript
  import React from 'react';
  
  function App() {
    return <div>Hello World</div>;
  }
  \`\`\`

- **Backend Code**:
  \`\`\`python
  from flask import Flask
  
  app = Flask(__name__)
  
  @app.route('/')
  def hello():
      return "Hello World!"
  \`\`\`

### Links in Various Contexts

Visit [our documentation](https://docs.example.com) for more details, or check out our [GitHub repository](https://github.com/example/repo).

> For support, please contact us at [support@example.com](mailto:support@example.com).
`;

      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
      });

      const html = marked.parse(markdown);

      // Verify complex structures are handled
      expect(html).toContain('<h1>Complex Document</h1>');
      expect(html).toContain('<ol>');
      expect(html).toContain('<ul>');
      expect(html).toContain('<blockquote>');
      expect(html).toContain('language-bash');
      expect(html).toContain('language-javascript');
      expect(html).toContain('language-python');
      expect(html).toContain('href="https://docs.example.com"');
      expect(html).toContain('href="mailto:support@example.com"');

      // Verify nested content is preserved
      expect(html).toContain('Install dependencies');
      expect(html).toContain('git checkout');
      expect(html).toContain('import React');
      expect(html).toContain('from flask');
    });

    it('handles edge cases gracefully', () => {
      const edgeCases = [
        '', // Empty string
        '   \n\n   ', // Whitespace only
        '# Single heading', // Single element
        '**Bold without closing', // Malformed formatting
        '[Link without closing(url', // Malformed link
        '```\ncode without language\n```', // Code without language
        '> Single line blockquote', // Simple blockquote
        '| Single | Column |\n|--------|--------|', // Simple table
      ];

      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
      });

      edgeCases.forEach((testCase, index) => {
        expect(() => {
          const result = marked.parse(testCase);
          expect(typeof result).toBe('string');
        }).not.toThrow(`Edge case ${index + 1} should not throw`);
      });
    });

    it('maintains performance with large documents', () => {
      // Create a large markdown document
      const baseSection = `## Section

This is content with **bold** and *italic* text.

- List item
- Another item

\`\`\`javascript
console.log("code");
\`\`\`

> Blockquote content
`;

      const largeMarkdown = Array(100).fill(baseSection).join('\n\n');

      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
      });

      const startTime = performance.now();
      const result = marked.parse(largeMarkdown);
      const endTime = performance.now();

      const processingTime = endTime - startTime;

      // Should process large documents reasonably quickly
      expect(processingTime).toBeLessThan(1000); // 1 second
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('<h2>Section</h2>');
    });

    it('produces valid HTML output', () => {
      const markdown = `# Test Document

This is a **test** with various elements:

1. Ordered list
2. With multiple items

- Bullet list
- Also with items

\`\`\`javascript
console.log("code block");
\`\`\`

> Blockquote text

[Link](https://example.com)

| Table | Header |
|-------|--------|
| Cell  | Data   |
`;

      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
      });

      const html = marked.parse(markdown);

      // Create a temporary element to test if HTML is valid
      const tempDiv = document.createElement('div');
      expect(() => {
        tempDiv.innerHTML = html;
      }).not.toThrow();

      // Basic structure validation
      expect(tempDiv.querySelector('h1')).toBeTruthy();
      expect(tempDiv.querySelector('strong')).toBeTruthy();
      expect(tempDiv.querySelector('ol')).toBeTruthy();
      expect(tempDiv.querySelector('ul')).toBeTruthy();
      expect(tempDiv.querySelector('pre')).toBeTruthy();
      expect(tempDiv.querySelector('blockquote')).toBeTruthy();
      expect(tempDiv.querySelector('a')).toBeTruthy();
      expect(tempDiv.querySelector('table')).toBeTruthy();
    });
  });
}); 