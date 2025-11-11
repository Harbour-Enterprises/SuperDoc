import 'dotenv/config';

import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import corsPlugin from '@fastify/cors';
import jwt from 'jsonwebtoken';

import { CollaborationBuilder, CollaborationParams, ServiceConfig, UserContext } from '@superdoc-dev/superdoc-yjs-collaboration';

import { saveToPostgres, loadFromPostgres } from './storage.js';

/** Create an example server */
const fastify = Fastify({ logger: false });
fastify.register(corsPlugin, {
  origin: true
});
fastify.register(websocketPlugin);

/** We create some basic hooks */
const handleConfig = (config: ServiceConfig): void => {
  console.debug('[handleConfig] Service has been configured');
}

// here we set the user contextt
const handleAuth = async (params: CollaborationParams): Promise<UserContext> => {
  const token = params.params?.token;

  if (!token) {
    throw new Error('Missing token')
  }

  try {
    const secret = process.env.JWT_SECRET || 'default-secret-key';
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

    const user = { userid: decoded.id, username: decoded.name };
    return { user, foobar: 'baz' };
  } catch (error) {
    console.debug("Invalid token", error);
    throw new Error("Invalid token");
  }
};

const handleLoad = async (params: CollaborationParams): Promise<Uint8Array> => {
  console.log(">>> load params", params)
  console.debug('[handleLoad] Loading document', params.documentId);
  const state = await loadFromPostgres(params.documentId);
  return state;
}

const handleOnChange = async (params: CollaborationParams): Promise<void> => {
  console.debug(`[handleOnChange Document ${params.documentId} changed.`);
};

const handleAutoSave = async (params: CollaborationParams): Promise<void> => {
  console.debug('[handleAutoSave] Saving document', params.documentId);
  await saveToPostgres(params);
}


const SuperDocCollaboration = new CollaborationBuilder()
  .withName('SuperDoc Collaboration service')
  .withDebounce(2000)
  .onConfigure(handleConfig)
  .onLoad(handleLoad)
  .onAuthenticate(handleAuth)
  .onChange(handleOnChange)
  .onAutoSave(handleAutoSave)
  .build();

fastify.get('/', () => {
  return 'hello world!';
})

// mock auth
fastify.get('/user', () => {
  const adjectives = ['Happy', 'Clever', 'Brave', 'Swift', 'Bright', 'Calm', 'Bold', 'Wise', 'Kind', 'Cool'];
  const animals = ['Tiger', 'Eagle', 'Wolf', 'Fox', 'Bear', 'Lion', 'Shark', 'Hawk', 'Owl', 'Dolphin'];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const name = `${adjective} ${animal}`;
  const id = Math.random().toString(36).substring(2, 15);

  const user = { id, name };

  const secret = process.env.JWT_SECRET || 'default-secret-key';
  const token = jwt.sign(user, secret, { expiresIn: '1h' });
  
  return {...user, token};
})

/** An example route for websocket collaboration connection */
fastify.register(async function (fastify) {
  fastify.get('/doc/:documentId', { websocket: true }, (socket, request) => {
    SuperDocCollaboration.welcome(socket as any, request as any)
  })
});

/** Start the example! */
const start = async (): Promise<void> => {
  const port = parseInt(process.env.PORT || '3050');
  const host = '0.0.0.0'; // Listen on all interfaces for Cloud Run
  
  fastify.listen({ port, host }, errorHandler);
  console.log(`Server listening at http://${host}:${port}`);
};

/** Basic error handler example */
const errorHandler = (err: Error | null, address?: string): void => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
