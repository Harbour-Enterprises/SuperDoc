import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DOCX = path.resolve(__dirname, 'fixtures/sample-review.docx');
const PDF = path.resolve(__dirname, '../../src/components/PdfViewer/fixtures/sd-3497-two-page.pdf');

const PAGE = `<!DOCTYPE html><html><head>
<link href="/dist-cdn/superdoc.min.css" rel="stylesheet"/>
<script>window.SUPERDOC_ENGINE_CDN_BASE_URL='/node_modules/@superdoc/docx-engine';</script>
<script src="/dist-cdn/superdoc.min.js"></script>
</head><body><div id="editor"></div></body></html>`;

async function open(page: Page): Promise<void> {
  await page.route('**/document-source-compatibility.html', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: PAGE }),
  );
  await page.goto('/document-source-compatibility.html');
  await page.waitForFunction(() => (window as never as { SuperDoc?: unknown }).SuperDoc !== undefined);
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

test('opens a DOCX URL in the document editor', async ({ page }) => {
  test.setTimeout(90_000);
  const docx = await readFile(DOCX);
  await page.route('**/contract.docx', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      body: docx,
    }),
  );

  await page.evaluate(() => {
    const SuperDoc = (window as never as { SuperDoc: new (config: unknown) => unknown }).SuperDoc;
    new SuperDoc({ selector: '#editor', document: '/contract.docx' });
  });

  await expect(page.locator('[data-editor-host="v2"][data-editor-chrome="true"]')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.superdoc-page').first()).toBeVisible({ timeout: 60_000 });
});

test('opens a PDF File in the PDF viewer', async ({ page }) => {
  test.setTimeout(90_000);
  const pdf = await readFile(PDF);
  await page.route('**/contract.pdf', (route) =>
    route.fulfill({ status: 200, contentType: 'application/pdf', body: pdf }),
  );

  await page.evaluate(async () => {
    const response = await fetch('/contract.pdf');
    const data = new File([await response.arrayBuffer()], 'contract.pdf', { type: 'application/pdf' });
    const pdfLib = await import('/node_modules/pdfjs-dist/build/pdf.mjs');
    const SuperDoc = (window as never as { SuperDoc: new (config: unknown) => unknown }).SuperDoc;
    new SuperDoc({
      selector: '#editor',
      document: data,
      modules: {
        pdf: {
          pdfLib,
          setWorker: true,
          workerSrc: '/node_modules/pdfjs-dist/build/pdf.worker.mjs',
        },
      },
    });
  });

  await expect(page.locator('.sd-pdf-viewer')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[data-pdf-page]').first()).toBeVisible({ timeout: 60_000 });
});

for (const source of ['File', 'Blob', 'wrapper', 'bytes', 'URL'] as const) {
  test(`rejects a standalone HTML ${source} without executing its markup`, async ({ page }) => {
    let documentRequests = 0;
    await page.route('**/standalone.html', (route) => {
      documentRequests += 1;
      return route.fulfill({ contentType: 'text/html', body: '<p>HTML document</p>' });
    });

    await page.evaluate((source) => {
      const state = window as unknown as {
        SuperDoc: new (config: unknown) => { state: { documents: unknown[] } };
        htmlViewerInstance: { state: { documents: unknown[] } };
        htmlViewerErrors: Array<{ stage: string; message: string }>;
        htmlViewerExecuted?: boolean;
      };
      const html = '<img src="data:,invalid" onerror="window.htmlViewerExecuted = true">';
      const file = new File([html], 'standalone.html', { type: 'text/html' });
      const inputs = {
        File: file,
        Blob: new Blob([html], { type: 'text/html' }),
        wrapper: { originFileObj: file },
        bytes: { data: new TextEncoder().encode(html), type: 'html' },
        URL: { url: '/standalone.html', type: 'html' },
      };
      state.htmlViewerErrors = [];
      state.htmlViewerInstance = new state.SuperDoc({
        selector: '#editor',
        document: inputs[source],
        documentMode: 'viewing',
        onException: ({ stage, error }: { stage: string; error: unknown }) => {
          state.htmlViewerErrors.push({ stage, message: error instanceof Error ? error.message : String(error) });
        },
      });
    }, source);

    await expect
      .poll(() => page.evaluate(() => (window as unknown as { htmlViewerErrors: unknown[] }).htmlViewerErrors))
      .toEqual([
        {
          stage: 'document-init',
          message: 'SuperDoc: HTML document viewing is not supported. Open a DOCX or PDF document.',
        },
      ]);
    expect(
      await page.evaluate(() => {
        const state = window as unknown as {
          htmlViewerExecuted?: boolean;
          htmlViewerInstance: { state: { documents: unknown[] } };
        };
        return {
          executed: state.htmlViewerExecuted === true,
          documents: state.htmlViewerInstance.state.documents.length,
        };
      }),
    ).toEqual({ executed: false, documents: 0 });
    await expect(page.locator('.superdoc-html-viewer')).toHaveCount(0);
    expect(documentRequests).toBe(0);
  });
}
