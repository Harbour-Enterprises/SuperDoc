# SuperDoc Electron Vue Example

This example demonstrates how to integrate SuperDoc into an Electron application using Vue.js.

## Features

- Vue.js frontend with SuperDoc integration
- Electron desktop application
- Document loading and editing capabilities
- Native file dialogs and menu integration

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run electron-dev
   ```

This will start both the Vite dev server and Electron in development mode.

## Building

1. Build the Vue app:
   ```bash
   npm run build
   ```

2. Build the Electron app:
   ```bash
   npm run electron-build
   ```

## Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build Vue app for production
- `npm run electron` - Start Electron (requires built app)
- `npm run electron-dev` - Development mode (starts both Vite and Electron)
- `npm run electron-build` - Build distributable Electron app