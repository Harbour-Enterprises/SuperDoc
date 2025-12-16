# SuperDoc Node.js Example

A headless Node.js integration for SuperDoc. Use it to programmatically process, modify, and export DOCX files—either as a CLI tool or an HTTP server.

Requires Node >= 20.

## Install

```
npm install
```

## Server mode

```bash
npm start                    # Starts on port 3000
npm run dev                  # With nodemon
node server.js serve 8080    # Custom port
```

The server exposes a GET endpoint at `/` that returns a processed DOCX file. You can optionally insert content via query params:

```
http://localhost:3000?text=hello world
http://localhost:3000?html=<p>I am a paragraph</p>
```

## CLI mode

```bash
npm run convert -- input.docx output.docx
node server.js input.docx output.docx
node server.js convert input.docx output.docx
```

## Docs

See the [SuperDoc docs](https://docs.superdoc.dev) for available editor commands and hooks.
