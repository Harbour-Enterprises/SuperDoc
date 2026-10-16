// Unit 4 (worker collaboration): the package ships TWO module-worker assets —
// the default kernel worker and the collaboration worker. This suite proves
// the preserve plugin re-extracts BOTH from inlined data URLs (naming each by
// its kind marker) and rewrites absolute static worker URLs to
// package-relative specifiers, so a fresh installed consumer resolves them
// from dist/assets instead of a project-root /assets.
import { describe, expect, it } from 'vite-plus/test';
import { runInNewContext } from 'node:vm';
import { preserveV2WorkerAssetPlugin } from './vite-plugin-v2-worker-asset.mjs';

const KERNEL_WORKER_SOURCE = 'const realm="v2-worker-realm";postMessage({type:"hello"});';
const COLLABORATION_WORKER_SOURCE =
  'const realm="v2-worker-realm";const guard="one-shot per worker realm";postMessage({type:"hello"});';
const REVIEW_INDEX_WORKER_SOURCE = 'const realm="superdoc-review-index-worker";postMessage({ok:true});';

function dataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source, 'utf8').toString('base64')}`;
}

function runGenerateBundle(bundle, outputOptions = { format: 'es' }) {
  const plugin = preserveV2WorkerAssetPlugin();
  const emitted = [];
  plugin.renderStart(outputOptions);
  const intro = plugin.intro();
  for (const output of Object.values(bundle)) if (output.type === 'chunk' && intro) output.code = `${intro}\n${output.code}`;
  plugin.generateBundle.call(
    {
      emitFile(file) {
        emitted.push(file);
      },
    },
    outputOptions,
    bundle,
  );
  return emitted;
}

describe('preserveV2WorkerAssetPlugin — isolated worker assets', () => {
  it('re-extracts kernel, collaboration, and review workers as kind-named assets', () => {
    const chunk = {
      type: 'chunk',
      fileName: 'superdoc.es.js',
      code:
        `const kernelWorkerUrl = "${dataUrl(KERNEL_WORKER_SOURCE)}";` +
        `const collaborationWorkerUrl = "${dataUrl(COLLABORATION_WORKER_SOURCE)}";` +
        `const reviewWorkerUrl = "${dataUrl(REVIEW_INDEX_WORKER_SOURCE)}";`,
    };
    const emitted = runGenerateBundle({ chunk });

    expect(emitted).toHaveLength(3);
    const fileNames = emitted.map((file) => file.fileName).sort();
    expect(fileNames[0]).toMatch(/^assets\/browser-worker-entry-[a-f0-9]{8}\.js$/);
    expect(fileNames[1]).toMatch(/^assets\/collaboration-worker-entry-[a-f0-9]{8}\.js$/);
    expect(fileNames[2]).toMatch(/^assets\/review-index-worker-entry-[a-f0-9]{8}\.js$/);
    // The chunk now references both extracted assets package-relatively.
    expect(chunk.code).toContain('./assets/browser-worker-entry-');
    expect(chunk.code).toContain('./assets/collaboration-worker-entry-');
    expect(chunk.code).toContain('./assets/review-index-worker-entry-');
    expect(chunk.code).not.toContain('data:text/javascript');
  });

  it('rewrites absolute static collaboration worker URLs to package-relative specifiers', () => {
    const chunk = {
      type: 'chunk',
      fileName: 'superdoc.es.js',
      code: 'const w = new Worker(new URL("/assets/collaboration-worker-entry-abcd1234.js", import.meta.url), { type: "module" });',
    };
    runGenerateBundle({ chunk });
    expect(chunk.code).toContain('new URL("./assets/collaboration-worker-entry-abcd1234.js",');
  });

  it('still normalizes the existing kernel worker URL shape', () => {
    const chunk = {
      type: 'chunk',
      fileName: 'superdoc.es.js',
      code: 'const w = new Worker(new URL("/assets/browser-worker-entry-abcd1234.js", import.meta.url), { type: "module" });',
    };
    runGenerateBundle({ chunk });
    expect(chunk.code).toContain('new URL("./assets/browser-worker-entry-abcd1234.js",');
  });

  it('normalizes the isolated review worker URL without assigning the kernel prelude', () => {
    const chunk = {
      type: 'chunk',
      fileName: 'superdoc.iife.js',
      code: 'const w = new Worker(new URL("/assets/review-index-worker-entry-abcd1234.js", import.meta.url), { type: "module" });',
    };
    runGenerateBundle({ chunk }, { format: 'iife' });
    expect(chunk.code).toContain('new URL("./assets/review-index-worker-entry-abcd1234.js", __superdocV2AssetBase)');
    expect(chunk.code).not.toContain('__SUPERDOC_V2_BROWSER_WORKER_URL_PRELUDE__');
  });

  it('keeps the IIFE URL-global prelude pointed at the KERNEL worker, never the collaboration worker', () => {
    const chunk = {
      type: 'chunk',
      fileName: 'superdoc.iife.js',
      code:
        `const kernelWorkerUrl = "${dataUrl(KERNEL_WORKER_SOURCE)}";` +
        `const collaborationWorkerUrl = "${dataUrl(COLLABORATION_WORKER_SOURCE)}";`,
    };
    runGenerateBundle({ chunk }, { format: 'iife' });
    expect(chunk.code).toContain('__SUPERDOC_V2_BROWSER_WORKER_URL_PRELUDE__');
    const preludeUrlMatch = chunk.code.match(/g\[k\] = new URL\("([^"]+)"/);
    expect(preludeUrlMatch?.[1]).toMatch(/browser-worker-entry-/);
    expect(preludeUrlMatch?.[1]).not.toMatch(/collaboration-worker-entry-/);
  });

  it('collapses Rollup-substituted nested collaboration URLs safely for IIFE output', () => {
    const chunk = {
      type: 'chunk',
      fileName: 'superdoc.iife.js',
      code: 'const w = new Worker(new URL(/* @vite-ignore */ ""+new URL("/assets/collaboration-worker-entry-abcd1234.js", "" + {}.url).href, "" + {}.url), { type: "module" });',
    };
    runGenerateBundle({ chunk }, { format: 'iife' });

    expect(chunk.code).toContain(
      'new Worker(new URL("./assets/collaboration-worker-entry-abcd1234.js", __superdocV2AssetBase), { type: "module" })',
    );
    expect(chunk.code).not.toContain('import.meta');
    expect(chunk.code).not.toContain('__SUPERDOC_V2_BROWSER_WORKER_URL_PRELUDE__');
  });

  it('collapses Rolldown nested bare-relative collaboration URLs for ESM output', () => {
    const chunk = {
      type: 'chunk',
      fileName: 'superdoc.es.js',
      code: 'const w = new Worker(new URL(""+new URL("assets/collaboration-worker-entry-abcd1234.js", import.meta.url).href, ""+import.meta.url), { type: "module" });',
    };
    runGenerateBundle({ chunk });

    expect(chunk.code).toContain(
      'new Worker(new URL("./assets/collaboration-worker-entry-abcd1234.js", import.meta.url), { type: "module" })',
    );
    expect(chunk.code).not.toContain('new URL(""+new URL(');
  });

  it('preserves named worker options while collapsing nested ESM URLs', () => {
    const chunk = {
      type: 'chunk',
      fileName: 'superdoc.es.js',
      code: 'const w = new Worker(new URL(""+new URL("assets/browser-worker-entry-abcd1234.js", import.meta.url).href, ""+import.meta.url), { type: "module", name: "superdoc-v2-edit" });',
    };
    runGenerateBundle({ chunk });

    expect(chunk.code).toContain(
      'new Worker(new URL("./assets/browser-worker-entry-abcd1234.js", import.meta.url), { type: "module", name: "superdoc-v2-edit" })',
    );
    expect(chunk.code).not.toContain('new URL(""+new URL(');
  });

  it('keeps direct static worker URLs parseable in CommonJS output', () => {
    const chunk = {
      type: 'chunk',
      fileName: 'superdoc.cjs',
      code:
        'const kernel = new Worker(new URL("/assets/browser-worker-entry-abcd1234.js", import.meta.url), { type: "module" });' +
        'const collaboration = new Worker(new URL("/assets/collaboration-worker-entry-efab5678.js", import.meta.url), { type: "module" });',
    };
    runGenerateBundle({ chunk }, { format: 'cjs' });

    expect(chunk.code).toContain('new URL("./assets/browser-worker-entry-abcd1234.js", document.baseURI)');
    expect(chunk.code).toContain('new URL("./assets/collaboration-worker-entry-efab5678.js", document.baseURI)');
    expect(chunk.code).not.toContain('import.meta');
  });

  it("preserves Vite's CommonJS-safe base while normalizing the worker asset path", () => {
    const cjsBase =
      'typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : document.baseURI';
    const chunk = {
      type: 'chunk',
      fileName: 'chunks/browser-runtime.cjs',
      code: `const w = new Worker(new URL(/* @vite-ignore */ "/assets/browser-worker-entry-abcd1234.js", ${cjsBase}), { type: "module" });`,
    };
    runGenerateBundle({ chunk }, { format: 'cjs' });

    expect(chunk.code).toContain('new URL("../assets/browser-worker-entry-abcd1234.js",');
    expect(chunk.code).toContain(cjsBase);
    expect(chunk.code).not.toContain('import.meta');
  });

  it('collapses nested worker URLs without import.meta in CommonJS output', () => {
    const chunk = {
      type: 'chunk',
      fileName: 'superdoc.cjs',
      code: 'const w = new Worker(new URL(""+new URL("assets/collaboration-worker-entry-abcd1234.js", import.meta.url).href, ""+import.meta.url), { type: "module" });',
    };
    runGenerateBundle({ chunk }, { format: 'cjs' });

    expect(chunk.code).toContain(
      'new Worker(new URL("./assets/collaboration-worker-entry-abcd1234.js", document.baseURI), { type: "module" })',
    );
    expect(chunk.code).not.toContain('import.meta');
  });

  it('never touches non-worker data URLs', () => {
    const originalCode = `const media = "${dataUrl('not a worker at all')}";`;
    const chunk = { type: 'chunk', fileName: 'superdoc.es.js', code: originalCode };
    const emitted = runGenerateBundle({ chunk });
    expect(emitted).toHaveLength(0);
    expect(chunk.code).toBe(originalCode);
  });
});

describe('composed DOM worker assets', () => {
  it('identifies the composed worker before the collaboration marker', () => {
    const source = COLLABORATION_WORKER_SOURCE + 'const mountError="Worker DOM is already mounted";';
    const chunk = { type: 'chunk', fileName: 'superdoc.es.js', code: `const url="${dataUrl(source)}";` };
    const emitted = runGenerateBundle({ chunk });
    expect(emitted[0].fileName).toMatch(/^assets\/dom-worker-entry-/);
    expect(chunk.code).toContain('./assets/dom-worker-entry-');
  });

  it('resolves delayed IIFE workers from the script location under a different document base', () => {
    const chunk = { type: 'chunk', fileName: 'superdoc.iife.js', code:
      'globalThis.openWorker=()=>new Worker(new URL("/assets/dom-worker-entry-abcd1234.js", {}.url), {type:"module",name:"superdoc-v2-edit"});' };
    runGenerateBundle({ chunk }, { format: 'iife' });
    const realm = {};
    const document = { currentScript: { src: 'https://cdn.example/sdk/v2/superdoc.iife.js' }, baseURI: 'https://app.example/editor/' };
    const workers = [];
    Function('globalThis', 'document', 'Worker', 'URL', chunk.code)(realm, document,
      function(url) { workers.push(url.href); }, URL);
    document.currentScript = null;
    document.baseURI = 'https://app.example/changed/';
    realm.openWorker();
    expect(workers).toEqual(['https://cdn.example/sdk/v2/assets/dom-worker-entry-abcd1234.js']);
  });
});

it('preserves the named IIFE export and its captured script base', () => {
  const chunk = { type:'chunk', fileName:'superdoc.iife.js', code:
    'var SuperDoc = (()=>{class SuperDoc {static open(){return new Worker(new URL("/assets/dom-worker-entry-abcd1234.js", {}.url), {type:"module"});}}return SuperDoc;})();' };
  runGenerateBundle({chunk},{format:'iife'});
  const workers=[];
  const realm={document:{currentScript:{src:'https://cdn.example/sdk/superdoc.iife.js'},baseURI:'https://app.example/'},URL,Worker:function(url){workers.push(url.href);}};
  runInNewContext(chunk.code,realm);
  expect(typeof realm.SuperDoc).toBe('function');
  realm.document.currentScript=null;
  realm.SuperDoc.open();
  expect(workers).toEqual(['https://cdn.example/sdk/assets/dom-worker-entry-abcd1234.js']);
});
