import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runGenerator, buildFromXsdDir } from '../../generator/src/index.js';

let CACHE = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to find the bundled schema in common locations:
//  - same dir as the module (e.g., dist/index.js → dist/schema...)
//  - parent dir (when code is bundled into dist/bin/cli.js but schema is in dist/)
function findBundledSchemaPath() {
  const candidates = [join(__dirname, 'schema.transitional.json'), join(__dirname, '../schema.transitional.json')];
  for (const p of candidates) if (existsSync(p)) return p;
  return null;
}

// Where we *prefer* to write the JSON during dev builds (package root 'dist/')
const PREFERRED_WRITE_PATH = join(__dirname, '../schema.transitional.json');

export function getSchema(opts = {}) {
  if (CACHE) return CACHE;

  // 1) Prefer the bundled JSON (either same dir or parent dir of this module)
  const bundled = findBundledSchemaPath();
  if (bundled) {
    CACHE = JSON.parse(readFileSync(bundled, 'utf8'));
    return CACHE;
  }

  // 2) Dev path: build from XSDs if available
  const xsdDir = opts.xsdDir || process.env.OOXML_XSD_DIR;
  if (xsdDir && existsSync(xsdDir)) {
    CACHE = buildFromXsdDir(xsdDir);

    // Write to package root next to dist/index.js (…/dist/schema.transitional.json)
    const outDir = dirname(PREFERRED_WRITE_PATH);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(PREFERRED_WRITE_PATH, JSON.stringify(CACHE));
    return CACHE;
  }

  // 3) Fail clearly
  throw new Error(
    'No schema JSON found. Run the generator in the repo (dev) or use the published package with dist/schema.transitional.json.',
  );
}

export function loadSchemaSync() {
  const bundled = findBundledSchemaPath();
  if (bundled) {
    return JSON.parse(readFileSync(bundled, 'utf8'));
  }

  // Only regenerate if an XSD dir is provided; otherwise, fail loudly
  const xsdDir = process.env.OOXML_XSD_DIR;
  if (xsdDir && existsSync(xsdDir)) {
    runGenerator(); // your generator writes to dist/schema.transitional.json
    const after = findBundledSchemaPath();
    if (after) return JSON.parse(readFileSync(after, 'utf8'));
  }

  throw new Error(
    'No schema JSON found. Run the generator in the repo (dev) or use the published package with dist/schema.transitional.json.',
  );
}
