// import './file-polyfill.js'; Import the file polyfill if using NodeJS < v22.0.0
import { readFile, writeFile } from 'fs/promises';
import { JSDOM } from 'jsdom';
import express from 'express';

// In Node, we use the Editor class directly from superdoc/super-editor
import { Editor, getStarterExtensions } from 'superdoc/super-editor';

const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Creates an Editor instance from a docx buffer
 */
async function getEditor(buffer) {
  const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const { document } = window;

  const [content, media, mediaFiles, fonts] = await Editor.loadXmlData(buffer, true);

  return new Editor({
    mode: 'docx',
    extensions: getStarterExtensions(),
    fileSource: buffer,
    content,
    media,
    mediaFiles,
    fonts,
    isHeadless: true,
    mockDocument: document,
    mockWindow: window,
  });
}

/**
 * CLI mode: Process a docx file and save to disk
 */
async function runCli(inputPath, outputPath = 'output.docx') {
  const buffer = await readFile(inputPath);
  const editor = await getEditor(buffer);

  const exportedBuffer = await editor.exportDocx();
  await writeFile(outputPath, exportedBuffer);

  console.log(`Document exported to ${outputPath}`);
  editor.destroy();
}

/**
 * Server mode: Start an HTTP server that accepts docx files
 */
function runServer(port = 3000) {
  const server = express();

  server.get('/', async (req, res) => {
    const { text, html } = req.query;

    // Load sample document from disk
    const buffer = await readFile('./sample-document.docx');
    const editor = await getEditor(buffer);

    // Insert content if provided
    if (text) editor.commands.insertContent(text);
    if (html) editor.commands.insertContent(html);

    // Export and send response
    const exportedBuffer = await editor.exportDocx();
    editor.destroy();

    res
      .status(200)
      .type(DOCX_MIME_TYPE)
      .set('Content-Disposition', 'attachment; filename="exported-superdoc.docx"')
      .send(Buffer.from(exportedBuffer));
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'serve') {
  // Server mode: node server.js serve [port]
  const port = parseInt(args[1]) || 3000;
  runServer(port);
} else if (command === 'convert' || args.length > 0) {
  // CLI mode: node server.js convert <input> [output]
  // or shorthand: node server.js <input> [output]
  const inputPath = command === 'convert' ? args[1] : args[0];
  const outputPath = command === 'convert' ? args[2] : args[1];

  if (!inputPath) {
    console.error('Usage:');
    console.error('  node server.js serve [port]        Start HTTP server');
    console.error('  node server.js convert <in> [out]  Convert docx file');
    console.error('  node server.js <input> [output]    Convert docx file (shorthand)');
    process.exit(1);
  }

  runCli(inputPath, outputPath).catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
} else {
  // No args: show usage
  console.log('Usage:');
  console.log('  node server.js serve [port]        Start HTTP server');
  console.log('  node server.js convert <in> [out]  Convert docx file');
  console.log('  node server.js <input> [output]    Convert docx file (shorthand)');
}
