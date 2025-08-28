import { writeFileSync, mkdirSync } from 'node:fs';
import { XSP_DIR, buildFromXsdDir } from './index.js';

/**
 * Run the XML Schema generator. Converts OOXML .xsp definitions to json in dist
 */
export function runGenerator() {
  const out = buildFromXsdDir(XSP_DIR);
  mkdirSync('dist', { recursive: true });
  writeFileSync('dist/schema.transitional.json', JSON.stringify(out, null, 2));
  console.log('Wrote dist/schema.transitional.json');

  console.log('\nSample entries:');
  const elements = out.elements;
  for (const key of ['w:document', 'w:body', 'w:p', 'w:r', 'w:t', 'w:pPr', 'w:rPr']) {
    console.log(`${key}: ${elements[key] ? elements[key].children.length : 'not found'} children`);
  }
}
