import 'dotenv/config';

import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import corsPlugin from '@fastify/cors';
import { readFileSync } from 'fs';

import { CollaborationBuilder, LoadFn, AutoSaveFn } from '@superdoc-dev/superdoc-yjs-collaboration';
import { encodeStateAsUpdate, Doc as YDoc } from 'yjs';

import { saveDocument, loadDocument } from './storage.js';
import { generateUser } from './userGenerator.js';

const errorHandlers: Record<string, (error: Error, socket: any) => void> = {
  LoadError: (error: Error, socket: any) => {
    console.log('Document load failed:', error.message);
    socket.close(1011, 'Document unavailable');
  },
  SaveError: (error: Error, socket: any) => {
    console.log('Document save failed:', error.message);
    // Don't close connection for save errors, just log
  },
  default: (error: Error, socket: any) => {
    console.log('Something went wrong:', error.message);
    socket.close(1011, 'Unknown error');
  },
};

const fastify = Fastify({ logger: false });
fastify.register(corsPlugin, { origin: true });
fastify.register(websocketPlugin);

const SuperDocCollaboration = new CollaborationBuilder()
  .withName('SuperDoc Collaboration service')
  .withDebounce(2000)
  .onLoad((async (params) => {
    try {
      const state = await loadDocument(params.documentId);
      return state;
    } catch(error) {
      const err = new Error('Failed to load document: ' + error);
      err.name = 'LoadError';
      throw err;
    }
  }) as LoadFn)
  .onAutoSave((async (params) => {
    try {
      const { documentId, document } = params;
      if (!document) throw new Error('No document to save');
      
      const state = encodeStateAsUpdate(document);
      const success = await saveDocument(documentId, state);
      
      if (!success) throw new Error('Save returned false');
    } catch (error) {
      const err = new Error('Failed to save document: ' + error);
      err.name = 'SaveError';
      throw err;
    }
  }) as AutoSaveFn)
  .build();

/** Health check endpoint */
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

/** Generate user info endpoint */
fastify.get('/user', async (request, reply) => {
  return generateUser();
});

/** An example route for websocket collaboration connection */
fastify.register(async function (fastify) {
  fastify.get('/doc/:documentId', { websocket: true }, async (socket, request) => {
    try {
      await SuperDocCollaboration.welcome(socket as any, request as any);
    } catch (error) {
      const err = error as Error;
      const errorHandler = errorHandlers[err.name] || errorHandlers.default;
      errorHandler(err, socket);
    }
  })
});

/** Start the server */
const port = parseInt(process.env.PORT || '3050');
const host = '0.0.0.0'; // Listen on all interfaces for Cloud Run
fastify.listen({ port, host }, (err: Error | null, address?: string): void => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});