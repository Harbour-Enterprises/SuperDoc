#!/usr/bin/env python3
"""
SuperDoc SDK Python Example

Just run:
    python3 example.py [path-to-docx]

The SDK automatically starts the runtime - no manual setup needed.
"""

import sys
from pathlib import Path

# Add parent dir to path to import superdoc_sdk
sys.path.insert(0, str(Path(__file__).parent.parent))

from superdoc_sdk import SuperdocClient

# Get docx path from args or use default
docx_path = sys.argv[1] if len(sys.argv) > 1 else "../../../../packages/super-editor/src/tests/data/Hello docx world.docx"
docx_path = Path(__file__).parent / docx_path

print(f"\n📄 Loading: {docx_path}\n")

# Get an editor (runtime starts automatically)
with SuperdocClient().get_editor(docx_path) as editor:
    # Check lifecycle state
    print(f"📊 Lifecycle: {editor.get_lifecycle()}\n")

    # Get JSON
    json_data = editor.get_json()
    import json
    print("📋 Document JSON (preview):")
    print(json.dumps(json_data, indent=2)[:500] + "...\n")

    # Get metadata
    metadata = editor.get_metadata()
    print(f"ℹ️  Metadata: {metadata}\n")

    # Get HTML
    html = editor.get_html()
    print("🌐 HTML (preview):")
    print(html[:300] + "...\n")

    # Insert content
    editor.insert_content("<p>Hello from Python!</p>")
    print('✏️  Inserted: "<p>Hello from Python!</p>"\n')

    # Export
    output_path = Path(__file__).parent / "output.docx"
    docx_bytes = editor.export_docx(output_path)
    print(f"💾 Exported to: {output_path} ({len(docx_bytes) / 1024:.1f} KB)\n")

    # ─────────────────────────────────────────────
    # Demo: open() / close() lifecycle
    # ─────────────────────────────────────────────
    print("─" * 50)
    print("Demo: Using open() to load another document\n")

    # Close the current document (editor stays alive)
    editor.close()
    print(f"📊 Lifecycle after close(): {editor.get_lifecycle()}")

    # Open a different document (reusing same editor)
    another_doc = Path(__file__).parent / "../../../../packages/super-editor/src/tests/data/blank-doc.docx"
    if another_doc.exists():
        editor.open(another_doc)
        print(f"📊 Lifecycle after open(): {editor.get_lifecycle()}")

        json2 = editor.get_json()
        print(f"📋 New document loaded! Content nodes: {len(json2.get('content', []))}\n")

print("👋 Done!\n")
