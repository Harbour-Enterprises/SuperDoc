import * as Y from 'yjs';
import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import { setupWSConnection } from './yjs-utils.js'

const app = Fastify({ logger: false });
app.register(websocketPlugin);

app.register(async function (app) {
  app.get('/collaboration/:documentId', { websocket: true }, (socket, request) => {
    const { documentId } = request.params;
    console.debug('WebSocket connection requested for document:', documentId);
    const options = {
      docName: documentId,
    };
    setupWSConnection(socket, request.request, options);
  })
});

app.listen({ port: 3050 });