import { SuperDoc } from 'superdoc';
import 'superdoc/style.css';
import * as Y from 'yjs';
import { createYjsProvider } from '@y-sweet/client';

// ============================================================
// CONFIGURATION - Replace these with your Y-Sweet credentials
// ============================================================

// Option 1: Use an auth endpoint (recommended for production)
// This endpoint should return a ClientToken from your backend
const AUTH_ENDPOINT = '/api/ysweet-auth';

// Option 2: Use a direct connection string (for testing only)
// Get this from your Jamsocket dashboard: https://app.jamsocket.com
// Format: yss://your-service-id.ysweet.jamsocket.live
const YSWEET_CONNECTION_STRING = null; // e.g., 'yss://abc123.ysweet.jamsocket.live'

// Document ID - in production, this would come from your app's routing
const DOC_ID = 'superdoc-demo-doc';

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

    if (YSWEET_CONNECTION_STRING) {
      // Direct connection (for testing)
      // Note: In production, always use an auth endpoint
      provider = await createYjsProvider(ydoc, DOC_ID, async () => {
        // This would normally call your backend
        // For now, return a mock token structure
        return {
          url: YSWEET_CONNECTION_STRING,
          docId: DOC_ID,
        };
      });
    } else {
      // Use auth endpoint (recommended)
      provider = await createYjsProvider(ydoc, DOC_ID, AUTH_ENDPOINT);
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
            <li>Set up your auth endpoint or connection string in src/main.js</li>
          </ol>
        </div>
      </div>
    `;
  }
}

// Start the app
init();
