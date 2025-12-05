import { WebsocketProvider } from 'y-websocket';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { awarenessStatesToArray } from '@superdoc/common/collaboration/awareness';
import { Doc as YDoc } from 'yjs';

/**
 * Translate awareness states to an array of users. This will cause superdoc (context) to
 * emit an awareness-update event with the list of users.
 *
 * @param {Object} context The superdoc instance
 * @param {Object} param
 * @param {Object} param.changes The changes in awareness states
 * @param {Object} param.states The current awareness states
 * @returns {void}
 */
function awarenessHandler(context, { changes = {}, states }) {
  // Context is the superdoc instance
  // Since co-presence is handled outside of superdoc,
  // we need to emit an awareness-update event

  const { added = [], removed = [] } = changes;
  const awarenessArray = awarenessStatesToArray(context, states);

  const payload = {
    states: awarenessArray,
    added,
    removed,
    superdoc: context,
  };

  context.emit('awareness-update', payload);
}

/**
 * Main function to create a provider for collaboration.
 * Supports built-in providers (superdoc, hocuspocus) and custom providers.
 *
 * @param {Object} param The config object
 * @param {Object} param.config The configuration object
 * @param {Object} param.config.customProvider Optional custom provider with { provider, ydoc }. Takes precedence over providerType
 * @param {string} param.config.providerType The type of built-in provider to use ('superdoc' or 'hocuspocus')
 * @param {Object} param.user The user object
 * @param {string} param.documentId The document ID
 * @param {Object} param.socket The socket instance (for hocuspocus)
 * @param {Object} param.superdocInstance The superdoc instance
 * @returns {Object} Object containing { provider, ydoc }
 * @throws {Error} If customProvider is invalid or providerType is not supported
 */
function createProvider({ config, user, documentId, socket, superdocInstance }) {
  // If customProvider is provided, use it directly (see ./custom-provider.d.ts for interface)
  if (config.customProvider) {
    // Validate customProvider structure
    if (!config.customProvider.provider || typeof config.customProvider.provider !== 'object') {
      throw new Error('customProvider.provider is required and must be an object');
    }
    if (!config.customProvider.ydoc || typeof config.customProvider.ydoc !== 'object') {
      throw new Error('customProvider.ydoc is required and must be an object');
    }

    const { provider, ydoc } = config.customProvider;

    // Validate required provider methods
    const requiredProviderMethods = ['on', 'off', 'disconnect', 'destroy'];
    for (const method of requiredProviderMethods) {
      if (typeof provider[method] !== 'function') {
        throw new Error(`customProvider.provider must have a '${method}' method`);
      }
    }

    // Validate awareness object and its methods
    if (!provider.awareness || typeof provider.awareness !== 'object') {
      throw new Error('customProvider.provider.awareness is required and must be an object');
    }
    const requiredAwarenessMethods = ['setLocalStateField', 'on', 'getStates'];
    for (const method of requiredAwarenessMethods) {
      if (typeof provider.awareness[method] !== 'function') {
        throw new Error(`customProvider.provider.awareness must have a '${method}' method`);
      }
    }

    // Warn if both customProvider and providerType are specified
    if (config.providerType) {
      console.warn(
        '[superdoc] Both customProvider and providerType are specified. customProvider takes precedence and providerType will be ignored.',
      );
    }

    // Wrap awareness operations in try-catch for error handling
    try {
      provider.awareness.setLocalStateField('user', user);
    } catch (error) {
      throw new Error(`Failed to set user in customProvider awareness: ${error.message}`);
    }

    try {
      provider.awareness.on('update', (changes = {}) => {
        try {
          const states = provider.awareness.getStates();
          return awarenessHandler(superdocInstance, { changes, states });
        } catch (error) {
          console.error('[superdoc] Error in customProvider awareness update handler:', error);
        }
      });
    } catch (error) {
      throw new Error(`Failed to register customProvider awareness update handler: ${error.message}`);
    }

    return { provider, ydoc };
  }

  if (!config.providerType) config.providerType = 'superdoc';

  const providers = {
    hocuspocus: () => createHocuspocusProvider({ config, user, documentId, socket, superdocInstance }),
    superdoc: () => createSuperDocProvider({ config, user, documentId, socket, superdocInstance }),
  };

  if (!providers[config.providerType]) {
    const availableTypes = Object.keys(providers).join(', ');
    throw new Error(`Provider type "${config.providerType}" is not supported. Available types: ${availableTypes}`);
  }

  return providers[config.providerType]();
}

/**
 *
 * @param {Object} param The config object
 * @param {Object} param.config The configuration object
 * @param {Object} param.ydoc The Yjs document
 * @param {Object} param.user The user object
 * @param {string} param.documentId The document ID
 * @returns {Object} The provider and socket
 */
function createSuperDocProvider({ config, user, documentId, superdocInstance }) {
  const ydoc = new YDoc({ gc: false });
  const options = {
    params: {
      ...config.params,
    },
  };

  const provider = new WebsocketProvider(config.url, documentId, ydoc, options);
  provider.awareness.setLocalStateField('user', user);
  provider.awareness.on('update', (changes = {}) => {
    return awarenessHandler(superdocInstance, { changes, states: provider.awareness.getStates() });
  });
  return { provider, ydoc };
}

/**
 *
 * @param {Object} param The config object
 * @param {Object} param.config The configuration object
 * @param {Object} param.ydoc The Yjs document
 * @param {Object} param.user The user object
 * @param {string} param.documentId The document ID
 * @returns {Object} The provider and socket
 */
function createHocuspocusProvider({ config, user, documentId, socket, superdocInstance }) {
  const ydoc = new YDoc({ gc: false });
  const options = {
    websocketProvider: socket,
    document: ydoc,
    name: documentId,
    token: config.token || '',
    preserveConnection: false,
    onAuthenticationFailed: () => onAuthenticationFailed(documentId),
    onConnect: () => onConnect(superdocInstance, documentId),
    onDisconnect: () => onDisconnect(superdocInstance, documentId),
    onDestroy: () => onDestroy(superdocInstance, documentId),
  };

  const provider = new HocuspocusProvider(options);
  provider.setAwarenessField('user', user);

  provider.on('awarenessUpdate', (params) => {
    return awarenessHandler(superdocInstance, {
      states: params.states,
    });
  });

  return { provider, ydoc };
}

const onAuthenticationFailed = (data, documentId) => {
  console.warn('🔒 [superdoc] Authentication failed', data, 'document', documentId);
};

const onConnect = (superdocInstance, documentId) => {
  console.warn('🔌 [superdoc] Connected -- ', documentId);
};

const onDisconnect = (superdocInstance, documentId) => {
  console.warn('🔌 [superdoc] Disconnected', documentId);
};

const onDestroy = (superdocInstance, documentId) => {
  console.warn('🔌 [superdoc] Destroyed', documentId);
};

export { createProvider };
