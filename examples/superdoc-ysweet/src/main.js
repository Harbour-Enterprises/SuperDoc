import { SuperDoc } from 'superdoc';
import 'superdoc/style.css';
import * as Y from 'yjs';
import { createYjsProvider } from '@y-sweet/client';
import { getOrCreateDocAndToken } from '@y-sweet/sdk';

// Import sample document for new collaborative documents
import sampleDocument from '/sample-document.docx?url';

// ============================================================
// CONFIGURATION - set via .env (see .env.example)
// ============================================================

// Option 1 (recommended for production):
// Use an auth endpoint that returns a client token
const AUTH_ENDPOINT = (import.meta.env.VITE_YSWEET_AUTH || '').trim();

// Option 2 (dev-friendly):
// Use an HTTP URL that points at Vite's proxy to local y-sweet.
// The proxy rewrites /ysweet/* to the local y-sweet server at 127.0.0.1:8080.
// NOTE: Do not expose a production server token in the browser.
const envServer =
  (import.meta.env.VITE_YSWEET_SERVER || import.meta.env.VITE_YSWEET_URL || '').trim();
const YSWEET_SERVER = envServer || 'http://localhost:5173/ysweet'; // proxied to 127.0.0.1:8080
const usingDefaultServer = !envServer && !AUTH_ENDPOINT;

// Document ID - in production, this would come from your app's routing
const DOC_ID = (import.meta.env.VITE_DOC_ID || 'superdoc-demo-doc').trim();

// ============================================================

/**
 * Update the connection status UI
 */
function updateStatus(status) {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');

  dot.className = 'status-dot';

  switch (status) {
    case 'connected':
      dot.classList.add('connected');
      text.textContent = 'Connected';
      break;
    case 'connecting':
      text.textContent = 'Connecting...';
      break;
    case 'disconnected':
      dot.classList.add('disconnected');
      text.textContent = 'Disconnected';
      break;
    case 'synced':
      dot.classList.add('connected');
      text.textContent = 'Synced';
      break;
    default:
      text.textContent = status;
  }
}

/**
 * Initialize Y-Sweet provider and SuperDoc
 */
async function init() {
  try {
    // Create a new Yjs document
    const ydoc = new Y.Doc();

    // Create the Y-Sweet provider
    // The provider handles WebSocket connection, sync, and persistence
    let provider;

    if (AUTH_ENDPOINT) {
      // Use auth endpoint (recommended for hosted deployments)
      provider = await createYjsProvider(ydoc, DOC_ID, AUTH_ENDPOINT);
    } else if (YSWEET_SERVER) {
      // Dev-only path: use server token to mint a client token in-browser
      if (usingDefaultServer) {
        console.info('Using default local Y-Sweet server via proxy at http://localhost:5173/ysweet (proxied to 8080)');
      }
      provider = await createYjsProvider(ydoc, DOC_ID, async () => {
        const token = await getOrCreateDocAndToken(YSWEET_SERVER, DOC_ID);
        // Replace the server's URLs with our proxy URL to avoid CORS issues
        // The server returns its own URL (e.g., http://127.0.0.1:8080/d/docId) but we need
        // to go through the Vite proxy (http://localhost:5173/ysweet/d/docId)
        if (usingDefaultServer) {
          if (token.baseUrl) {
            token.baseUrl = token.baseUrl.replace(/^https?:\/\/[^/]+/, 'http://localhost:5173/ysweet');
          }
          if (token.url) {
            token.url = token.url.replace(/^wss?:\/\/[^/]+/, 'ws://localhost:5173/ysweet');
          }
        }
        return token;
      });
    }

    // Listen for connection status changes
    provider.on('status', ({ status }) => {
      updateStatus(status);
    });

    provider.on('sync', (isSynced) => {
      if (isSynced) {
        updateStatus('synced');
      }
    });

    // Clear the loading message
    document.getElementById('superdoc-container').innerHTML = '';

    // Create SuperDoc with the custom Y-Sweet provider
    const superdoc = new SuperDoc({
      selector: '#superdoc-container',
      documentMode: 'editing',
      user: {
        name: 'Demo User',
        email: 'demo@example.com',
      },
      documents: [
        {
          id: DOC_ID,
          type: 'docx',
          url: sampleDocument, // Initial content for new documents
          isNewFile: true,
        },
      ],
      modules: {
        toolbar: {
          enabled: true,
        },
        collaboration: {
          // This is the key part - pass your custom provider
          customProvider: {
            provider,
            ydoc,
          },
        },
      },
    });

    // Log when SuperDoc is ready
    superdoc.on('ready', () => {
      console.log('SuperDoc is ready with Y-Sweet collaboration!');
    });

    // Handle awareness updates (other users)
    superdoc.on('awareness-update', ({ states }) => {
      console.log('Connected users:', states);
    });

    // Expose for debugging
    window.superdoc = superdoc;
    window.ydoc = ydoc;
    window.provider = provider;

  } catch (error) {
    console.error('Failed to initialize Y-Sweet:', error);
    document.getElementById('superdoc-container').innerHTML = `
      <div class="loading" style="flex-direction: column; gap: 16px;">
        <div style="color: #f44336;">Failed to connect to Y-Sweet</div>
        <div style="font-size: 14px; max-width: 500px; text-align: center;">
          ${error.message}<br><br>
          Make sure you have:
          <ol style="text-align: left; margin-top: 8px;">
            <li>Created a Y-Sweet service at <a href="https://app.jamsocket.com" target="_blank">app.jamsocket.com</a></li>
            <li>Set up your auth endpoint or connection string in .env (defaults to ys://localhost:5173/ysweet)</li>
          </ol>
        </div>
      </div>
    `;
  }
}

// Start the app
init();
