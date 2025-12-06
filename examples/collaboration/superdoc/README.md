# SuperDoc collaboration example

This example shows how to run the full SuperDoc experience (toolbar + editor) while connecting to the collaboration server that lives in `../fastify`.

## Getting started
For this example, we recommend you run the provided ```fastify``` example in the examples directory.
With two terminals:

Terminal 1 (in this folder): The SuperDoc frontend
```
npm install && npm run dev
```

Terminal 2 (in ../fastify folder): The backend collaboration server
```
npm install && npm run dev
```

Point your browser (2 tabs) to: ```http://localhost:5173```

This will run both a SuperDoc-powered frontend, and a Fastify server running ```superdoc-yjs-collaboration``` and a single websocket endpoint. The editors should be collaborating once both tabs have loaded the sample document.
