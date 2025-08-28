import { range } from '../helpers/range.js';

class PDFAdapter {
  constructor() {
    const proto = Object.getPrototypeOf(this);
    if (proto.constructor === PDFAdapter) {
      throw new Error('Abstract class should not be instanciated');
    }
  }
}

export class PDFJSAdapter extends PDFAdapter {
  constructor(config) {
    super();
    this.pdfLib = config.pdfLib;
    this.pdfViewer = config.pdfViewer;
    this.workerSrc = config.workerSrc;
    this.textLayerMode = config.textLayerMode ?? 0;
    if (config.setWorker) {
      if (this.workerSrc) {
        this.pdfLib.GlobalWorkerOptions.workerSrc = config.workerSrc;
      } else {
        // Fallback to CDN version.
        this.pdfLib.GlobalWorkerOptions.workerSrc = getWorkerSrcFromCDN(this.pdfLib.version);
      }
    }
    this.pdfPageViews = [];
  }

  async getDocument(file) {
    const loadingTask = this.pdfLib.getDocument(file);
    const document = await loadingTask.promise;
    return document;
  }

  async renderPages({ documentId, pdfDocument, viewerContainer, emit = () => {} }) {
    try {
      this.pdfPageViews = [];

      const numPages = pdfDocument.numPages;
      const firstPage = 1;

      const pdfjsPages = await getPdfjsPages(pdfDocument, firstPage, numPages);
      const pageContainers = [];

      for (const [index, page] of pdfjsPages.entries()) {
        const container = document.createElement('div');
        container.classList.add('pdf-page');
        container.dataset.pageNumber = index + 1;
        container.id = `${documentId}-page-${index + 1}`;

        pageContainers.push(container);

        const { width, height } = this.getOriginalPageSize(page);
        const scale = 1;

        const eventBus = new this.pdfViewer.EventBus();
        const pdfPageView = new this.pdfViewer.PDFPageView({
          container,
          id: index + 1,
          scale,
          defaultViewport: page.getViewport({ scale }),
          eventBus,
          textLayerMode: this.textLayerMode,
        });
        this.pdfPageViews.push(pdfPageView);

        const containerBounds = container.getBoundingClientRect();
        containerBounds.originalWidth = width;
        containerBounds.originalHeight = height;

        pdfPageView.setPdfPage(page);
        await pdfPageView.draw();

        emit('page-loaded', documentId, index, containerBounds);
      }

      viewerContainer.append(...pageContainers);

      emit('ready', documentId, viewerContainer);
    } catch (err) {
      console.error('Error loading PDF:', err);
    }
  }

  getOriginalPageSize(page) {
    const viewport = page.getViewport({ scale: 1 });
    const width = viewport.width;
    const height = viewport.height;
    return { width, height };
  }

  destroy() {
    this.pdfPageViews.forEach((view) => view.destroy());
    this.pdfPageViews = [];
  }
}

export class PDFAdapterFactory {
  static create(config) {
    const adapters = {
      pdfjs: () => {
        return new PDFJSAdapter(config);
      },
      default: () => {
        throw new Error('Unsupported adapter');
      },
    };
    const adapter = adapters[config.adapter] ?? adapters.default;
    return adapter();
  }
}

export const createPDFConfig = (config) => {
  const defaultConfig = {
    adapter: 'pdfjs',
  };

  return {
    ...defaultConfig,
    ...config,
  };
};

export async function getPdfjsPages(pdf, firstPage, lastPage) {
  const pagesPromises = range(firstPage, lastPage + 1).map((num) => pdf.getPage(num));
  return await Promise.all(pagesPromises);
}

export function getWorkerSrcFromCDN(version) {
  return `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
}
