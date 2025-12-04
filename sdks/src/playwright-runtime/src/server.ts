/**
 * HTTP server for runtime (optional)
 * Provides JSON-RPC style API for remote access
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface StaticServerOptions {
  port: number;
  editorDistPath: string;
  shellPath: string;
}

/**
 * Create a simple static file server for the runtime
 */
export function createStaticServer(options: StaticServerOptions) {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      let filePath: string;

      if (req.url === '/' || req.url === '/index.html') {
        filePath = options.shellPath;
      } else if (req.url?.startsWith('/dist/')) {
        filePath = join(options.editorDistPath, req.url.substring(6));
      } else {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const content = await readFile(filePath);
      const ext = filePath.split('.').pop();
      const contentType: Record<string, string> = {
        html: 'text/html',
        js: 'application/javascript',
        css: 'text/css',
      };

      res.writeHead(200, { 'Content-Type': contentType[ext || ''] || 'text/plain' });
      res.end(content);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Server error:', error.message);
      res.writeHead(500);
      res.end('Server error');
    }
  });

  return new Promise<typeof server>((resolve) => {
    server.listen(options.port, () => {
      console.log(`Static server listening on port ${options.port}`);
      resolve(server);
    });
  });
}
