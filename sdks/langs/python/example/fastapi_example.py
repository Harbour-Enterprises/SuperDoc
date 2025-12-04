#!/usr/bin/env python3
"""
SuperDoc SDK FastAPI Example

Demonstrates using the async API with FastAPI for concurrent document processing.

Install dependencies:
    pip install fastapi uvicorn superdoc-sdk[async]

Run:
    uvicorn fastapi_example:app --reload

Test:
    curl -X POST http://localhost:8000/convert \
        -F "file=@document.docx" \
        -o output.html
"""

import sys
from pathlib import Path

# Add parent dir to path to import superdoc_sdk (development only)
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import Response
from superdoc_sdk import SuperdocAsyncClient, SuperdocError, shutdown

app = FastAPI(title="SuperDoc Document Converter")

# Create a single client instance (thread-safe, shares runtime)
client = SuperdocAsyncClient()


@app.post("/convert/html")
async def convert_to_html(file: UploadFile = File(...)) -> Response:
    """Convert DOCX to HTML"""
    if not file.filename.endswith(".docx"):
        raise HTTPException(400, "Only .docx files are supported")

    try:
        docx_bytes = await file.read()
        async with await client.get_editor(docx_bytes) as editor:
            html = await editor.get_html()
            return Response(content=html, media_type="text/html")
    except SuperdocError as e:
        raise HTTPException(500, str(e))


@app.post("/convert/json")
async def convert_to_json(file: UploadFile = File(...)) -> dict:
    """Convert DOCX to ProseMirror JSON"""
    if not file.filename.endswith(".docx"):
        raise HTTPException(400, "Only .docx files are supported")

    try:
        docx_bytes = await file.read()
        async with await client.get_editor(docx_bytes) as editor:
            return await editor.get_json()
    except SuperdocError as e:
        raise HTTPException(500, str(e))


@app.post("/convert/markdown")
async def convert_to_markdown(file: UploadFile = File(...)) -> Response:
    """Convert DOCX to Markdown"""
    if not file.filename.endswith(".docx"):
        raise HTTPException(400, "Only .docx files are supported")

    try:
        docx_bytes = await file.read()
        async with await client.get_editor(docx_bytes) as editor:
            md = await editor.get_markdown()
            return Response(content=md, media_type="text/markdown")
    except SuperdocError as e:
        raise HTTPException(500, str(e))


@app.post("/insert")
async def insert_content(
    file: UploadFile = File(...),
    content: str = "<p>Inserted by API</p>"
) -> Response:
    """Insert content into DOCX and return modified document"""
    if not file.filename.endswith(".docx"):
        raise HTTPException(400, "Only .docx files are supported")

    try:
        docx_bytes = await file.read()
        async with await client.get_editor(docx_bytes) as editor:
            await editor.insert_content(content)
            modified = await editor.export_docx()
            return Response(
                content=modified,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={"Content-Disposition": "attachment; filename=modified.docx"}
            )
    except SuperdocError as e:
        raise HTTPException(500, str(e))


@app.get("/health")
async def health_check() -> dict:
    """Check if the SuperDoc runtime is healthy"""
    is_healthy = await client.ping()
    return {"healthy": is_healthy}


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on server shutdown"""
    await client.close()
    shutdown()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
