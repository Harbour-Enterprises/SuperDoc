# Schema Management

Tools for freezing and shipping historical Super Editor schemas as versioned, sidecar ESM bundles.

## Freeze a schema snapshot

Use a double-dash so the `--version` flag reaches the script:

```
npm run freeze --workspace=packages/schema-management -- --version 0.0.0

# overwrite an existing version if needed (avoid unless unreleased)
npm run freeze --workspace=packages/schema-management -- --version 0.0.0 -- --force
```

From repo root, you can also run:

```
npm run schema:freeze -- --version 0.0.0
```

- Builds the current `packages/super-editor/src/extensions` entry (tests excluded) with the same aliases as Super Editor.
- Emits a self-contained ESM bundle to `packages/schema-management/versions/<version>/schema.js` (starter extension set only).
- Writes metadata to `.../<version>/metadata.json` and updates `packages/schema-management/versions/schemas.json`.

Frozen schemas are immutable: re-run the command with a new `--version` to capture a new snapshot.

### Validate or remove versions

- Check manifest vs. on-disk versions: `npm run check --workspace=packages/schema-management`
- Remove a version safely: `npm run remove --workspace=packages/schema-management -- --version 0.0.0`

### Tests

Run package-scoped tests:

```
npm run test --workspace=@superdoc-dev/schema-management
```

## Runtime usage

Super Editor consumes the frozen schemas as sidecar chunks via `import.meta.glob`, keeping them out of the main bundle while allowing lazy loading by version. See `src/core/schema-management/schema-loader.ts` in `packages/super-editor` for the runtime loader.

- `loadFrozenSchema(version?)` will load the requested version, or the latest frozen version if none is provided.
- `listFrozenSchemaVersions()` returns the available versions (kept in `versions/schemas.json`).
