# Sample Markdown Document

This is a sample markdown document used for testing SuperDoc's markdown import functionality.

## Features Demonstrated

### Text Formatting

This document contains **bold text**, _italic text_, and `inline code` examples.

### Lists

#### Ordered List

1. First item
2. Second item with **bold** text
3. Third item with _italic_ text

#### Unordered List

- Bullet point one
- Bullet point two with `code`
- Bullet point three

### Code Blocks

```javascript
// JavaScript example
function greetUser(name) {
  console.log(`Hello, ${name}!`);
  return `Welcome to SuperDoc`;
}

greetUser('Developer');
```

```python
# Python example
def calculate_sum(a, b):
    """Calculate the sum of two numbers."""
    return a + b

result = calculate_sum(5, 3)
print(f"The sum is: {result}")
```

### Links and References

Visit [SuperDoc Documentation](https://superdoc.com/docs) for comprehensive guides.

For support, contact us at [support@superdoc.com](mailto:support@superdoc.com).

### Blockquotes

> "The best way to predict the future is to create it."
>
> This blockquote demonstrates how markdown blockquotes are converted to proper document formatting.

### Tables

| Feature     | Status      | Priority |
| ----------- | ----------- | -------- |
| Headers     | ✅ Complete | High     |
| Lists       | ✅ Complete | High     |
| Code Blocks | ✅ Complete | Medium   |
| Tables      | 🔄 Testing  | Medium   |
| Images      | ⏳ Planned  | Low      |

### Mixed Content Example

Here's a paragraph that combines **bold text**, _italic text_, and `inline code` with a [link to documentation](https://example.com).

```bash
# Terminal commands
npm install @harbour-enterprises/superdoc
npm run build
npm test
```

> **Note:** This sample document covers most common markdown features to ensure comprehensive testing of the conversion pipeline.

## Conclusion

This markdown document should convert cleanly to both HTML and DOCX formats through SuperDoc's conversion pipeline, preserving all formatting and structure.
