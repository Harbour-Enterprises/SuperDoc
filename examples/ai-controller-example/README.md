# AI Controller Example (Vanilla JS)

A framework-agnostic SuperDoc sample that wires the `SuperDocAiController` into a plain JavaScript/Vite app. It demonstrates how to plug in AI helpers for search, redlining, replacements, and commenting while keeping the editor experience lightweight.

## Features

- Load DOCX files directly into SuperDoc and keep the default toolbar available
- Run `findContent`, `findContents`, `aiChange` redlines, replacements, and comment insertions
- Stream AI responses with a rolling event log so you can debug long-running operations
- Swap between the bundled `InsightsAIProvider` or a custom `ConfigurableAIProvider`

## Usage

1. Click **Load Document** to choose a DOCX (optional if you want to test against the default blank doc).
2. Pull the right-hand drawer tab to reveal the AI controls.
3. Enter a prompt for any of the tools — find, redline, replace, or comment — and run the action.
4. Watch status updates in the **AI events** panel and inspect the results lists for returned content.
5. Iterate on prompts or wire your own provider to see how different APIs behave.

## Configuration

- By default the example points to the shared Insights demo endpoint in `src/main.js`.
- Uncomment the `ConfigurableAIProvider` block in `src/main.js` and adjust the request/response hooks to connect to your own API or local gateway.
- When using a streaming-capable API, keep the event log open to confirm that chunks arrive in order and the stream completes.

## Running

```bash
npm install
npm run dev
```
