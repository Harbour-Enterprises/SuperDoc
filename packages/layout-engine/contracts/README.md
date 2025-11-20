# @superdoc/contracts

Shared type definitions for SuperDoc’s layout pipeline. Consumers import these
types (e.g., `FlowBlock`, `TextRun`) to keep adapters, measurers, and painters in
sync.

## 1.0.0-alpha.4 highlights

- Added `TrackedChangeKind`, `TrackedChangesMode`, `RunMark`, and
  `TrackedChangeMeta` types.
- `TextRun` now exposes an optional `trackedChange` payload carrying author/date
  metadata plus format deltas for track-change marks.
- `AdapterOptions` (in `@superdoc/pm-adapter`) accepts `trackedChangesMode` and
  `enableTrackedChanges` so callers can opt into the new metadata.

Remember to bump `CONTRACTS_VERSION` whenever a breaking type change lands so
downstream packages can assert compatibility at runtime.
