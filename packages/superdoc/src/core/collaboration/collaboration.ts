import { WebsocketProvider } from 'y-websocket';
import { HocuspocusProvider, HocuspocusProviderWebsocket } from '@hocuspocus/provider';
import { awarenessStatesToArray } from '@superdoc/common/collaboration/awareness';
import type { AwarenessContext } from '@superdoc/common/collaboration/awareness';
import { Doc as YDoc } from 'yjs';
import type { SuperDoc } from '../types/index';
import type { User } from './permissions';

/**
 * Awareness change information
 */
interface AwarenessChanges {
  added?: number[];
  updated?: number[];
  removed?: number[];
}

/**
 * Awareness update handler parameters
 */
interface AwarenessHandlerParams {
  changes?: AwarenessChanges;
  states: Map<number, Record<string, unknown>>;
}

/**
 * Collaboration provider configuration
 */
export interface CollaborationConfig {
  /** The provider type (hocuspocus or superdoc) */
  providerType?: 'hocuspocus' | 'superdoc';
  /** The WebSocket URL for connection */
  url?: string;
  /** Authentication token */
  token?: string;
  /** Additional connection parameters */
  params?: Record<string, string>;
}

/**
 * Provider creation options
 */
interface ProviderOptions {
  config: CollaborationConfig;
  user: User;
  documentId: string;
  socket?: unknown;
  superdocInstance: SuperDoc;
}

/**
 * Provider creation result
 */
interface ProviderResult {
  provider: WebsocketProvider | HocuspocusProvider;
  ydoc: YDoc;
}

/**
 * Translate awareness states to an array of users. This will cause superdoc (context) to
 * emit an awareness-update event with the list of users.
 *
 * @param context - The superdoc instance
 * @param params - The awareness changes and states
 */
function awarenessHandler(context: SuperDoc, params: AwarenessHandlerParams): void {
  // Context is the superdoc instance
  // Since co-presence is handled outside of superdoc,
  // we need to emit an awareness-update event

  const { changes = {}, states } = params;
  const { added = [], removed = [] } = changes;
  const awarenessArray = awarenessStatesToArray(context as unknown as AwarenessContext, states);

  // Emit with added and removed arrays so downstream listeners can track who joined/left
  context.emit?.('awareness-update', { context, states: awarenessArray, added, removed });
}

/**
 * Main function to create a provider for collaboration.
 * Currently only hocuspocus is actually supported.
 *
 * @param options - The provider configuration options
 * @returns The provider and ydoc
 */
function createProvider(options: ProviderOptions): ProviderResult {
  const { config, user, documentId, socket, superdocInstance } = options;

  if (!config.providerType) config.providerType = 'superdoc';

  const providers: Record<string, () => ProviderResult> = {
    hocuspocus: () => createHocuspocusProvider({ config, user, documentId, socket, superdocInstance }),
    superdoc: () => createSuperDocProvider({ config, user, documentId, socket, superdocInstance }),
  };

  if (!providers[config.providerType]) {
    throw new Error(`Provider type ${config.providerType} is not supported.`);
  }

  return providers[config.providerType]();
}

/**
 * Create a SuperDoc WebSocket provider
 *
 * @param options - The provider configuration options
 * @returns The provider and ydoc
 */
function createSuperDocProvider(options: ProviderOptions): ProviderResult {
  const { config, user, documentId, superdocInstance } = options;
  const ydoc = new YDoc({ gc: false });
  const wsOptions = {
    params: {
      ...config.params,
    },
  };

  if (!config.url) {
    throw new Error('WebSocket URL is required for SuperDoc provider');
  }

  const provider = new WebsocketProvider(config.url, documentId, ydoc, wsOptions);
  provider.awareness.setLocalStateField('user', user);
  provider.awareness.on('update', (changes: AwarenessChanges = {}) => {
    return awarenessHandler(superdocInstance, { changes, states: provider.awareness.getStates() });
  });

  return { provider, ydoc };
}

/**
 * Create a Hocuspocus provider for collaboration
 *
 * @param options - The provider configuration options
 * @returns The provider and ydoc
 */
function createHocuspocusProvider(options: ProviderOptions): ProviderResult {
  const { config, user, documentId, socket, superdocInstance } = options;
  const ydoc = new YDoc({ gc: false });
  const hocuspocusOptions = {
    websocketProvider: socket as HocuspocusProviderWebsocket,
    document: ydoc,
    name: documentId,
    token: config.token || '',
    preserveConnection: false,
    onAuthenticationFailed: () => onAuthenticationFailed(documentId),
    onConnect: () => onConnect(superdocInstance, documentId),
    onDisconnect: () => onDisconnect(superdocInstance, documentId),
    onDestroy: () => onDestroy(superdocInstance, documentId),
  };

  const provider = new HocuspocusProvider(hocuspocusOptions);
  provider.setAwarenessField('user', user);

  provider.on('awarenessUpdate', (params: { states: Map<number, Record<string, unknown>> }) => {
    return awarenessHandler(superdocInstance, {
      states: params.states,
    });
  });

  return { provider, ydoc };
}

/**
 * Handle authentication failure events
 *
 * @param documentId - The document ID that failed authentication
 */
const onAuthenticationFailed = (documentId: string): void => {
  console.warn('🔒 [superdoc] Authentication failed', 'document', documentId);
};

/**
 * Handle connection events
 *
 * @param superdocInstance - The SuperDoc instance
 * @param documentId - The document ID that connected
 */
const onConnect = (superdocInstance: SuperDoc, documentId: string): void => {
  console.warn('🔌 [superdoc] Connected -- ', documentId);
};

/**
 * Handle disconnection events
 *
 * @param superdocInstance - The SuperDoc instance
 * @param documentId - The document ID that disconnected
 */
const onDisconnect = (superdocInstance: SuperDoc, documentId: string): void => {
  console.warn('🔌 [superdoc] Disconnected', documentId);
};

/**
 * Handle provider destroy events
 *
 * @param superdocInstance - The SuperDoc instance
 * @param documentId - The document ID that was destroyed
 */
const onDestroy = (superdocInstance: SuperDoc, documentId: string): void => {
  console.warn('🔌 [superdoc] Destroyed', documentId);
};

export { createProvider };
