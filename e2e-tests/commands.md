# Handy commands

## Layout compare (layout=1 vs existing baseline)
```bash
# Single file
npm run layout-compare -- test-data/basic-documents/longer-header.docx

# All docs
npm run layout-compare

# Update baseline
npm run layout-compare -- --update-snapshots test-data/basic-documents/longer-header.docx
```

## Layout engine suite
```bash
# All docs
npm run test:layout

# All docs in Docker
npm run test:layout:docker

# Single doc
npm run test:layout -- --grep longer-header

# Update baseline
npm run test:layout -- --grep longer-header --update-snapshots

# Update baseline (all) in Docker
npm run update-screenshots:layout:docker

# Update baseline (all) locally
npm run update-screenshots:layout
```
