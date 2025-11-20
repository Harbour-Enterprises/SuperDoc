# @superdoc/pm-adapter

## DOCX → PM JSON fixtures

Use the shared Vite configuration from Super Editor to extract ProseMirror JSON directly from DOCX files:

```bash
npm run extract:docx --workspace=@superdoc/pm-adapter -- --input ../../super-editor/src/tests/data/restart-numbering-sub-list.docx --output lists-docx.json
```

The command wraps `vite-node --config ../../super-editor/vite.config.js --mode test scripts/extract-pm-json.mjs`, so all of Super Editor's aliases (`@converter/*`, `@core/*`, etc.) resolve automatically. Pass `--input` and `--output` to control which DOCX file is converted and where the fixture is written.
