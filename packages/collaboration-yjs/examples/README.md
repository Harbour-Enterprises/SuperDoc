# Local collaboration server quick start
You can run a local collaboration server using two examples.

- `fastify` for the backend
- `editor-base-collaboration` for the frontend

## Requirements 
Node.js v18 or higher (Node v20 and up recommended)

## Start collaboration backend
In your terminal, go to the `fastify` directory, then run `npm install && npm run dev`

## start collaboration frontend
In a separate terminal window, go to `editor-base-collaboration`, and again run `npm install && npm run dev`

Now, in your browser, open two tabs and go to `localhost:5173` in both. Here you can edit the current document and observe real-time updates between two connected users. You may want to start each user editing on separate lines for a blank document.