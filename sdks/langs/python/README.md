# SuperDoc Python SDK

Headless DOCX operations from Python.

## Requirements

- Python 3.8+
- Node.js 18+

## Quick Start

```python
from superdoc_sdk import superdoc

# One-liners for common operations
html = superdoc.to_html("doc.docx")
markdown = superdoc.to_markdown("doc.docx")
json_data = superdoc.to_json("doc.docx")
metadata = superdoc.get_metadata("doc.docx")

# Modify and save
superdoc.insert_and_save("doc.docx", "<p>Hello!</p>", "output.docx")
```

## Full API

```python
from superdoc_sdk import SuperdocClient

with SuperdocClient().get_editor("input.docx") as editor:
    # Read
    editor.get_json()        # ProseMirror JSON
    editor.get_html()        # HTML string
    editor.get_markdown()    # Markdown string
    editor.get_metadata()    # Document metadata
    editor.get_lifecycle()   # 'idle' | 'ready' | 'destroyed'

    # Write
    editor.insert_content("<p>Hello!</p>")
    editor.export_docx("output.docx")

    # Lifecycle: reuse editor for multiple documents
    editor.close()           # Close doc, keep editor alive
    editor.open("other.docx")  # Open new doc in same editor
```

## Async API

```python
from superdoc_sdk import SuperdocAsyncClient

async with SuperdocAsyncClient() as client:
    async with await client.get_editor("input.docx") as editor:
        html = await editor.get_html()
        await editor.export_docx("output.docx")
```

## Run Example

```bash
cd sdks/langs/python/example
python3 example.py
```
