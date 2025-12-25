## [1.0.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v1.0.1...v1.0.2) (2025-12-19)


### Reverts

* Revert "fix: guard groupChanges against empty input" ([9789861](https://github.com/Harbour-Enterprises/SuperDoc/commit/97898616093baff0af04581f17efc72b5e6768f4))

## [1.0.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v1.0.0...v1.0.1) (2025-12-19)


### Bug Fixes

* guard groupChanges against empty input ([69c59b2](https://github.com/Harbour-Enterprises/SuperDoc/commit/69c59b27826fe6acc0f8192aff2d8540af2d2a4b))

## [0.31.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.31.2...v0.31.3) (2025-11-24)

### Bug Fixes

- content not editable on safari ([#1304](https://github.com/Harbour-Enterprises/SuperDoc/issues/1304)) ([9972b1f](https://github.com/Harbour-Enterprises/SuperDoc/commit/9972b1f9da7a4a7d090488aab159a85fb1c81a96))

## [0.31.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.31.1...v0.31.2) (2025-11-21)

### Reverts

- Revert "fix: import and export tagUtils for enhanced structured content management ([#1300](https://github.com/Harbour-Enterprises/SuperDoc/issues/1300))" ([d937827](https://github.com/Harbour-Enterprises/SuperDoc/commit/d9378272260bc363c165ccc0ac4ba4c10d3991a9))

## [0.31.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.31.0...v0.31.1) (2025-11-21)

### Bug Fixes

- import and export tagUtils for enhanced structured content management ([#1300](https://github.com/Harbour-Enterprises/SuperDoc/issues/1300)) ([7b8551d](https://github.com/Harbour-Enterprises/SuperDoc/commit/7b8551d46cfac7a1b9f77bb448cedf26544392ff))

# [0.31.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.30.0...v0.31.0) (2025-11-21)

### Features

- add tag-based operations for structured content management ([#1296](https://github.com/Harbour-Enterprises/SuperDoc/issues/1296)) ([af80442](https://github.com/Harbour-Enterprises/SuperDoc/commit/af80442b451739dc1a0a08270edc9c317c53c127))

# [0.31.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.30.0...v0.31.0) (2025-11-21)

### Features

- add tag-based operations for structured content management ([#1296](https://github.com/Harbour-Enterprises/SuperDoc/issues/1296)) ([af80442](https://github.com/Harbour-Enterprises/SuperDoc/commit/af80442b451739dc1a0a08270edc9c317c53c127))

# [0.30.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.29.0...v0.30.0) (2025-11-19)

### Bug Fixes

- css style isolation after shape groups ([c428122](https://github.com/Harbour-Enterprises/SuperDoc/commit/c428122218187c70ad54e9e8a870898993b40354))
- improve index mapping for text nodes and handle transparent inline nodes ([#1216](https://github.com/Harbour-Enterprises/SuperDoc/issues/1216)) ([2ed5d3a](https://github.com/Harbour-Enterprises/SuperDoc/commit/2ed5d3a7401c90e0a4fd02294c66b34bc7da9af2))
- update highlight method to accept optional color parameter ([#1253](https://github.com/Harbour-Enterprises/SuperDoc/issues/1253)) ([900b9be](https://github.com/Harbour-Enterprises/SuperDoc/commit/900b9be4064eabb4bf5706bca3947d09ba8e3f4c))
- update locks ([658cadb](https://github.com/Harbour-Enterprises/SuperDoc/commit/658cadb2465a72bf1d6753fdc1c19a18b68c2fbd))
- update package-lock.json for latest collab package intellisense ([#1252](https://github.com/Harbour-Enterprises/SuperDoc/issues/1252)) ([e4cdae7](https://github.com/Harbour-Enterprises/SuperDoc/commit/e4cdae7529a660e7ae419d9e406d0477de28e420))
- update toolbar item label when linked style selected ([#1245](https://github.com/Harbour-Enterprises/SuperDoc/issues/1245)) ([22ebb62](https://github.com/Harbour-Enterprises/SuperDoc/commit/22ebb62c1e8ce7578fd712d44913b043f2049fb6))

### Features

- shape groups ([#1236](https://github.com/Harbour-Enterprises/SuperDoc/issues/1236)) ([ca05ba2](https://github.com/Harbour-Enterprises/SuperDoc/commit/ca05ba2e099ca59073b0c59c33ca579ddcaa9f1d))

### Performance Improvements

- **pagination:** optimize for headless mode ([#1239](https://github.com/Harbour-Enterprises/SuperDoc/issues/1239)) ([28272f7](https://github.com/Harbour-Enterprises/SuperDoc/commit/28272f7c58c5b1114f35f68b2481ce4441f58cd3))

# [0.29.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.28.6...v0.29.0) (2025-11-10)

### Bug Fixes

- add streaming to superdoc-ai and demo ([#1211](https://github.com/Harbour-Enterprises/SuperDoc/issues/1211)) ([4362985](https://github.com/Harbour-Enterprises/SuperDoc/commit/43629855d83f61e94c02ff8cd012b417db9008e9))
- additional comments fixes ([#1248](https://github.com/Harbour-Enterprises/SuperDoc/issues/1248)) ([#1249](https://github.com/Harbour-Enterprises/SuperDoc/issues/1249)) ([911f17c](https://github.com/Harbour-Enterprises/SuperDoc/commit/911f17cdf1df8496b3b93c52398f453aa873e260))
- comments not exporting ([#1246](https://github.com/Harbour-Enterprises/SuperDoc/issues/1246)) ([d967d5e](https://github.com/Harbour-Enterprises/SuperDoc/commit/d967d5eb88833f1c77f3be667cf831ce0191b067))
- floating comments not appearing on first load ([#1221](https://github.com/Harbour-Enterprises/SuperDoc/issues/1221)) ([b3e72d0](https://github.com/Harbour-Enterprises/SuperDoc/commit/b3e72d0dbeefaa88a8614d889665668c95269d98))
- strikethrough is added on export for falsy values ([#1228](https://github.com/Harbour-Enterprises/SuperDoc/issues/1228)) ([184e92b](https://github.com/Harbour-Enterprises/SuperDoc/commit/184e92b0c0f110c5608c37f2027ac06e027e64e7))
- uploaded image is missing for collaborators ([#1217](https://github.com/Harbour-Enterprises/SuperDoc/issues/1217)) ([91f285f](https://github.com/Harbour-Enterprises/SuperDoc/commit/91f285f8c644c267190abcddbec0ee1b8299a763))

### Features

- improve style scoping in the editor to prevent external styles affecting content ([#1219](https://github.com/Harbour-Enterprises/SuperDoc/issues/1219)) ([0c5ca4e](https://github.com/Harbour-Enterprises/SuperDoc/commit/0c5ca4ea1af097f5f1f4a4308d1ed6234d8e87d0))
- migrate @harbour-enterprises/common to TypeScript ([#1233](https://github.com/Harbour-Enterprises/SuperDoc/issues/1233)) ([5c93ba5](https://github.com/Harbour-Enterprises/SuperDoc/commit/5c93ba5cbb43a97d541586e56c27ba2f1eab3c78))
- migrate superdoc-yjs-collaboration library to TS ([#1220](https://github.com/Harbour-Enterprises/SuperDoc/issues/1220)) ([2973866](https://github.com/Harbour-Enterprises/SuperDoc/commit/2973866ef9df371f12824d0a6ccd72d0a87e1a01)), closes [#1225](https://github.com/Harbour-Enterprises/SuperDoc/issues/1225) [#1226](https://github.com/Harbour-Enterprises/SuperDoc/issues/1226)
- typescript infrastructure for monorepo ([#1157](https://github.com/Harbour-Enterprises/SuperDoc/issues/1157)) ([2b365d7](https://github.com/Harbour-Enterprises/SuperDoc/commit/2b365d78c278551100688d2c7f085cc2c1ed8a6e)), closes [#1171](https://github.com/Harbour-Enterprises/SuperDoc/issues/1171) [#1148](https://github.com/Harbour-Enterprises/SuperDoc/issues/1148) [#1155](https://github.com/Harbour-Enterprises/SuperDoc/issues/1155) [#1168](https://github.com/Harbour-Enterprises/SuperDoc/issues/1168) [#1182](https://github.com/Harbour-Enterprises/SuperDoc/issues/1182) [#1184](https://github.com/Harbour-Enterprises/SuperDoc/issues/1184) [#1187](https://github.com/Harbour-Enterprises/SuperDoc/issues/1187)

### Performance Improvements

- **list-item:** remove list item node view when in headless mode ([#1170](https://github.com/Harbour-Enterprises/SuperDoc/issues/1170)) ([8b04a8b](https://github.com/Harbour-Enterprises/SuperDoc/commit/8b04a8b864d469231d88a893c0fc2a226994ed4e))

## [0.28.6](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.28.5...v0.28.6) (2025-11-10)

### Bug Fixes

- additional comments fixes ([#1248](https://github.com/Harbour-Enterprises/SuperDoc/issues/1248)) ([d8d6e52](https://github.com/Harbour-Enterprises/SuperDoc/commit/d8d6e526faa0bd7cd1b7970d3fac5fc8d25f74af))

## [0.28.5](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.28.4...v0.28.5) (2025-11-10)

### Bug Fixes

- comments not exporting ([e3647a7](https://github.com/Harbour-Enterprises/SuperDoc/commit/e3647a7e3d6a8db7e00f10616b01304e9ca77a39))

## [0.28.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.28.3...v0.28.4) (2025-11-06)

### Bug Fixes

- prettier ([bbc4c6a](https://github.com/Harbour-Enterprises/SuperDoc/commit/bbc4c6a757bcbaca08175dc9bbbe5c533b82e3c4))
- uploaded image is missing for collaborators ([#1217](https://github.com/Harbour-Enterprises/SuperDoc/issues/1217)) ([090f4e7](https://github.com/Harbour-Enterprises/SuperDoc/commit/090f4e709c560ceae718b34d5a3ee02cc7b2bc86))

## [0.28.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.28.2...v0.28.3) (2025-11-05)

### Bug Fixes

- floating comments not appearing on first load ([#1221](https://github.com/Harbour-Enterprises/SuperDoc/issues/1221)) ([c8656ca](https://github.com/Harbour-Enterprises/SuperDoc/commit/c8656ca4cdeca1bc484fdaaf9c7ea584915a6c24))

## [0.28.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.28.1...v0.28.2) (2025-11-04)

### Bug Fixes

- allow top/bottom images to float right and left ([#1203](https://github.com/Harbour-Enterprises/SuperDoc/issues/1203)) ([d3f1e47](https://github.com/Harbour-Enterprises/SuperDoc/commit/d3f1e4742af0982d616382b155056119029a84c3))
- **images:** restore image TopAndBottom centering and column-left float ([94e02bd](https://github.com/Harbour-Enterprises/SuperDoc/commit/94e02bd54968bc8340c384165a9b63e0249012b4))
- markdown libs import order breaking node ([#1212](https://github.com/Harbour-Enterprises/SuperDoc/issues/1212)) ([ed2191d](https://github.com/Harbour-Enterprises/SuperDoc/commit/ed2191d6e2ba27103fb3dc2d013e8da2fc38ca15))
- node js import timing tests ([bf5565a](https://github.com/Harbour-Enterprises/SuperDoc/commit/bf5565a7d7654d1da68dec1aaee5a64277ea4f20))
- performance improvements for tab plugin and tabDecorations ([#1205](https://github.com/Harbour-Enterprises/SuperDoc/issues/1205)) ([571c725](https://github.com/Harbour-Enterprises/SuperDoc/commit/571c725d30b6994c54e7e40f33b3728d6cc3b7ee))
- superdoc-ai package.json ([#1215](https://github.com/Harbour-Enterprises/SuperDoc/issues/1215)) ([a295c05](https://github.com/Harbour-Enterprises/SuperDoc/commit/a295c057878f990eddff1af2a9f6fcec840f9eff))

### Performance Improvements

- **editor:** improve large document editing performance 5-10x ([#1214](https://github.com/Harbour-Enterprises/SuperDoc/issues/1214)) ([caaea64](https://github.com/Harbour-Enterprises/SuperDoc/commit/caaea644ff3c881869f2778ae6eaa52be96ec502))

## [0.28.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.28.0...v0.28.1) (2025-11-03)

### Bug Fixes

- markdown libs import order breaking node ([3cd90c6](https://github.com/Harbour-Enterprises/SuperDoc/commit/3cd90c6d990e61f19d8ba3406904c7b31921fdcf))

# [0.28.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.27.3...v0.28.0) (2025-11-01)

### Bug Fixes

- allow programmatic tracked change skipping undo history ([#1202](https://github.com/Harbour-Enterprises/SuperDoc/issues/1202)) ([826b620](https://github.com/Harbour-Enterprises/SuperDoc/commit/826b6202ee242e004f9302f58ff6f5c06cfe7cd6))
- delete decoration widget blocks parent list item ([#1200](https://github.com/Harbour-Enterprises/SuperDoc/issues/1200)) ([4b58fd6](https://github.com/Harbour-Enterprises/SuperDoc/commit/4b58fd62471dbef99a36972963fb3403b621b118))
- force track changes if input type is programmatic ([#1199](https://github.com/Harbour-Enterprises/SuperDoc/issues/1199)) ([c6e2a17](https://github.com/Harbour-Enterprises/SuperDoc/commit/c6e2a173a40624a1d8c6d87cb9cb2007588eacf1))
- images uploaded are dropped on export ([#1186](https://github.com/Harbour-Enterprises/SuperDoc/issues/1186)) ([#1190](https://github.com/Harbour-Enterprises/SuperDoc/issues/1190)) ([e99daa2](https://github.com/Harbour-Enterprises/SuperDoc/commit/e99daa2b699f76a3ee38a6b593505803ecc7bbd1))
- improve performance ([#1169](https://github.com/Harbour-Enterprises/SuperDoc/issues/1169)) ([e626e28](https://github.com/Harbour-Enterprises/SuperDoc/commit/e626e283f160b55e2ccacda1273d3d347bbef99b))
- increase/decrease indent for all selected list items ([#1192](https://github.com/Harbour-Enterprises/SuperDoc/issues/1192)) ([0bcee03](https://github.com/Harbour-Enterprises/SuperDoc/commit/0bcee0315113e9804d7c80d3e50281307143c70e))
- remove image contain-intrinsic and content-visibility breaking pagination ([12e2dfa](https://github.com/Harbour-Enterprises/SuperDoc/commit/12e2dfab4c8e15fd730565513196db9a580800c6))
- remove legacy handler from tableCell translator ([#1172](https://github.com/Harbour-Enterprises/SuperDoc/issues/1172)) ([83dda0d](https://github.com/Harbour-Enterprises/SuperDoc/commit/83dda0d18fd30e7d7646b3df95779e93517545db))
- tests ([e63f0fd](https://github.com/Harbour-Enterprises/SuperDoc/commit/e63f0fda1d140f3ab2088de549d1d30102ca2ecd))

### Features

- add markdown serialization support to the editor ([#1188](https://github.com/Harbour-Enterprises/SuperDoc/issues/1188)) ([26d269b](https://github.com/Harbour-Enterprises/SuperDoc/commit/26d269bbc1f3d295344545cca9914ec3b5d644a2))
- adding README for local collab server example ([#1194](https://github.com/Harbour-Enterprises/SuperDoc/issues/1194)) ([0cb188b](https://github.com/Harbour-Enterprises/SuperDoc/commit/0cb188b306959551c6065e55a1103b213c842f4b))
- ai configurable provider ([#1107](https://github.com/Harbour-Enterprises/SuperDoc/issues/1107)) ([edf958d](https://github.com/Harbour-Enterprises/SuperDoc/commit/edf958de7770e0b08bc8e4efd921d9843b5ff49e))
- implement convertSdtContentToRuns function for structured content conversion ([#1193](https://github.com/Harbour-Enterprises/SuperDoc/issues/1193)) ([cff6535](https://github.com/Harbour-Enterprises/SuperDoc/commit/cff65355dd55ae0fbfa0669ac773942d3cb77c5e))

## [0.27.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.27.2...v0.27.3) (2025-10-30)

### Bug Fixes

- remove image contain-intrinsic and content-visibility breaking pagination ([cbb8d37](https://github.com/Harbour-Enterprises/SuperDoc/commit/cbb8d37791b6ec0d59376c593c7cb8be4f1b027d))
- tests ([c58d332](https://github.com/Harbour-Enterprises/SuperDoc/commit/c58d332e554eae49dfa67c7a59b1c83f0d0d6f5e))

## [0.27.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.27.1...v0.27.2) (2025-10-28)

### Bug Fixes

- images uploaded are dropped on export ([#1186](https://github.com/Harbour-Enterprises/SuperDoc/issues/1186)) ([77922c6](https://github.com/Harbour-Enterprises/SuperDoc/commit/77922c66f2261b8ff9856dd265fe8124fa6717c9))

## [0.27.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.27.0...v0.27.1) (2025-10-28)

### Bug Fixes

- enhance getFileObject to handle data URIs ([#1187](https://github.com/Harbour-Enterprises/SuperDoc/issues/1187)) ([c61cf20](https://github.com/Harbour-Enterprises/SuperDoc/commit/c61cf202b4b139e0631efc73ade01e412e746ff6))

# [0.27.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.26.0...v0.27.0) (2025-10-28)

### Bug Fixes

- images breaking on export ([#1182](https://github.com/Harbour-Enterprises/SuperDoc/issues/1182)) ([82af973](https://github.com/Harbour-Enterprises/SuperDoc/commit/82af973a0388091ad5fbb90cbefc6c9699faadd5))
- tabs initial loading ([#1168](https://github.com/Harbour-Enterprises/SuperDoc/issues/1168)) ([5f97688](https://github.com/Harbour-Enterprises/SuperDoc/commit/5f9768807f4086159dcd27dd1d7fd5fee4a21e0a))

### Features

- cache tab decoration measurements ([#1155](https://github.com/Harbour-Enterprises/SuperDoc/issues/1155)) ([060092b](https://github.com/Harbour-Enterprises/SuperDoc/commit/060092b238c2cc465f17bf7a586a6df99b02e105))
- vector shapes ([#1148](https://github.com/Harbour-Enterprises/SuperDoc/issues/1148)) ([e789819](https://github.com/Harbour-Enterprises/SuperDoc/commit/e789819198f576dd4de2486a43eed7413050e323))

# [0.26.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.25.0...v0.26.0) (2025-10-17)

### Bug Fixes

- add pm exports ([#1146](https://github.com/Harbour-Enterprises/SuperDoc/issues/1146)) ([0bf371a](https://github.com/Harbour-Enterprises/SuperDoc/commit/0bf371a0936c416cfed9309a61ec77f841afd207))
- disable setDocumentMode for header/footer editors ([#1149](https://github.com/Harbour-Enterprises/SuperDoc/issues/1149)) ([ab75952](https://github.com/Harbour-Enterprises/SuperDoc/commit/ab75952e9a90b3c28484054517fb91f0935b2b56))
- list item node views not receiving numbering data on first pass ([#1154](https://github.com/Harbour-Enterprises/SuperDoc/issues/1154)) ([c96c75a](https://github.com/Harbour-Enterprises/SuperDoc/commit/c96c75ae5f7779bc6263a65dd3de26f6a4fa32a4))
- memory leak in getAbstractDefiniton, cache numbering.xml ([#1152](https://github.com/Harbour-Enterprises/SuperDoc/issues/1152)) ([e05904e](https://github.com/Harbour-Enterprises/SuperDoc/commit/e05904eb25dc46a1dd95d6561d69bbfc81d17596))
- **toolbar:** allow accept and reject tracked changes from the toolbar ([#1140](https://github.com/Harbour-Enterprises/SuperDoc/issues/1140)) ([bbc00c2](https://github.com/Harbour-Enterprises/SuperDoc/commit/bbc00c2e56090214b9fa64eca2f831a576a80f2a))
- update anchor image top position ([#1141](https://github.com/Harbour-Enterprises/SuperDoc/issues/1141)) ([2b493bc](https://github.com/Harbour-Enterprises/SuperDoc/commit/2b493bc38d7b8beb6de007b85a8e5d6696c88948))
- use a default user when none is provided, permissions fixes ([#1150](https://github.com/Harbour-Enterprises/SuperDoc/issues/1150)) ([56b3617](https://github.com/Harbour-Enterprises/SuperDoc/commit/56b3617404aa0a94397bfa781bfb1bc574c85635))

### Features

- added support for annotating tables in the structured content blocks ([#1128](https://github.com/Harbour-Enterprises/SuperDoc/issues/1128)) ([0b3f660](https://github.com/Harbour-Enterprises/SuperDoc/commit/0b3f6609a814a55b55b9e495a5c97d3a1f785d6c))

# [0.25.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.24.0...v0.25.0) (2025-10-15)

### Bug Fixes

- replace (addition/deletion) tracked change bubble ([#1135](https://github.com/Harbour-Enterprises/SuperDoc/issues/1135)) ([cd8b480](https://github.com/Harbour-Enterprises/SuperDoc/commit/cd8b4806a31fb1734861e882597264b4bf2f4614))
- toolbar font-size when multiple selected ([#1139](https://github.com/Harbour-Enterprises/SuperDoc/issues/1139)) ([234f8e1](https://github.com/Harbour-Enterprises/SuperDoc/commit/234f8e187f82ecc323fbe81b228db538f51eaed6))

### Features

- allow customizing of tracked change permissions ([#1132](https://github.com/Harbour-Enterprises/SuperDoc/issues/1132)) ([1078801](https://github.com/Harbour-Enterprises/SuperDoc/commit/1078801236f30045b5f393b3d60a9cf551065579))

# [0.24.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.23.0...v0.24.0) (2025-10-15)

### Bug Fixes

- bookmarks inside table cells break import ([#1133](https://github.com/Harbour-Enterprises/SuperDoc/issues/1133)) ([a090084](https://github.com/Harbour-Enterprises/SuperDoc/commit/a090084d4eac56f49c82684bca64fcf10fb2ee8d))
- grab tracked change from inline node for contextMenu ([#1113](https://github.com/Harbour-Enterprises/SuperDoc/issues/1113)) ([ff20085](https://github.com/Harbour-Enterprises/SuperDoc/commit/ff200851eab4fb2a961b8749c010a40f1d20953a))
- hyperlink export causes issues in Word ([#1121](https://github.com/Harbour-Enterprises/SuperDoc/issues/1121)) ([8c61646](https://github.com/Harbour-Enterprises/SuperDoc/commit/8c6164625dba72b0bc8d53dfdd254c18de3f9a50))
- preserve word anchor metadata and improve legacy image wrap ([#1127](https://github.com/Harbour-Enterprises/SuperDoc/issues/1127)) ([c0b55ca](https://github.com/Harbour-Enterprises/SuperDoc/commit/c0b55ca1c472027a5a97ce60ce4701bdcf94089e))
- table import fixes, tblGrid fixes, col group ([#1108](https://github.com/Harbour-Enterprises/SuperDoc/issues/1108)) ([6f7c048](https://github.com/Harbour-Enterprises/SuperDoc/commit/6f7c0487ea3d0581f5706beab0da679da322471b))
- update line height dropdown ([#1122](https://github.com/Harbour-Enterprises/SuperDoc/issues/1122)) ([3b8fd7a](https://github.com/Harbour-Enterprises/SuperDoc/commit/3b8fd7ad41535b6e598bb43797cb32cc2bf5ab20))

### Features

- add handler for w:tcpr (SD-76) ([#1090](https://github.com/Harbour-Enterprises/SuperDoc/issues/1090)) ([6b94b9d](https://github.com/Harbour-Enterprises/SuperDoc/commit/6b94b9dc7a91d6d8486dd52f06a36b3d10c1bc95))
- add preset geometry pre-built lib ([#1124](https://github.com/Harbour-Enterprises/SuperDoc/issues/1124)) ([b0ca171](https://github.com/Harbour-Enterprises/SuperDoc/commit/b0ca17122de54465bc7a86ffbb92e2656554fd6a))

# [0.23.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.22.4...v0.23.0) (2025-10-10)

### Bug Fixes

- add tooltip to table actions ([#1093](https://github.com/Harbour-Enterprises/SuperDoc/issues/1093)) ([983f0de](https://github.com/Harbour-Enterprises/SuperDoc/commit/983f0de9fa7e1bf7e885eb30b26f74fc4d63e546))
- allow .5 font sizes ([#1060](https://github.com/Harbour-Enterprises/SuperDoc/issues/1060)) ([4747145](https://github.com/Harbour-Enterprises/SuperDoc/commit/47471457a54193f6eea02e5bce20ebd03e5108b0))
- allow both leading and trailing spaces ([#1100](https://github.com/Harbour-Enterprises/SuperDoc/issues/1100)) ([#1103](https://github.com/Harbour-Enterprises/SuperDoc/issues/1103)) ([315d3e2](https://github.com/Harbour-Enterprises/SuperDoc/commit/315d3e2b177619af25d7b68619fdd8908a9e8afc))
- exported annotations are suppressed in Google Docs ([#1061](https://github.com/Harbour-Enterprises/SuperDoc/issues/1061)) ([3f8dea6](https://github.com/Harbour-Enterprises/SuperDoc/commit/3f8dea65598b5e98655ad9dea79f59596c7f1c1c))
- import alignment from injected html ([#1068](https://github.com/Harbour-Enterprises/SuperDoc/issues/1068)) ([#1069](https://github.com/Harbour-Enterprises/SuperDoc/issues/1069)) ([38f44a9](https://github.com/Harbour-Enterprises/SuperDoc/commit/38f44a954d8044754d4d5d978d3f7ce58c4e122f))
- insertComment does not emit to SuperDoc ([#1065](https://github.com/Harbour-Enterprises/SuperDoc/issues/1065)) ([b95cd42](https://github.com/Harbour-Enterprises/SuperDoc/commit/b95cd42ff5be9c2314e60a7c4a38ea8c1470ecb9))
- instrtext bug with unhandled angled brackets ([#1051](https://github.com/Harbour-Enterprises/SuperDoc/issues/1051)) ([#1052](https://github.com/Harbour-Enterprises/SuperDoc/issues/1052)) ([ae0d772](https://github.com/Harbour-Enterprises/SuperDoc/commit/ae0d7722658c216e54d8c7997e0a03763d8f0f42))
- missing content when paste html ([#1097](https://github.com/Harbour-Enterprises/SuperDoc/issues/1097)) ([0f78f3e](https://github.com/Harbour-Enterprises/SuperDoc/commit/0f78f3ed60e1bcd31029a9b56fe305975fee46af))
- node path for image upload [SD-415] ([#1064](https://github.com/Harbour-Enterprises/SuperDoc/issues/1064)) ([1b786de](https://github.com/Harbour-Enterprises/SuperDoc/commit/1b786de5f81e6f4b2dbfabe73b88343d34a25758))
- node views in view mode ([#1059](https://github.com/Harbour-Enterprises/SuperDoc/issues/1059)) ([5881df8](https://github.com/Harbour-Enterprises/SuperDoc/commit/5881df826481fe31aa27e6046fa6c276306455e0))
- preserve trailing spaces when inject html ([#1070](https://github.com/Harbour-Enterprises/SuperDoc/issues/1070)) ([#1071](https://github.com/Harbour-Enterprises/SuperDoc/issues/1071)) ([bf87ba3](https://github.com/Harbour-Enterprises/SuperDoc/commit/bf87ba30251a7d53d5217ae5a058ff8512c1d8da))
- prevent resize decorations in view mode and when editor is not editable ([#1084](https://github.com/Harbour-Enterprises/SuperDoc/issues/1084)) ([34620a9](https://github.com/Harbour-Enterprises/SuperDoc/commit/34620a9492c25da101cb0230e1eb7c4f38e76a7d))
- requestAnimationFrame in pagination ([#1063](https://github.com/Harbour-Enterprises/SuperDoc/issues/1063)) ([20f47ee](https://github.com/Harbour-Enterprises/SuperDoc/commit/20f47ee2c4095a8dadce58499276a55b7d800c6e))
- restore html input value from sdt content, add tests ([#1104](https://github.com/Harbour-Enterprises/SuperDoc/issues/1104)) ([0ae2766](https://github.com/Harbour-Enterprises/SuperDoc/commit/0ae27665684f7a8dd1ec212447eafc0af1bdb2a5))
- select default font/size in toolbar dropdown ([#1098](https://github.com/Harbour-Enterprises/SuperDoc/issues/1098)) ([dcd1e51](https://github.com/Harbour-Enterprises/SuperDoc/commit/dcd1e51d7712485002d22eb43fbe957f57183f39))
- structured content style with image ([#1057](https://github.com/Harbour-Enterprises/SuperDoc/issues/1057)) ([67dee6d](https://github.com/Harbour-Enterprises/SuperDoc/commit/67dee6d6c95462190d6029bd33e008976937f0b0))
- toggle list and toggle off ([#1089](https://github.com/Harbour-Enterprises/SuperDoc/issues/1089)) ([61b30f6](https://github.com/Harbour-Enterprises/SuperDoc/commit/61b30f6816d3176a9c2201f6f73c0a16deb9dc36))
- **track-changes:** relink contiguous insert segments across formatting ([dbb1820](https://github.com/Harbour-Enterprises/SuperDoc/commit/dbb18208ed70cf6292955d1f12a20ac4dda2dec4))
- update tracked changes linking logic ([#1092](https://github.com/Harbour-Enterprises/SuperDoc/issues/1092)) ([f539995](https://github.com/Harbour-Enterprises/SuperDoc/commit/f5399951f522be9d0d2ba5015466b35e0ca771a9))
- use SUPERDOC_PAT to trigger e2e tests ([#1075](https://github.com/Harbour-Enterprises/SuperDoc/issues/1075)) ([29eaad0](https://github.com/Harbour-Enterprises/SuperDoc/commit/29eaad0a8b1d1d28199050449bbc30a94844e1da))
- vmerge issue and tests ([#1072](https://github.com/Harbour-Enterprises/SuperDoc/issues/1072)) ([5f8f005](https://github.com/Harbour-Enterprises/SuperDoc/commit/5f8f0058e75999fc6bcc1b1adb33ed22198656e7))

### Features

- add import/export support for TOC nodes (SD-175) ([#1042](https://github.com/Harbour-Enterprises/SuperDoc/issues/1042)) ([f665876](https://github.com/Harbour-Enterprises/SuperDoc/commit/f6658769c31aa2b99f2fdb0b5a7071b47c31a2ec))
- add new command and helpers to structured content using alias ([#1053](https://github.com/Harbour-Enterprises/SuperDoc/issues/1053)) ([3cd48d3](https://github.com/Harbour-Enterprises/SuperDoc/commit/3cd48d3c133971915e9ba7f4350f07fb0218dde3))
- **context-menu:** make track changes menu items default items [SD-328] ([#1039](https://github.com/Harbour-Enterprises/SuperDoc/issues/1039)) ([99d4ce7](https://github.com/Harbour-Enterprises/SuperDoc/commit/99d4ce77dbe699eeded73531957782fa05c9afc8))
- enhance export functionality with ExportParams type definition ([#1054](https://github.com/Harbour-Enterprises/SuperDoc/issues/1054)) ([5ae099c](https://github.com/Harbour-Enterprises/SuperDoc/commit/5ae099c56a36cc9f188d9173fef63dbbb0f333cd))
- fix type export on build ([#1095](https://github.com/Harbour-Enterprises/SuperDoc/issues/1095)) ([a8dae03](https://github.com/Harbour-Enterprises/SuperDoc/commit/a8dae03f690f363399ccabc40ad0083a1feabcc0))
- turn comments on by default ([#1056](https://github.com/Harbour-Enterprises/SuperDoc/issues/1056)) ([52e930f](https://github.com/Harbour-Enterprises/SuperDoc/commit/52e930f0a20b3c5879d0e81722442a509ccfadd9))

## [0.22.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.22.3...v0.22.4) (2025-10-09)

### Bug Fixes

- allow both leading and trailing spaces ([#1100](https://github.com/Harbour-Enterprises/SuperDoc/issues/1100)) ([b74bbd5](https://github.com/Harbour-Enterprises/SuperDoc/commit/b74bbd517024388ed0779f023f7a296cc2774551))

## [0.22.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.22.2...v0.22.3) (2025-10-03)

### Bug Fixes

- preserve trailing spaces when inject html ([#1070](https://github.com/Harbour-Enterprises/SuperDoc/issues/1070)) ([2e78997](https://github.com/Harbour-Enterprises/SuperDoc/commit/2e78997a8a3a475888de7049bd3b3cfd8868ec94))

## [0.22.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.22.1...v0.22.2) (2025-10-03)

### Bug Fixes

- import alignment from injected html ([#1068](https://github.com/Harbour-Enterprises/SuperDoc/issues/1068)) ([0cdb9ea](https://github.com/Harbour-Enterprises/SuperDoc/commit/0cdb9eab72bc68ba64996348bb701bacf4fbfbf4))

## [0.22.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.22.0...v0.22.1) (2025-10-01)

### Bug Fixes

- instrtext bug with unhandled angled brackets ([#1051](https://github.com/Harbour-Enterprises/SuperDoc/issues/1051)) ([71cf182](https://github.com/Harbour-Enterprises/SuperDoc/commit/71cf1825b46832da1039269a1c727d3a7c74ffaf))

# [0.22.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.21.0...v0.22.0) (2025-09-30)

### Bug Fixes

- context menu bypass standards ([#1029](https://github.com/Harbour-Enterprises/SuperDoc/issues/1029)) ([99e6bf7](https://github.com/Harbour-Enterprises/SuperDoc/commit/99e6bf70244116f5be464737dc03d7e1b2dc4f83))
- context menu bypass standards ([#1032](https://github.com/Harbour-Enterprises/SuperDoc/issues/1032)) ([8c80c2c](https://github.com/Harbour-Enterprises/SuperDoc/commit/8c80c2cc92a531e2296de9d7d03c8a85ea415da6))
- do not track the annotation deletion on table generation ([#1036](https://github.com/Harbour-Enterprises/SuperDoc/issues/1036)) ([5e77dd4](https://github.com/Harbour-Enterprises/SuperDoc/commit/5e77dd419ae71514b1c68f96ef4907f250c199b1))
- import/export of missing pict separators ([#1048](https://github.com/Harbour-Enterprises/SuperDoc/issues/1048)) ([8320a2c](https://github.com/Harbour-Enterprises/SuperDoc/commit/8320a2c92f81cde20db871828f9daf14a9b3e40e))
- losing selection on right click ([1e66343](https://github.com/Harbour-Enterprises/SuperDoc/commit/1e663436f36d8ba316d70521da7982605908e718))
- missing docx defaults from llm generated files ([#1030](https://github.com/Harbour-Enterprises/SuperDoc/issues/1030)) ([de7a2b2](https://github.com/Harbour-Enterprises/SuperDoc/commit/de7a2b27d2a0eb37ce9c8d371268194be10a5d56))
- scope editor DOM queries to recover typing latency ([#1033](https://github.com/Harbour-Enterprises/SuperDoc/issues/1033)) ([7149090](https://github.com/Harbour-Enterprises/SuperDoc/commit/71490902574402c815f546656881d521afea8a70))
- tracked changes don't have corresponding comments ([#1045](https://github.com/Harbour-Enterprises/SuperDoc/issues/1045)) ([ebead1a](https://github.com/Harbour-Enterprises/SuperDoc/commit/ebead1a1ede27f88f58734325888f695b7a40e4b))

### Features

- add MS Word fallback sizes to tables from LLM generated docx missing key data ([#1035](https://github.com/Harbour-Enterprises/SuperDoc/issues/1035)) ([850cc0b](https://github.com/Harbour-Enterprises/SuperDoc/commit/850cc0bc0781f386b3fb1e62ca1cd2be4ba0177d))
- **menu:** add custom context menu items functionality ([#988](https://github.com/Harbour-Enterprises/SuperDoc/issues/988)) ([57e77d9](https://github.com/Harbour-Enterprises/SuperDoc/commit/57e77d9c87f5aabb71b0005254fb925645803fcd))
- structured content commands ([#1037](https://github.com/Harbour-Enterprises/SuperDoc/issues/1037)) ([1acf705](https://github.com/Harbour-Enterprises/SuperDoc/commit/1acf705849a219b5c59428410db3875f25acc52c))

# [0.21.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.20.2...v0.21.0) (2025-09-24)

### Bug Fixes

- allow regex search across docx run wrappers ([#1021](https://github.com/Harbour-Enterprises/SuperDoc/issues/1021)) ([053fedc](https://github.com/Harbour-Enterprises/SuperDoc/commit/053fedcf2f6b611ea5b4bb431fcb306c299d73a0))
- bookmarkStart custom round trip, tests, add example doc with round trip tests ([#1014](https://github.com/Harbour-Enterprises/SuperDoc/issues/1014)) ([0849157](https://github.com/Harbour-Enterprises/SuperDoc/commit/0849157933eda9bf4c0917620e28cac8a9f34cab))
- build ([#992](https://github.com/Harbour-Enterprises/SuperDoc/issues/992)) ([9ce8d6f](https://github.com/Harbour-Enterprises/SuperDoc/commit/9ce8d6fc614158ea83e143e7175319902f74e952))
- commitlint for historical commits ([8294dc5](https://github.com/Harbour-Enterprises/SuperDoc/commit/8294dc5fe64e2fd6e2f01c99deb78070900b33c6))
- deprecation message ([5e2a112](https://github.com/Harbour-Enterprises/SuperDoc/commit/5e2a112a026bac3690dcd784c6ad8ce6bd7b9d89))
- example tests ([25adfea](https://github.com/Harbour-Enterprises/SuperDoc/commit/25adfea9ca37a60057fbfeaa3d2dc7de38df4328))
- examples tests ([21a834a](https://github.com/Harbour-Enterprises/SuperDoc/commit/21a834acf6df93740b14050498b3286a0c80f6c5))
- export table annotation images with sanitized media paths, add tests ([a270b2a](https://github.com/Harbour-Enterprises/SuperDoc/commit/a270b2a3639adc17922ead9791088622bce3232f))
- field annotation export test ([f0a68f4](https://github.com/Harbour-Enterprises/SuperDoc/commit/f0a68f4fa7e5563ead5479d1658daffc7417d849))
- headless mode crash ([#1002](https://github.com/Harbour-Enterprises/SuperDoc/issues/1002)) ([08a72cb](https://github.com/Harbour-Enterprises/SuperDoc/commit/08a72cbf0005804e746eea98caf19b658a597a6d))
- **image:** preserve anchored rotation margins and add coverage ([#1013](https://github.com/Harbour-Enterprises/SuperDoc/issues/1013)) ([15aaba7](https://github.com/Harbour-Enterprises/SuperDoc/commit/15aaba7725b233b27c22d0ceb70113cd0aada779))
- **importer:** retain gdocs comments without extended metadata ([#1017](https://github.com/Harbour-Enterprises/SuperDoc/issues/1017)) ([c232308](https://github.com/Harbour-Enterprises/SuperDoc/commit/c232308289473b41f071326cf8edd1d658e7310e))
- legacy publish ([bffa3da](https://github.com/Harbour-Enterprises/SuperDoc/commit/bffa3dad5853ca04f3ef5d10c73d5fdd9e5a2e5e))
- make 'structured content' title more opaque so its clearly visible over content ([e422e86](https://github.com/Harbour-Enterprises/SuperDoc/commit/e422e86c403a4a68b8f158683828c6b85e517e6f))
- mirror superdoc releases to scoped package ([#1018](https://github.com/Harbour-Enterprises/SuperDoc/issues/1018)) ([fe2ed0f](https://github.com/Harbour-Enterprises/SuperDoc/commit/fe2ed0f89d7e194d75517c9c16165e7c9c104954))
- normalize file names for images, add tests ([#1009](https://github.com/Harbour-Enterprises/SuperDoc/issues/1009)) ([a841905](https://github.com/Harbour-Enterprises/SuperDoc/commit/a841905092d4eb18c25cf0a2b5a43074d832d2a0))
- skip table rows without content ([#990](https://github.com/Harbour-Enterprises/SuperDoc/issues/990)) ([62ce156](https://github.com/Harbour-Enterprises/SuperDoc/commit/62ce15688ba43f987959237751754f25291c6a47))
- table spacing import export ([#1008](https://github.com/Harbour-Enterprises/SuperDoc/issues/1008)) ([7deb5d2](https://github.com/Harbour-Enterprises/SuperDoc/commit/7deb5d2ca0b2195a5f02741de5e90b93eb96ef8c))
- test ([93eb27d](https://github.com/Harbour-Enterprises/SuperDoc/commit/93eb27d78c4cf35f01d2170e6988ea5daf296191))
- ul lists importing as ol ([#978](https://github.com/Harbour-Enterprises/SuperDoc/issues/978)) ([#979](https://github.com/Harbour-Enterprises/SuperDoc/issues/979)) ([d02ea82](https://github.com/Harbour-Enterprises/SuperDoc/commit/d02ea824865e903063c9b7e4003578b573ffe0c6)), closes [#977](https://github.com/Harbour-Enterprises/SuperDoc/issues/977)

### Features

- add bookmark start and end node handlers with v3 translators ([#946](https://github.com/Harbour-Enterprises/SuperDoc/issues/946)) ([81c0b24](https://github.com/Harbour-Enterprises/SuperDoc/commit/81c0b24d286d4cf4c916f86eb8abce0b68b1e8c9))
- add v3 handler for w:tbl table (HAR-10483) ([#985](https://github.com/Harbour-Enterprises/SuperDoc/issues/985)) ([be58be8](https://github.com/Harbour-Enterprises/SuperDoc/commit/be58be842907d12752b81a2f1fb67b5179d52ed8))
- custom highlight plugin example ([7beede6](https://github.com/Harbour-Enterprises/SuperDoc/commit/7beede658b2ce408a6d81a870509d1b37712805d))
- register images from paste + HTML insertion, fixes [#790](https://github.com/Harbour-Enterprises/SuperDoc/issues/790) ([#1010](https://github.com/Harbour-Enterprises/SuperDoc/issues/1010)) ([b444138](https://github.com/Harbour-Enterprises/SuperDoc/commit/b444138ad899acc817e4dad065d9f9fc081e017b))
- run node ([#986](https://github.com/Harbour-Enterprises/SuperDoc/issues/986)) ([4e85dcd](https://github.com/Harbour-Enterprises/SuperDoc/commit/4e85dcd17fdc2f563f247a0f2687558d0d2ccd32))
- structured content node views ([#987](https://github.com/Harbour-Enterprises/SuperDoc/issues/987)) ([1df4d91](https://github.com/Harbour-Enterprises/SuperDoc/commit/1df4d910b658c1cba3b11a157988e10b6662a4cc))

## [0.20.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.20.1...v0.20.2) (2025-09-22)

### Bug Fixes

- image annotation export in tables ([#1004](https://github.com/Harbour-Enterprises/SuperDoc/issues/1004)) ([1e36934](https://github.com/Harbour-Enterprises/SuperDoc/commit/1e3693438031b7d315d4b94e246a355d3c378a65))

## [0.20.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.20.0...v0.20.1) (2025-09-17)

### Bug Fixes

- ul lists importing as ol ([#978](https://github.com/Harbour-Enterprises/SuperDoc/issues/978)) ([4f725c9](https://github.com/Harbour-Enterprises/SuperDoc/commit/4f725c982bdc02b1730ff233a7eb17cc74a6782a)), closes [#977](https://github.com/Harbour-Enterprises/SuperDoc/issues/977)

# [0.20.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.19.0...v0.20.0) (2025-09-17)

### Bug Fixes

- emit editor exception on import/export errors ([#963](https://github.com/Harbour-Enterprises/SuperDoc/issues/963)) ([700dec6](https://github.com/Harbour-Enterprises/SuperDoc/commit/700dec60a36937dc7f9975c5d4bf5e3a0540133e))
- html import parse styleId attr for round-trip fidelity ([#974](https://github.com/Harbour-Enterprises/SuperDoc/issues/974)) ([929fffa](https://github.com/Harbour-Enterprises/SuperDoc/commit/929fffa511faeff18ddedb63eb039971c430949c))
- tests ([#975](https://github.com/Harbour-Enterprises/SuperDoc/issues/975)) ([ee25e12](https://github.com/Harbour-Enterprises/SuperDoc/commit/ee25e12276a029ceebc160314983f4a824ab2b5d))

### Features

- transform lists in copied content to match GoogleDocs/Word standard ([#913](https://github.com/Harbour-Enterprises/SuperDoc/issues/913)) ([1c8f971](https://github.com/Harbour-Enterprises/SuperDoc/commit/1c8f971efb68f74f1fe641dc71dab6a2c4f968e8))

# [0.19.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.18.1...v0.19.0) (2025-09-17)

### Bug Fixes

- content-block node ext wrong schema and rendering rules ([#965](https://github.com/Harbour-Enterprises/SuperDoc/issues/965)) ([#966](https://github.com/Harbour-Enterprises/SuperDoc/issues/966)) ([f037f44](https://github.com/Harbour-Enterprises/SuperDoc/commit/f037f44eddfa3fd31cd36f4f8b4dbfb6300437ee))
- full repo test on npm test or npm run test ([3ede3e0](https://github.com/Harbour-Enterprises/SuperDoc/commit/3ede3e0c079465b94d84367d75d0992b97066a53))
- move undo/redo from collaboration to history ([#956](https://github.com/Harbour-Enterprises/SuperDoc/issues/956)) ([21299f8](https://github.com/Harbour-Enterprises/SuperDoc/commit/21299f85f6eda142cdf0dccac75867228662a1e2))

### Features

- add document.xml.rels validator ([#881](https://github.com/Harbour-Enterprises/SuperDoc/issues/881)) ([ac7f2a9](https://github.com/Harbour-Enterprises/SuperDoc/commit/ac7f2a9e3d8900a65fb29a848261099e86881315))
- add v3 translator for w:tr and w:trPr elements (HAR-10480) ([#953](https://github.com/Harbour-Enterprises/SuperDoc/issues/953)) ([ce4eb8d](https://github.com/Harbour-Enterprises/SuperDoc/commit/ce4eb8db7541abe6805941d31493712d7e1bde21))
- support Blob type in fileSource and document properties ([#967](https://github.com/Harbour-Enterprises/SuperDoc/issues/967)) ([4260c51](https://github.com/Harbour-Enterprises/SuperDoc/commit/4260c510efca8e0fe8791a1ece713c0a0661916a))
- upgrade w:hyperlink import/export to v3 (HAR-10497) ([#942](https://github.com/Harbour-Enterprises/SuperDoc/issues/942)) ([0f98a8e](https://github.com/Harbour-Enterprises/SuperDoc/commit/0f98a8ead96ebd0ebe4258b5bf900385428b2fd3))

## [0.18.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.18.0...v0.18.1) (2025-09-16)

### Bug Fixes

- content-block node ext wrong schema and rendering rules ([#965](https://github.com/Harbour-Enterprises/SuperDoc/issues/965)) ([64fa2fc](https://github.com/Harbour-Enterprises/SuperDoc/commit/64fa2fc2a1a52d2700c0e820b6384b87e8d3bf35))

# [0.18.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.17.3...v0.18.0) (2025-09-12)

### Bug Fixes

- allow test:cov on some specific folder only ([#935](https://github.com/Harbour-Enterprises/SuperDoc/issues/935)) ([42d42fb](https://github.com/Harbour-Enterprises/SuperDoc/commit/42d42fb09d52f36518904ea8c5b400e20778ceee))
- fallback to text for floating objects and show placeholder for emf image ([#916](https://github.com/Harbour-Enterprises/SuperDoc/issues/916)) ([d121cd9](https://github.com/Harbour-Enterprises/SuperDoc/commit/d121cd92608bb41e84d09997792e5512a9ca6faa))
- filter out invalid inline nodes in root level ([#938](https://github.com/Harbour-Enterprises/SuperDoc/issues/938)) ([#939](https://github.com/Harbour-Enterprises/SuperDoc/issues/939)) ([9e1b911](https://github.com/Harbour-Enterprises/SuperDoc/commit/9e1b911809cd2e713b9ba8a38b88c9558f552ee0))
- import issue falling back to wrong abstratId ([#930](https://github.com/Harbour-Enterprises/SuperDoc/issues/930)) ([a5b43d0](https://github.com/Harbour-Enterprises/SuperDoc/commit/a5b43d036133217d6f15661f3b1666d621fee049))
- test ([58ed997](https://github.com/Harbour-Enterprises/SuperDoc/commit/58ed99713d07d6a796a3b5c3b2ee010a0fe29702))
- unable to generate list definition ([#943](https://github.com/Harbour-Enterprises/SuperDoc/issues/943)) ([#945](https://github.com/Harbour-Enterprises/SuperDoc/issues/945)) ([dea20e6](https://github.com/Harbour-Enterprises/SuperDoc/commit/dea20e697e034f508e0aa67720e3ee50b3148c24))

### Features

- implement unified content processing for insertContent command ([#944](https://github.com/Harbour-Enterprises/SuperDoc/issues/944)) ([a6d0e67](https://github.com/Harbour-Enterprises/SuperDoc/commit/a6d0e6770eaf849d126374ac8433c1165c5cbf68))
- translator v3 for w:tab node ([#921](https://github.com/Harbour-Enterprises/SuperDoc/issues/921)) ([ae1ba2d](https://github.com/Harbour-Enterprises/SuperDoc/commit/ae1ba2d69392f73fdc370c6bc4cfe39e7f385cad))

## [0.17.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.17.2...v0.17.3) (2025-09-11)

### Bug Fixes

- unable to generate list definition ([#943](https://github.com/Harbour-Enterprises/SuperDoc/issues/943)) ([a2ccc84](https://github.com/Harbour-Enterprises/SuperDoc/commit/a2ccc847ece06595e38531337093abb1e60f5394))

## [0.17.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.17.1...v0.17.2) (2025-09-11)

### Bug Fixes

- filter out invalid inline nodes in root level ([#938](https://github.com/Harbour-Enterprises/SuperDoc/issues/938)) ([4d77b35](https://github.com/Harbour-Enterprises/SuperDoc/commit/4d77b3512542e4548156fcee1d2cd7334e9f1a0f))

## [0.17.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.17.0...v0.17.1) (2025-09-10)

### Bug Fixes

- import issue falling back to wrong abstratId ([#930](https://github.com/Harbour-Enterprises/SuperDoc/issues/930)) ([94b0679](https://github.com/Harbour-Enterprises/SuperDoc/commit/94b067924d0311b8433e24e2c98cdd9da61d39ae))

# [0.17.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.16.5...v0.17.0) (2025-09-09)

### Bug Fixes

- test release ([3c6d130](https://github.com/Harbour-Enterprises/SuperDoc/commit/3c6d1304120ebfaff4e62fa4310c9c619decf909))

### Features

- begin next development cycle [skip ci] ([714819e](https://github.com/Harbour-Enterprises/SuperDoc/commit/714819e7cd0ef56449e7e65555bf851ebe424636))
- prepare v0.17 release cycle ([ec75bc1](https://github.com/Harbour-Enterprises/SuperDoc/commit/ec75bc1f4bad0ad30d9e12aec10d69563f3f8760))
- remove the heading node from superdoc ([#901](https://github.com/Harbour-Enterprises/SuperDoc/issues/901)) ([02966f4](https://github.com/Harbour-Enterprises/SuperDoc/commit/02966f4555e0c1c949ed0386745d7d041bc5c1e5))

# [0.16.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.15.18...v0.16.0) (2025-09-09)

### Bug Fixes

- add processing for line-height defined in px ([#880](https://github.com/Harbour-Enterprises/SuperDoc/issues/880)) ([3b61275](https://github.com/Harbour-Enterprises/SuperDoc/commit/3b61275eccce054cf88fdb9251780018d9e09575))
- add safety check for clipboard usage ([#859](https://github.com/Harbour-Enterprises/SuperDoc/issues/859)) ([bfca96e](https://github.com/Harbour-Enterprises/SuperDoc/commit/bfca96ea30f60d68229a6648152fb1d49c8de277))
- additional fixes to list indent/outdent, split list, toggle list, types and more tests ([02e6cd9](https://github.com/Harbour-Enterprises/SuperDoc/commit/02e6cd971b672adc7a27ee6f4c3e491ea6582927))
- backspaceNextToList, toggleList and tests ([8b33258](https://github.com/Harbour-Enterprises/SuperDoc/commit/8b33258aa9a09cd566191083de2095377f532de5))
- closing dropdown after clicking again ([#835](https://github.com/Harbour-Enterprises/SuperDoc/issues/835)) ([88ff88d](https://github.com/Harbour-Enterprises/SuperDoc/commit/88ff88d06568716d78be4fcdc311cbba0e6ba3fd))
- correct syntax in release workflow for semantic-release command ([3e6376e](https://github.com/Harbour-Enterprises/SuperDoc/commit/3e6376e600d6bf87b0fb20159452cfddadab3657))
- createNewList in input rule to fix new list in tables, lint ([aa79655](https://github.com/Harbour-Enterprises/SuperDoc/commit/aa796558d84a9dda9177181d547281e668500b6e))
- definition possibly missing name key, add jsdoc ([bb714f1](https://github.com/Harbour-Enterprises/SuperDoc/commit/bb714f14635239301ed6931bb06259b299b11fa8))
- dispatch tracked changes transaction only once at import ([31ecec7](https://github.com/Harbour-Enterprises/SuperDoc/commit/31ecec70ba08d9668f45e9a33b724d7e60cc4b66))
- do not deploy next on oracle or yjs changes ([a02cf33](https://github.com/Harbour-Enterprises/SuperDoc/commit/a02cf33f8ccfbf1ffb67249e912cbc3ebc04f1f6))
- highlight selected value in font dropdowns ([#869](https://github.com/Harbour-Enterprises/SuperDoc/issues/869)) ([4a30f59](https://github.com/Harbour-Enterprises/SuperDoc/commit/4a30f59b3efbdbf3abbeca0e12af38fe980ed03b))
- images are missing for the document in edit mode ([#831](https://github.com/Harbour-Enterprises/SuperDoc/issues/831)) ([a9af47e](https://github.com/Harbour-Enterprises/SuperDoc/commit/a9af47ed4def516900b14460218e476374c69a80))
- imports encoded in utf-16 break DocxZipper ([#860](https://github.com/Harbour-Enterprises/SuperDoc/issues/860)) ([3a1be24](https://github.com/Harbour-Enterprises/SuperDoc/commit/3a1be24798490147dad3d39fc66e1bcac86d7875))
- include package lock on tests folder ([#845](https://github.com/Harbour-Enterprises/SuperDoc/issues/845)) ([1409d02](https://github.com/Harbour-Enterprises/SuperDoc/commit/1409d02ce457db963a5696ec78be30a3f349ffca))
- insertContentAt fails if new line characters (\n) inserted ([dd60d91](https://github.com/Harbour-Enterprises/SuperDoc/commit/dd60d91711e63741e2d6ca2ced02251f2a4e0465))
- insertContentAt for html ([f6c53d3](https://github.com/Harbour-Enterprises/SuperDoc/commit/f6c53d396bbc9745aa8e6c86c950bd68bb24216a))
- inserting html with heading tags does not render as expected (HAR-10430) ([#874](https://github.com/Harbour-Enterprises/SuperDoc/issues/874)) ([bba5074](https://github.com/Harbour-Enterprises/SuperDoc/commit/bba5074692c8fcdba7d6f6c0ef2960ce7c2d7b6a))
- install http server ([#846](https://github.com/Harbour-Enterprises/SuperDoc/issues/846)) ([1a6e684](https://github.com/Harbour-Enterprises/SuperDoc/commit/1a6e684f809ac96e00e370bb324f0317ec6917ef))
- **internal:** remove pdfjs from build ([#843](https://github.com/Harbour-Enterprises/SuperDoc/issues/843)) ([021b2c1](https://github.com/Harbour-Enterprises/SuperDoc/commit/021b2c123052215ba8f52ee103034ebaaa72e1e4))
- japanese list numbering ([#882](https://github.com/Harbour-Enterprises/SuperDoc/issues/882)) ([d256a48](https://github.com/Harbour-Enterprises/SuperDoc/commit/d256a48ac3e723d7da022caebd4fd0eeca8c19a6))
- regex improvements ([ee0333b](https://github.com/Harbour-Enterprises/SuperDoc/commit/ee0333b5c6f3360e7368a8f41b1855cbd96aa550))
- remove footer line length breaking deployments ([04766cd](https://github.com/Harbour-Enterprises/SuperDoc/commit/04766cdb1f085419730212b70eacf4072ef6eeeb))
- restore stored marks if they exist ([#863](https://github.com/Harbour-Enterprises/SuperDoc/issues/863)) ([0a2860e](https://github.com/Harbour-Enterprises/SuperDoc/commit/0a2860e7b8d2e402fc5ee298a58733e8efddaf1f))
- restore stored marks if they exist ([#863](https://github.com/Harbour-Enterprises/SuperDoc/issues/863)) ([1961e5f](https://github.com/Harbour-Enterprises/SuperDoc/commit/1961e5f6199d006c22b40b0f4999a09284de0848))
- splitListItem if there are images or other atom nodes in list item, fix tests ([#878](https://github.com/Harbour-Enterprises/SuperDoc/issues/878)) ([535390f](https://github.com/Harbour-Enterprises/SuperDoc/commit/535390fb622fef24445b31952a796891170eecd2))
- **table:** add support for table row w:cantSplit ([#890](https://github.com/Harbour-Enterprises/SuperDoc/issues/890)) ([3467ad5](https://github.com/Harbour-Enterprises/SuperDoc/commit/3467ad599b748fb091456068926a305c7ccf54a2))
- test ([8572b8a](https://github.com/Harbour-Enterprises/SuperDoc/commit/8572b8ac59970d7dd4aa1625b364308745d630bf))
- test ([65126fd](https://github.com/Harbour-Enterprises/SuperDoc/commit/65126fde2df3a583b5dee431f7c4e94d4fae5357))
- test ([42cb383](https://github.com/Harbour-Enterprises/SuperDoc/commit/42cb383ceb9b316c72796c3a814f5e78f315bbbc))
- test next release ([c3ac7d0](https://github.com/Harbour-Enterprises/SuperDoc/commit/c3ac7d0d02f779f614cc678159fba575fac9b1c9))
- toggle list ([770998a](https://github.com/Harbour-Enterprises/SuperDoc/commit/770998a9e9b5097d1efa031dc12e6bf12920fa8b))
- toggle list for multiple nodes and active selection ([69b3a1b](https://github.com/Harbour-Enterprises/SuperDoc/commit/69b3a1bf645fc42175aa1bd70bff2708a44f1be2))
- toggle list inside tables ([091df80](https://github.com/Harbour-Enterprises/SuperDoc/commit/091df8075515d30de4aa2fc54828cf039868b8e4))
- update condition checks for screenshot updates in CI workflow ([e17fdf0](https://github.com/Harbour-Enterprises/SuperDoc/commit/e17fdf0b939e8caef65f60207611a71343e4cfde))

### Features

- add custom toolbar button example (HAR-10436) ([#868](https://github.com/Harbour-Enterprises/SuperDoc/issues/868)) ([c4fd4d5](https://github.com/Harbour-Enterprises/SuperDoc/commit/c4fd4d58645fdfd9db11e0603d853f7d74c40c92))
- add support for paragraph borders ([#862](https://github.com/Harbour-Enterprises/SuperDoc/issues/862)) ([2f98c07](https://github.com/Harbour-Enterprises/SuperDoc/commit/2f98c07a928913598e2e5fa7732fde65b80ff65c))
- begin v0.18 development ([ed5030f](https://github.com/Harbour-Enterprises/SuperDoc/commit/ed5030fc8b275dd88f26f76b492784795b90d1ab))
- enable dispatching example apps tests ([#844](https://github.com/Harbour-Enterprises/SuperDoc/issues/844)) ([8b2bc73](https://github.com/Harbour-Enterprises/SuperDoc/commit/8b2bc73bb909c2ce93a93e6266f18c17af0b46e2))
- filter out ooxml tags cli to highest priority namespaces ([23b1efa](https://github.com/Harbour-Enterprises/SuperDoc/commit/23b1efabc63f999f1b297ac046e8c178ff345e49))
- ignore specific docx nodes during import ([#909](https://github.com/Harbour-Enterprises/SuperDoc/issues/909)) ([0a99a09](https://github.com/Harbour-Enterprises/SuperDoc/commit/0a99a09b782c70c5f47705d380a0816a7622cdff))
- new release cycle after version sync ([eb9684a](https://github.com/Harbour-Enterprises/SuperDoc/commit/eb9684a2dbdf7abc24b48ec99c35acdafcc31a3f))

# [0.16.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.15.18...v0.16.0) (2025-09-09)

### Bug Fixes

- add processing for line-height defined in px ([#880](https://github.com/Harbour-Enterprises/SuperDoc/issues/880)) ([3b61275](https://github.com/Harbour-Enterprises/SuperDoc/commit/3b61275eccce054cf88fdb9251780018d9e09575))
- add safety check for clipboard usage ([#859](https://github.com/Harbour-Enterprises/SuperDoc/issues/859)) ([bfca96e](https://github.com/Harbour-Enterprises/SuperDoc/commit/bfca96ea30f60d68229a6648152fb1d49c8de277))
- additional fixes to list indent/outdent, split list, toggle list, types and more tests ([02e6cd9](https://github.com/Harbour-Enterprises/SuperDoc/commit/02e6cd971b672adc7a27ee6f4c3e491ea6582927))
- backspaceNextToList, toggleList and tests ([8b33258](https://github.com/Harbour-Enterprises/SuperDoc/commit/8b33258aa9a09cd566191083de2095377f532de5))
- closing dropdown after clicking again ([#835](https://github.com/Harbour-Enterprises/SuperDoc/issues/835)) ([88ff88d](https://github.com/Harbour-Enterprises/SuperDoc/commit/88ff88d06568716d78be4fcdc311cbba0e6ba3fd))
- correct syntax in release workflow for semantic-release command ([3e6376e](https://github.com/Harbour-Enterprises/SuperDoc/commit/3e6376e600d6bf87b0fb20159452cfddadab3657))
- createNewList in input rule to fix new list in tables, lint ([aa79655](https://github.com/Harbour-Enterprises/SuperDoc/commit/aa796558d84a9dda9177181d547281e668500b6e))
- definition possibly missing name key, add jsdoc ([bb714f1](https://github.com/Harbour-Enterprises/SuperDoc/commit/bb714f14635239301ed6931bb06259b299b11fa8))
- dispatch tracked changes transaction only once at import ([31ecec7](https://github.com/Harbour-Enterprises/SuperDoc/commit/31ecec70ba08d9668f45e9a33b724d7e60cc4b66))
- do not deploy next on oracle or yjs changes ([a02cf33](https://github.com/Harbour-Enterprises/SuperDoc/commit/a02cf33f8ccfbf1ffb67249e912cbc3ebc04f1f6))
- highlight selected value in font dropdowns ([#869](https://github.com/Harbour-Enterprises/SuperDoc/issues/869)) ([4a30f59](https://github.com/Harbour-Enterprises/SuperDoc/commit/4a30f59b3efbdbf3abbeca0e12af38fe980ed03b))
- images are missing for the document in edit mode ([#831](https://github.com/Harbour-Enterprises/SuperDoc/issues/831)) ([a9af47e](https://github.com/Harbour-Enterprises/SuperDoc/commit/a9af47ed4def516900b14460218e476374c69a80))
- imports encoded in utf-16 break DocxZipper ([#860](https://github.com/Harbour-Enterprises/SuperDoc/issues/860)) ([3a1be24](https://github.com/Harbour-Enterprises/SuperDoc/commit/3a1be24798490147dad3d39fc66e1bcac86d7875))
- include package lock on tests folder ([#845](https://github.com/Harbour-Enterprises/SuperDoc/issues/845)) ([1409d02](https://github.com/Harbour-Enterprises/SuperDoc/commit/1409d02ce457db963a5696ec78be30a3f349ffca))
- insertContentAt fails if new line characters (\n) inserted ([dd60d91](https://github.com/Harbour-Enterprises/SuperDoc/commit/dd60d91711e63741e2d6ca2ced02251f2a4e0465))
- insertContentAt for html ([f6c53d3](https://github.com/Harbour-Enterprises/SuperDoc/commit/f6c53d396bbc9745aa8e6c86c950bd68bb24216a))
- inserting html with heading tags does not render as expected (HAR-10430) ([#874](https://github.com/Harbour-Enterprises/SuperDoc/issues/874)) ([bba5074](https://github.com/Harbour-Enterprises/SuperDoc/commit/bba5074692c8fcdba7d6f6c0ef2960ce7c2d7b6a))
- install http server ([#846](https://github.com/Harbour-Enterprises/SuperDoc/issues/846)) ([1a6e684](https://github.com/Harbour-Enterprises/SuperDoc/commit/1a6e684f809ac96e00e370bb324f0317ec6917ef))
- **internal:** remove pdfjs from build ([#843](https://github.com/Harbour-Enterprises/SuperDoc/issues/843)) ([021b2c1](https://github.com/Harbour-Enterprises/SuperDoc/commit/021b2c123052215ba8f52ee103034ebaaa72e1e4))
- japanese list numbering ([#882](https://github.com/Harbour-Enterprises/SuperDoc/issues/882)) ([d256a48](https://github.com/Harbour-Enterprises/SuperDoc/commit/d256a48ac3e723d7da022caebd4fd0eeca8c19a6))
- regex improvements ([ee0333b](https://github.com/Harbour-Enterprises/SuperDoc/commit/ee0333b5c6f3360e7368a8f41b1855cbd96aa550))
- remove footer line length breaking deployments ([04766cd](https://github.com/Harbour-Enterprises/SuperDoc/commit/04766cdb1f085419730212b70eacf4072ef6eeeb))
- restore stored marks if they exist ([#863](https://github.com/Harbour-Enterprises/SuperDoc/issues/863)) ([0a2860e](https://github.com/Harbour-Enterprises/SuperDoc/commit/0a2860e7b8d2e402fc5ee298a58733e8efddaf1f))
- restore stored marks if they exist ([#863](https://github.com/Harbour-Enterprises/SuperDoc/issues/863)) ([1961e5f](https://github.com/Harbour-Enterprises/SuperDoc/commit/1961e5f6199d006c22b40b0f4999a09284de0848))
- splitListItem if there are images or other atom nodes in list item, fix tests ([#878](https://github.com/Harbour-Enterprises/SuperDoc/issues/878)) ([535390f](https://github.com/Harbour-Enterprises/SuperDoc/commit/535390fb622fef24445b31952a796891170eecd2))
- **table:** add support for table row w:cantSplit ([#890](https://github.com/Harbour-Enterprises/SuperDoc/issues/890)) ([3467ad5](https://github.com/Harbour-Enterprises/SuperDoc/commit/3467ad599b748fb091456068926a305c7ccf54a2))
- test ([8572b8a](https://github.com/Harbour-Enterprises/SuperDoc/commit/8572b8ac59970d7dd4aa1625b364308745d630bf))
- test ([65126fd](https://github.com/Harbour-Enterprises/SuperDoc/commit/65126fde2df3a583b5dee431f7c4e94d4fae5357))
- test ([42cb383](https://github.com/Harbour-Enterprises/SuperDoc/commit/42cb383ceb9b316c72796c3a814f5e78f315bbbc))
- test next release ([c3ac7d0](https://github.com/Harbour-Enterprises/SuperDoc/commit/c3ac7d0d02f779f614cc678159fba575fac9b1c9))
- toggle list ([770998a](https://github.com/Harbour-Enterprises/SuperDoc/commit/770998a9e9b5097d1efa031dc12e6bf12920fa8b))
- toggle list for multiple nodes and active selection ([69b3a1b](https://github.com/Harbour-Enterprises/SuperDoc/commit/69b3a1bf645fc42175aa1bd70bff2708a44f1be2))
- toggle list inside tables ([091df80](https://github.com/Harbour-Enterprises/SuperDoc/commit/091df8075515d30de4aa2fc54828cf039868b8e4))
- update condition checks for screenshot updates in CI workflow ([e17fdf0](https://github.com/Harbour-Enterprises/SuperDoc/commit/e17fdf0b939e8caef65f60207611a71343e4cfde))

### Features

- add custom toolbar button example (HAR-10436) ([#868](https://github.com/Harbour-Enterprises/SuperDoc/issues/868)) ([c4fd4d5](https://github.com/Harbour-Enterprises/SuperDoc/commit/c4fd4d58645fdfd9db11e0603d853f7d74c40c92))
- add support for paragraph borders ([#862](https://github.com/Harbour-Enterprises/SuperDoc/issues/862)) ([2f98c07](https://github.com/Harbour-Enterprises/SuperDoc/commit/2f98c07a928913598e2e5fa7732fde65b80ff65c))
- begin v0.18 development ([ed5030f](https://github.com/Harbour-Enterprises/SuperDoc/commit/ed5030fc8b275dd88f26f76b492784795b90d1ab))
- enable dispatching example apps tests ([#844](https://github.com/Harbour-Enterprises/SuperDoc/issues/844)) ([8b2bc73](https://github.com/Harbour-Enterprises/SuperDoc/commit/8b2bc73bb909c2ce93a93e6266f18c17af0b46e2))
- filter out ooxml tags cli to highest priority namespaces ([23b1efa](https://github.com/Harbour-Enterprises/SuperDoc/commit/23b1efabc63f999f1b297ac046e8c178ff345e49))
- ignore specific docx nodes during import ([#909](https://github.com/Harbour-Enterprises/SuperDoc/issues/909)) ([0a99a09](https://github.com/Harbour-Enterprises/SuperDoc/commit/0a99a09b782c70c5f47705d380a0816a7622cdff))

# Changelog

## <small>0.15.18 (2025-08-30)</small>

- fix: add error notice if invalid docx is opened, fallback to blank ([0af7a7d](https://github.com/Harbour-Enterprises/SuperDoc/commit/0af7a7d))
- fix: jsonOverride documentation (#821) ([f983b6a](https://github.com/Harbour-Enterprises/SuperDoc/commit/f983b6a)), closes [#821](https://github.com/Harbour-Enterprises/SuperDoc/issues/821)
- fix: missing tooltip for linked styles ([349e0ac](https://github.com/Harbour-Enterprises/SuperDoc/commit/349e0ac))
- feat: add load from json example (#824) ([ce3a737](https://github.com/Harbour-Enterprises/SuperDoc/commit/ce3a737)), closes [#824](https://github.com/Harbour-Enterprises/SuperDoc/issues/824)
- feat: added content replace html/json example (#822) ([82625fd](https://github.com/Harbour-Enterprises/SuperDoc/commit/82625fd)), closes [#822](https://github.com/Harbour-Enterprises/SuperDoc/issues/822)
- chore: bump version → 0.15.18-next.0 ([0a86a34](https://github.com/Harbour-Enterprises/SuperDoc/commit/0a86a34))
- chore: release v0.15.18-next.1 [skip ci] ([d6ee757](https://github.com/Harbour-Enterprises/SuperDoc/commit/d6ee757))
- chore: release v0.15.18-next.2 [skip ci] ([46a9373](https://github.com/Harbour-Enterprises/SuperDoc/commit/46a9373))
- chore: release v0.15.18-next.3 [skip ci] ([f3bb9c0](https://github.com/Harbour-Enterprises/SuperDoc/commit/f3bb9c0))
- HAR-10247: add validator rules to clean up numberingxml (#800) ([07d472a](https://github.com/Harbour-Enterprises/SuperDoc/commit/07d472a)), closes [#800](https://github.com/Harbour-Enterprises/SuperDoc/issues/800)

## <small>0.15.17 (2025-08-29)</small>

- chore: add Extensions to superdoc exports, update example ([4965561](https://github.com/Harbour-Enterprises/SuperDoc/commit/4965561))
- chore: add types to CommandService ([98a375b](https://github.com/Harbour-Enterprises/SuperDoc/commit/98a375b))
- chore: bump version → 0.15.17-next.0 ([793c9f0](https://github.com/Harbour-Enterprises/SuperDoc/commit/793c9f0))
- chore: fix ts types in link.js ([b9de2d5](https://github.com/Harbour-Enterprises/SuperDoc/commit/b9de2d5))
- chore: move document section helpers into addHelpers(), update example ([43d807a](https://github.com/Harbour-Enterprises/SuperDoc/commit/43d807a))
- chore: release v0.15.17-next.1 [skip ci] ([4900714](https://github.com/Harbour-Enterprises/SuperDoc/commit/4900714))
- chore: release v0.15.17-next.10 [skip ci] ([28ca017](https://github.com/Harbour-Enterprises/SuperDoc/commit/28ca017))
- chore: release v0.15.17-next.11 [skip ci] ([251b102](https://github.com/Harbour-Enterprises/SuperDoc/commit/251b102))
- chore: release v0.15.17-next.12 [skip ci] ([23b2910](https://github.com/Harbour-Enterprises/SuperDoc/commit/23b2910))
- chore: release v0.15.17-next.2 [skip ci] ([6dec1fc](https://github.com/Harbour-Enterprises/SuperDoc/commit/6dec1fc))
- chore: release v0.15.17-next.3 [skip ci] ([f57ea0f](https://github.com/Harbour-Enterprises/SuperDoc/commit/f57ea0f))
- chore: release v0.15.17-next.4 [skip ci] ([4ea6d92](https://github.com/Harbour-Enterprises/SuperDoc/commit/4ea6d92))
- chore: release v0.15.17-next.5 [skip ci] ([36c27a8](https://github.com/Harbour-Enterprises/SuperDoc/commit/36c27a8))
- chore: release v0.15.17-next.6 [skip ci] ([649663b](https://github.com/Harbour-Enterprises/SuperDoc/commit/649663b))
- chore: release v0.15.17-next.7 [skip ci] ([7e9563d](https://github.com/Harbour-Enterprises/SuperDoc/commit/7e9563d))
- chore: release v0.15.17-next.8 [skip ci] ([da7bca9](https://github.com/Harbour-Enterprises/SuperDoc/commit/da7bca9))
- chore: release v0.15.17-next.9 [skip ci] ([6bbd01b](https://github.com/Harbour-Enterprises/SuperDoc/commit/6bbd01b))
- chore(deps-dev): bump eslint from 9.31.0 to 9.34.0 (#807) ([59a0c25](https://github.com/Harbour-Enterprises/SuperDoc/commit/59a0c25)), closes [#807](https://github.com/Harbour-Enterprises/SuperDoc/issues/807)
- chore(deps): bump vue from 3.5.17 to 3.5.20 (#806) ([6033c55](https://github.com/Harbour-Enterprises/SuperDoc/commit/6033c55)), closes [#806](https://github.com/Harbour-Enterprises/SuperDoc/issues/806)
- HAR-10410 - fix: editor crash and structured content node (#820) ([b788d10](https://github.com/Harbour-Enterprises/SuperDoc/commit/b788d10)), closes [#820](https://github.com/Harbour-Enterprises/SuperDoc/issues/820)
- feature: ooxml-oracle dev tool CLI and lib (#815) ([0de3986](https://github.com/Harbour-Enterprises/SuperDoc/commit/0de3986)), closes [#815](https://github.com/Harbour-Enterprises/SuperDoc/issues/815)
- docs: document other extensions (#819) ([5fca478](https://github.com/Harbour-Enterprises/SuperDoc/commit/5fca478)), closes [#819](https://github.com/Harbour-Enterprises/SuperDoc/issues/819)
- feat: add table module documentation + keyboard shortcuts (#818) ([2130716](https://github.com/Harbour-Enterprises/SuperDoc/commit/2130716)), closes [#818](https://github.com/Harbour-Enterprises/SuperDoc/issues/818)
- feat: enhance text formatting extensions with detailed command documentation (#811) ([80652eb](https://github.com/Harbour-Enterprises/SuperDoc/commit/80652eb)), closes [#811](https://github.com/Harbour-Enterprises/SuperDoc/issues/811)
- fix: add relationship and rId (#776) ([46beadb](https://github.com/Harbour-Enterprises/SuperDoc/commit/46beadb)), closes [#776](https://github.com/Harbour-Enterprises/SuperDoc/issues/776)
- fix(track changes): fix permissions issue and group replace changes (#816) ([f61c52b](https://github.com/Harbour-Enterprises/SuperDoc/commit/f61c52b)), closes [#816](https://github.com/Harbour-Enterprises/SuperDoc/issues/816)
- fix(underline): remove invalid underline nodes (#812) ([5606384](https://github.com/Harbour-Enterprises/SuperDoc/commit/5606384)), closes [#812](https://github.com/Harbour-Enterprises/SuperDoc/issues/812)
- refactor: enhance documentation for section attributes and commands in DocumentSection (#805) ([37a4a6a](https://github.com/Harbour-Enterprises/SuperDoc/commit/37a4a6a)), closes [#805](https://github.com/Harbour-Enterprises/SuperDoc/issues/805)

## <small>0.15.16 (2025-08-25)</small>

- feat: integrate markdown parsing into SuperDoc (#796) ([f1a2cf4](https://github.com/Harbour-Enterprises/SuperDoc/commit/f1a2cf4)), closes [#796](https://github.com/Harbour-Enterprises/SuperDoc/issues/796) [#797](https://github.com/Harbour-Enterprises/SuperDoc/issues/797)
- feat: programmatic text selection example (#792) ([b06e394](https://github.com/Harbour-Enterprises/SuperDoc/commit/b06e394)), closes [#792](https://github.com/Harbour-Enterprises/SuperDoc/issues/792)
- chore: add jsdocs + extension docs auto-gen (#783) ([a943c94](https://github.com/Harbour-Enterprises/SuperDoc/commit/a943c94)), closes [#783](https://github.com/Harbour-Enterprises/SuperDoc/issues/783) [#798](https://github.com/Harbour-Enterprises/SuperDoc/issues/798)
- chore: add test to document-sections updateSectionById ([96cc3b7](https://github.com/Harbour-Enterprises/SuperDoc/commit/96cc3b7))
- chore: bump version → 0.15.16-next.0 ([c14bf4d](https://github.com/Harbour-Enterprises/SuperDoc/commit/c14bf4d))
- chore: lint fixes ([66cc7ba](https://github.com/Harbour-Enterprises/SuperDoc/commit/66cc7ba))
- chore: release v0.15.16-next.1 [skip ci] ([7407524](https://github.com/Harbour-Enterprises/SuperDoc/commit/7407524))
- chore: release v0.15.16-next.10 [skip ci] ([4186627](https://github.com/Harbour-Enterprises/SuperDoc/commit/4186627))
- chore: release v0.15.16-next.11 [skip ci] ([2dcbdb5](https://github.com/Harbour-Enterprises/SuperDoc/commit/2dcbdb5))
- chore: release v0.15.16-next.2 [skip ci] ([83607ba](https://github.com/Harbour-Enterprises/SuperDoc/commit/83607ba))
- chore: release v0.15.16-next.3 [skip ci] ([62daad3](https://github.com/Harbour-Enterprises/SuperDoc/commit/62daad3))
- chore: release v0.15.16-next.4 [skip ci] ([baf01f5](https://github.com/Harbour-Enterprises/SuperDoc/commit/baf01f5))
- chore: release v0.15.16-next.5 [skip ci] ([76b240a](https://github.com/Harbour-Enterprises/SuperDoc/commit/76b240a))
- chore: release v0.15.16-next.6 [skip ci] ([d4ad898](https://github.com/Harbour-Enterprises/SuperDoc/commit/d4ad898))
- chore: release v0.15.16-next.7 [skip ci] ([eab0864](https://github.com/Harbour-Enterprises/SuperDoc/commit/eab0864))
- chore: release v0.15.16-next.8 [skip ci] ([ab2b2f3](https://github.com/Harbour-Enterprises/SuperDoc/commit/ab2b2f3))
- chore: release v0.15.16-next.9 [skip ci] ([4da470d](https://github.com/Harbour-Enterprises/SuperDoc/commit/4da470d))
- fix: creating list definitions with null ids (#804) ([e6511b9](https://github.com/Harbour-Enterprises/SuperDoc/commit/e6511b9)), closes [#804](https://github.com/Harbour-Enterprises/SuperDoc/issues/804)
- fix: guarding replaceSpecialCharacters against non-strings (#794) ([7f18834](https://github.com/Harbour-Enterprises/SuperDoc/commit/7f18834)), closes [#794](https://github.com/Harbour-Enterprises/SuperDoc/issues/794)
- fix: improve marker width calculation for server-side rendering (#801) ([85205c1](https://github.com/Harbour-Enterprises/SuperDoc/commit/85205c1)), closes [#801](https://github.com/Harbour-Enterprises/SuperDoc/issues/801)
- fix: strikethrough not active on toolbar (#803) ([dfcaf18](https://github.com/Harbour-Enterprises/SuperDoc/commit/dfcaf18)), closes [#803](https://github.com/Harbour-Enterprises/SuperDoc/issues/803)
- HAR-10208 - Trackable id (#788) ([7a696c6](https://github.com/Harbour-Enterprises/SuperDoc/commit/7a696c6)), closes [#788](https://github.com/Harbour-Enterprises/SuperDoc/issues/788) [#793](https://github.com/Harbour-Enterprises/SuperDoc/issues/793)
- refactor: check isheadless mode before canvas ([d085d87](https://github.com/Harbour-Enterprises/SuperDoc/commit/d085d87))
- refactor: streamline marker width calculation with improved canvas fallback handling ([536d9ac](https://github.com/Harbour-Enterprises/SuperDoc/commit/536d9ac))

## <small>0.15.15 (2025-08-21)</small>

- chore: bump version → 0.15.15-next.0 ([42e0982](https://github.com/Harbour-Enterprises/SuperDoc/commit/42e0982))
- chore: clean up logs ([5ee44c2](https://github.com/Harbour-Enterprises/SuperDoc/commit/5ee44c2))
- chore: release v0.15.15-next.1 [skip ci] ([be340e0](https://github.com/Harbour-Enterprises/SuperDoc/commit/be340e0))
- chore: release v0.15.15-next.2 [skip ci] ([a44ad1c](https://github.com/Harbour-Enterprises/SuperDoc/commit/a44ad1c))
- chore: release v0.15.15-next.3 [skip ci] ([5905936](https://github.com/Harbour-Enterprises/SuperDoc/commit/5905936))
- chore: release v0.15.15-next.4 [skip ci] ([07796cd](https://github.com/Harbour-Enterprises/SuperDoc/commit/07796cd))
- chore: release v0.15.15-next.5 [skip ci] ([5e944d2](https://github.com/Harbour-Enterprises/SuperDoc/commit/5e944d2))
- chore: release v0.15.15-next.6 [skip ci] ([b1fcd4d](https://github.com/Harbour-Enterprises/SuperDoc/commit/b1fcd4d))
- chore: release v0.15.15-next.7 [skip ci] ([4e8309c](https://github.com/Harbour-Enterprises/SuperDoc/commit/4e8309c))
- fix: toolbar overflow command error (#787) ([5650b2a](https://github.com/Harbour-Enterprises/SuperDoc/commit/5650b2a)), closes [#787](https://github.com/Harbour-Enterprises/SuperDoc/issues/787)
- fix(line-break): make gdocs compatible line breaks (#789) ([3690c6e](https://github.com/Harbour-Enterprises/SuperDoc/commit/3690c6e)), closes [#789](https://github.com/Harbour-Enterprises/SuperDoc/issues/789)
- fix(text indent): parse unit on export (#782) ([9819380](https://github.com/Harbour-Enterprises/SuperDoc/commit/9819380)), closes [#782](https://github.com/Harbour-Enterprises/SuperDoc/issues/782)
- feat: added duration to transaction callback (#778) ([4cb21a3](https://github.com/Harbour-Enterprises/SuperDoc/commit/4cb21a3)), closes [#778](https://github.com/Harbour-Enterprises/SuperDoc/issues/778)
- feat(lists paste): handle paste from Google docs (#779) ([f891c40](https://github.com/Harbour-Enterprises/SuperDoc/commit/f891c40)), closes [#779](https://github.com/Harbour-Enterprises/SuperDoc/issues/779)
- test: tests for getTextIndentExportValue (#784) ([a406e73](https://github.com/Harbour-Enterprises/SuperDoc/commit/a406e73)), closes [#784](https://github.com/Harbour-Enterprises/SuperDoc/issues/784)

## <small>0.15.14 (2025-08-15)</small>

- chore: bump version → 0.15.14-next.0 ([5056aed](https://github.com/Harbour-Enterprises/SuperDoc/commit/5056aed))
- chore: release v0.15.14-next.1 [skip ci] ([031227d](https://github.com/Harbour-Enterprises/SuperDoc/commit/031227d))
- fix: preserve empty spaces in XML parsing and handle temporary wrappers in text node importer (#775) ([1a6a34e](https://github.com/Harbour-Enterprises/SuperDoc/commit/1a6a34e)), closes [#775](https://github.com/Harbour-Enterprises/SuperDoc/issues/775)
- feat: add word addin example (#757) ([2ee08c4](https://github.com/Harbour-Enterprises/SuperDoc/commit/2ee08c4)), closes [#757](https://github.com/Harbour-Enterprises/SuperDoc/issues/757)

## <small>0.15.13 (2025-08-14)</small>

- chore: bump version → 0.15.13-next.0 ([50573ab](https://github.com/Harbour-Enterprises/SuperDoc/commit/50573ab))
- chore: bump version → 0.15.14-next.0 ([4e07f42](https://github.com/Harbour-Enterprises/SuperDoc/commit/4e07f42))
- chore: release v0.15.13-next.1 [skip ci] ([456f05d](https://github.com/Harbour-Enterprises/SuperDoc/commit/456f05d))
- chore: update patch ([34ec252](https://github.com/Harbour-Enterprises/SuperDoc/commit/34ec252))
- fix: formatting issues (#773) ([a992f68](https://github.com/Harbour-Enterprises/SuperDoc/commit/a992f68)), closes [#773](https://github.com/Harbour-Enterprises/SuperDoc/issues/773)
- Add roadmap to README ([ecdd54c](https://github.com/Harbour-Enterprises/SuperDoc/commit/ecdd54c))

## <small>0.15.12 (2025-08-13)</small>

- fix: default field export background transparent, allow config on export (#770) ([1ab87d1](https://github.com/Harbour-Enterprises/SuperDoc/commit/1ab87d1)), closes [#770](https://github.com/Harbour-Enterprises/SuperDoc/issues/770)
- fix: list items (#771) ([50666d3](https://github.com/Harbour-Enterprises/SuperDoc/commit/50666d3)), closes [#771](https://github.com/Harbour-Enterprises/SuperDoc/issues/771)
- chore: add constants in node view, lint and format (#772) ([c591032](https://github.com/Harbour-Enterprises/SuperDoc/commit/c591032)), closes [#772](https://github.com/Harbour-Enterprises/SuperDoc/issues/772)
- chore: bump version → 0.15.12-next.0 ([df40836](https://github.com/Harbour-Enterprises/SuperDoc/commit/df40836))
- chore: release v0.15.12-next.1 [skip ci] ([d1c9d26](https://github.com/Harbour-Enterprises/SuperDoc/commit/d1c9d26))
- chore: release v0.15.12-next.2 [skip ci] ([7748de9](https://github.com/Harbour-Enterprises/SuperDoc/commit/7748de9))

## <small>0.15.11 (2025-08-12)</small>

- chore: bump version → 0.15.11-next.0 ([e4c3c24](https://github.com/Harbour-Enterprises/SuperDoc/commit/e4c3c24))
- chore: release v0.15.11-next.1 [skip ci] ([e64ad2e](https://github.com/Harbour-Enterprises/SuperDoc/commit/e64ad2e))
- chore: release v0.15.11-next.2 [skip ci] ([049f7d5](https://github.com/Harbour-Enterprises/SuperDoc/commit/049f7d5))
- chore: release v0.15.11-next.3 [skip ci] ([ad32fc4](https://github.com/Harbour-Enterprises/SuperDoc/commit/ad32fc4))
- chore: release v0.15.11-next.4 [skip ci] ([e349fdc](https://github.com/Harbour-Enterprises/SuperDoc/commit/e349fdc))
- chore: release v0.15.11-next.5 [skip ci] ([5939de1](https://github.com/Harbour-Enterprises/SuperDoc/commit/5939de1))
- chore: release v0.15.11-next.6 [skip ci] ([44b3095](https://github.com/Harbour-Enterprises/SuperDoc/commit/44b3095))
- chore: release v0.15.11-next.7 [skip ci] ([ddddf67](https://github.com/Harbour-Enterprises/SuperDoc/commit/ddddf67))
- chore: test e2e visual tests ([6b796ce](https://github.com/Harbour-Enterprises/SuperDoc/commit/6b796ce))
- fix: add support for vrect nodes (#758) ([acabf81](https://github.com/Harbour-Enterprises/SuperDoc/commit/acabf81)), closes [#758](https://github.com/Harbour-Enterprises/SuperDoc/issues/758)
- fix: annotations import (#755) ([b6135ac](https://github.com/Harbour-Enterprises/SuperDoc/commit/b6135ac)), closes [#755](https://github.com/Harbour-Enterprises/SuperDoc/issues/755)
- fix: clean up lint warnings and remove unused code (#754) ([df73156](https://github.com/Harbour-Enterprises/SuperDoc/commit/df73156)), closes [#754](https://github.com/Harbour-Enterprises/SuperDoc/issues/754)
- fix: position out of range crash in cleanUpParagraphWithAnnotations ([49acd8f](https://github.com/Harbour-Enterprises/SuperDoc/commit/49acd8f))
- fix: prevent processing of text nodes in AutoPageNumberNodeView (#768) ([e257949](https://github.com/Harbour-Enterprises/SuperDoc/commit/e257949)), closes [#768](https://github.com/Harbour-Enterprises/SuperDoc/issues/768)
- fix(runs): add ability to store an export run styleIds (#765) ([ea3748e](https://github.com/Harbour-Enterprises/SuperDoc/commit/ea3748e)), closes [#765](https://github.com/Harbour-Enterprises/SuperDoc/issues/765)
- feat: add tab stop support (#730) ([fb1f0c1](https://github.com/Harbour-Enterprises/SuperDoc/commit/fb1f0c1)), closes [#730](https://github.com/Harbour-Enterprises/SuperDoc/issues/730)
- feat: linked editors example config + assets (#764) ([37b68e6](https://github.com/Harbour-Enterprises/SuperDoc/commit/37b68e6)), closes [#764](https://github.com/Harbour-Enterprises/SuperDoc/issues/764)

## <small>0.15.10 (2025-08-07)</small>

- chore: add package.json to gha paths-ignore ([983fa92](https://github.com/Harbour-Enterprises/SuperDoc/commit/983fa92))
- chore: bump version → 0.15.10-next.0 ([94ea03a](https://github.com/Harbour-Enterprises/SuperDoc/commit/94ea03a))
- chore: release v0.15.10-next.1 [skip ci] ([737ca16](https://github.com/Harbour-Enterprises/SuperDoc/commit/737ca16))
- chore: release v0.15.10-next.2 [skip ci] ([7d5b058](https://github.com/Harbour-Enterprises/SuperDoc/commit/7d5b058))
- chore: release v0.15.10-next.3 [skip ci] ([512e23f](https://github.com/Harbour-Enterprises/SuperDoc/commit/512e23f))
- chore: release v0.15.10-next.4 [skip ci] ([0b90303](https://github.com/Harbour-Enterprises/SuperDoc/commit/0b90303))
- chore: release v0.15.10-next.5 [skip ci] ([7736412](https://github.com/Harbour-Enterprises/SuperDoc/commit/7736412))
- chore: update dependabot.yml ([211280f](https://github.com/Harbour-Enterprises/SuperDoc/commit/211280f))
- chore(deps-dev): bump lint-staged from 16.1.2 to 16.1.4 (#746) ([a5333c0](https://github.com/Harbour-Enterprises/SuperDoc/commit/a5333c0)), closes [#746](https://github.com/Harbour-Enterprises/SuperDoc/issues/746)
- chore(deps-dev): bump rollup from 4.45.1 to 4.46.2 (#745) ([015bc01](https://github.com/Harbour-Enterprises/SuperDoc/commit/015bc01)), closes [#745](https://github.com/Harbour-Enterprises/SuperDoc/issues/745)
- fix: prettier and new dependabot config ([7f4ac1b](https://github.com/Harbour-Enterprises/SuperDoc/commit/7f4ac1b))
- fix: removed duplicate unit tests on CI/CD (#739) ([a31501c](https://github.com/Harbour-Enterprises/SuperDoc/commit/a31501c)), closes [#739](https://github.com/Harbour-Enterprises/SuperDoc/issues/739)
- apply font to list item from annotation (#737) ([a3d2684](https://github.com/Harbour-Enterprises/SuperDoc/commit/a3d2684)), closes [#737](https://github.com/Harbour-Enterprises/SuperDoc/issues/737)
- HAR-10241 - fix table import (#738) ([b338be6](https://github.com/Harbour-Enterprises/SuperDoc/commit/b338be6)), closes [#738](https://github.com/Harbour-Enterprises/SuperDoc/issues/738)

## <small>0.15.9 (2025-08-06)</small>

- fix: remove unused function ([59fa2ca](https://github.com/Harbour-Enterprises/SuperDoc/commit/59fa2ca))
- feat: adds w:numStyleLink support to getListDefinitionDetails, complete unit tests ([c45c32f](https://github.com/Harbour-Enterprises/SuperDoc/commit/c45c32f))
- feat: extend editor to allow addHelpers in extensions ([b3df90d](https://github.com/Harbour-Enterprises/SuperDoc/commit/b3df90d))
- feat: extend linked styles api and reorganize folder ([09aee5f](https://github.com/Harbour-Enterprises/SuperDoc/commit/09aee5f))
- chore: bump version → 0.15.9-next.0 ([aa8f5d2](https://github.com/Harbour-Enterprises/SuperDoc/commit/aa8f5d2))
- chore: release v0.15.8-next.2 [skip ci] ([6af7788](https://github.com/Harbour-Enterprises/SuperDoc/commit/6af7788))
- chore: release v0.15.9-next.1 [skip ci] ([1ef882e](https://github.com/Harbour-Enterprises/SuperDoc/commit/1ef882e))

## <small>0.15.8 (2025-08-05)</small>

- fix: field vs sdt import issue is fixed with new tests, fix issue in test module with comments ([825e647](https://github.com/Harbour-Enterprises/SuperDoc/commit/825e647))
- chore: bump version → 0.15.8-next.0 ([e2dfe29](https://github.com/Harbour-Enterprises/SuperDoc/commit/e2dfe29))
- chore: release v0.15.8-next.1 [skip ci] ([63c8de0](https://github.com/Harbour-Enterprises/SuperDoc/commit/63c8de0))

## <small>0.15.7 (2025-08-05)</small>

- chore: bump version → 0.15.7-next.0 ([0a5ba36](https://github.com/Harbour-Enterprises/SuperDoc/commit/0a5ba36))
- chore: release v0.15.7-next.2 [skip ci] ([f848280](https://github.com/Harbour-Enterprises/SuperDoc/commit/f848280))
- chore: release v0.15.7-next.3 [skip ci] ([a005fea](https://github.com/Harbour-Enterprises/SuperDoc/commit/a005fea))
- chore: update patch ([27ff6f5](https://github.com/Harbour-Enterprises/SuperDoc/commit/27ff6f5))
- chore: update patch ([1c05469](https://github.com/Harbour-Enterprises/SuperDoc/commit/1c05469))
- fix: breaking structured document node import ([a470070](https://github.com/Harbour-Enterprises/SuperDoc/commit/a470070))
- fix: breaking structured document node import (#733) ([ce9b29a](https://github.com/Harbour-Enterprises/SuperDoc/commit/ce9b29a)), closes [#733](https://github.com/Harbour-Enterprises/SuperDoc/issues/733)
- fix: node example document corrupted on dl (#729) ([43bb4b0](https://github.com/Harbour-Enterprises/SuperDoc/commit/43bb4b0)), closes [#729](https://github.com/Harbour-Enterprises/SuperDoc/issues/729)
- fix(lists paste): create custom num definitions for pasted lists (#724) ([b8a7c47](https://github.com/Harbour-Enterprises/SuperDoc/commit/b8a7c47)), closes [#724](https://github.com/Harbour-Enterprises/SuperDoc/issues/724)
- fix annotations export in list (#731) ([92a22d1](https://github.com/Harbour-Enterprises/SuperDoc/commit/92a22d1)), closes [#731](https://github.com/Harbour-Enterprises/SuperDoc/issues/731)
- fix table border export (#727) ([74b2a53](https://github.com/Harbour-Enterprises/SuperDoc/commit/74b2a53)), closes [#727](https://github.com/Harbour-Enterprises/SuperDoc/issues/727)
- remove displayLabel check when importing annotations ([f031363](https://github.com/Harbour-Enterprises/SuperDoc/commit/f031363))
- refactor: add fallback logging for init routine (#728) ([1351421](https://github.com/Harbour-Enterprises/SuperDoc/commit/1351421)), closes [#728](https://github.com/Harbour-Enterprises/SuperDoc/issues/728)

## <small>0.15.6 (2025-08-04)</small>

- fix: add missing id generation call to image validator, fix tests for image validator ([c337647](https://github.com/Harbour-Enterprises/SuperDoc/commit/c337647))
- fix: consider code feedback ([a5c1147](https://github.com/Harbour-Enterprises/SuperDoc/commit/a5c1147))
- fix: extend custom selection plugin again to fix font size, context menu and linked styles cases ([f906f23](https://github.com/Harbour-Enterprises/SuperDoc/commit/f906f23))
- fix: har-10195 highlight tracked changes comment ([1c7be69](https://github.com/Harbour-Enterprises/SuperDoc/commit/1c7be69))
- fix: improve null handling and clean up code in translateList and related functions ([09c88e4](https://github.com/Harbour-Enterprises/SuperDoc/commit/09c88e4))
- fix: jsdoc for image validator ([453f2c1](https://github.com/Harbour-Enterprises/SuperDoc/commit/453f2c1))
- fix: null export for line height breaking docs ([e040d05](https://github.com/Harbour-Enterprises/SuperDoc/commit/e040d05))
- fix: null values in w:line spacing, invalid content types at export ([d4cf9c3](https://github.com/Harbour-Enterprises/SuperDoc/commit/d4cf9c3))
- chore: add safety checks to docx helpers and 100% tests for document rels ([cdd2692](https://github.com/Harbour-Enterprises/SuperDoc/commit/cdd2692))
- chore: add test data folder to prettier ignore ([68fe36d](https://github.com/Harbour-Enterprises/SuperDoc/commit/68fe36d))
- chore: bump version → 0.15.6-next.0 ([14c839c](https://github.com/Harbour-Enterprises/SuperDoc/commit/14c839c))
- chore: clean up ([7ccfe14](https://github.com/Harbour-Enterprises/SuperDoc/commit/7ccfe14))
- chore: fix spelling ([fb91661](https://github.com/Harbour-Enterprises/SuperDoc/commit/fb91661))
- chore: release v0.15.6-next.1 [skip ci] ([2f43532](https://github.com/Harbour-Enterprises/SuperDoc/commit/2f43532))
- chore: release v0.15.6-next.2 [skip ci] ([3f0ab0a](https://github.com/Harbour-Enterprises/SuperDoc/commit/3f0ab0a))
- chore: release v0.15.6-next.3 [skip ci] ([0e23e27](https://github.com/Harbour-Enterprises/SuperDoc/commit/0e23e27))
- chore: release v0.15.6-next.4 [skip ci] ([d45663f](https://github.com/Harbour-Enterprises/SuperDoc/commit/d45663f))
- chore: release v0.15.6-next.5 [skip ci] ([be0b186](https://github.com/Harbour-Enterprises/SuperDoc/commit/be0b186))
- chore: run prettier and lint ([03ca19b](https://github.com/Harbour-Enterprises/SuperDoc/commit/03ca19b))
- feat: add 100% test coverage to validator, change directory structure for individual validator rules ([574000b](https://github.com/Harbour-Enterprises/SuperDoc/commit/574000b))
- feat: super validator infrastructure and first two validators ([721b476](https://github.com/Harbour-Enterprises/SuperDoc/commit/721b476))
- Revert "fix: improve null handling and clean up code in translateList" ([1df6abf](https://github.com/Harbour-Enterprises/SuperDoc/commit/1df6abf))
- refactor: clean up whitespace and formatting in importer and extension files ([f6724a6](https://github.com/Harbour-Enterprises/SuperDoc/commit/f6724a6))

## <small>0.15.5 (2025-08-01)</small>

- chore: bump version → 0.15.3-next.0 ([f3ff0a2](https://github.com/Harbour-Enterprises/SuperDoc/commit/f3ff0a2))
- chore: release v0.15.3-next.1 [skip ci] ([96ad57a](https://github.com/Harbour-Enterprises/SuperDoc/commit/96ad57a))
- chore: release v0.15.3-next.2 [skip ci] ([130150a](https://github.com/Harbour-Enterprises/SuperDoc/commit/130150a))
- chore: release v0.15.3-next.3 [skip ci] ([5036301](https://github.com/Harbour-Enterprises/SuperDoc/commit/5036301))
- chore: release v0.15.3-next.4 [skip ci] ([94dc572](https://github.com/Harbour-Enterprises/SuperDoc/commit/94dc572))
- chore: release v0.15.3-next.5 [skip ci] ([eae5350](https://github.com/Harbour-Enterprises/SuperDoc/commit/eae5350))
- chore: release v0.15.3-next.6 [skip ci] ([15de97c](https://github.com/Harbour-Enterprises/SuperDoc/commit/15de97c))
- chore: release v0.15.3-next.7 [skip ci] ([3785373](https://github.com/Harbour-Enterprises/SuperDoc/commit/3785373))
- chore: release v0.15.4-next.1 [skip ci] ([48779f6](https://github.com/Harbour-Enterprises/SuperDoc/commit/48779f6))
- chore: release v0.15.5-next.1 [skip ci] ([edb16fa](https://github.com/Harbour-Enterprises/SuperDoc/commit/edb16fa))
- chore: release v0.15.5-next.2 [skip ci] ([948c8ea](https://github.com/Harbour-Enterprises/SuperDoc/commit/948c8ea))
- chore: release v0.15.5-next.3 [skip ci] ([55eed1c](https://github.com/Harbour-Enterprises/SuperDoc/commit/55eed1c))
- chore: release v0.15.5-next.4 [skip ci] ([5ca1e54](https://github.com/Harbour-Enterprises/SuperDoc/commit/5ca1e54))
- chore: release v0.15.5-next.5 [skip ci] ([7bf4d94](https://github.com/Harbour-Enterprises/SuperDoc/commit/7bf4d94))
- chore: update patch ([05753ae](https://github.com/Harbour-Enterprises/SuperDoc/commit/05753ae))
- chore: update patch ([47dc5d0](https://github.com/Harbour-Enterprises/SuperDoc/commit/47dc5d0))
- fix: create document section node selection ([60b7b26](https://github.com/Harbour-Enterprises/SuperDoc/commit/60b7b26))
- fix: ensure updateListSync meta is added to run list sync plugin after list clean up ([8485e9a](https://github.com/Harbour-Enterprises/SuperDoc/commit/8485e9a))
- fix: fix issue with moved cleanUpListsWithAnnotations, move both clean up functions ([72689cd](https://github.com/Harbour-Enterprises/SuperDoc/commit/72689cd))
- fix: html paste processing ([1777394](https://github.com/Harbour-Enterprises/SuperDoc/commit/1777394))
- fix: prevent editor selection logic when right-clicking ([a452b2e](https://github.com/Harbour-Enterprises/SuperDoc/commit/a452b2e))
- fix: remove dry run in release-it.next config ([d8c4acb](https://github.com/Harbour-Enterprises/SuperDoc/commit/d8c4acb))
- fix: remove new code from orderedListSyncPlugin breaking list numbering ([bfa77af](https://github.com/Harbour-Enterprises/SuperDoc/commit/bfa77af))
- fix: remove w:szCs for now since we don't support special characters ([44d0e29](https://github.com/Harbour-Enterprises/SuperDoc/commit/44d0e29))
- fix(image annotations): missed image on export ([077cea6](https://github.com/Harbour-Enterprises/SuperDoc/commit/077cea6))
- fix bold ([fb1cacf](https://github.com/Harbour-Enterprises/SuperDoc/commit/fb1cacf))
- formatting fixes ([946a037](https://github.com/Harbour-Enterprises/SuperDoc/commit/946a037))
- formatting fixes ([0c4faa9](https://github.com/Harbour-Enterprises/SuperDoc/commit/0c4faa9))
- HAR-10010 Cleanup empty paragraphs when annotation deleted ([c0a5d60](https://github.com/Harbour-Enterprises/SuperDoc/commit/c0a5d60))
- move cleanup to commands ([e2e7fce](https://github.com/Harbour-Enterprises/SuperDoc/commit/e2e7fce))
- update table cellMinWidth ([b9a090f](https://github.com/Harbour-Enterprises/SuperDoc/commit/b9a090f))

## <small>0.15.4 (2025-07-31)</small>

- fix: create document section node selection ([dfd2e81](https://github.com/Harbour-Enterprises/SuperDoc/commit/dfd2e81))

## <small>0.15.3 (2025-07-31)</small>

- fix: prevent editor selection logic when right-clicking ([4bb1600](https://github.com/Harbour-Enterprises/SuperDoc/commit/4bb1600))

## <small>0.15.2 (2025-07-29)</small>

- chore: add comment to .rels fix ([0142642](https://github.com/Harbour-Enterprises/SuperDoc/commit/0142642))
- chore: bump version → 0.14.21-next.0 ([7259f52](https://github.com/Harbour-Enterprises/SuperDoc/commit/7259f52))
- chore: generate new list definitions for copy pasted lists ([6aa518a](https://github.com/Harbour-Enterprises/SuperDoc/commit/6aa518a))
- chore: increase minor to 0.15 ([aa0ef6c](https://github.com/Harbour-Enterprises/SuperDoc/commit/aa0ef6c))
- chore: release v0.14.20-next.7 [skip ci] ([ee63abe](https://github.com/Harbour-Enterprises/SuperDoc/commit/ee63abe))
- chore: release v0.14.21-next.1 [skip ci] ([cb7f54c](https://github.com/Harbour-Enterprises/SuperDoc/commit/cb7f54c))
- chore: release v0.15.2-next.1 [skip ci] ([8587e28](https://github.com/Harbour-Enterprises/SuperDoc/commit/8587e28))
- chore: release v0.15.2-next.2 [skip ci] ([511960f](https://github.com/Harbour-Enterprises/SuperDoc/commit/511960f))
- chore: release v0.15.2-next.3 [skip ci] ([b5d859d](https://github.com/Harbour-Enterprises/SuperDoc/commit/b5d859d))
- chore: release v0.15.2-next.4 [skip ci] ([956c334](https://github.com/Harbour-Enterprises/SuperDoc/commit/956c334))
- chore: release v0.15.2-next.5 [skip ci] ([b136329](https://github.com/Harbour-Enterprises/SuperDoc/commit/b136329))
- chore: release v0.15.2-next.6 [skip ci] ([8c64342](https://github.com/Harbour-Enterprises/SuperDoc/commit/8c64342))
- chore: release v0.15.2-next.7 [skip ci] ([c93b7d6](https://github.com/Harbour-Enterprises/SuperDoc/commit/c93b7d6))
- chore: release v0.15.2-next.8 [skip ci] ([abafcdb](https://github.com/Harbour-Enterprises/SuperDoc/commit/abafcdb))
- chore: release v0.15.2-next.9 [skip ci] ([a70584b](https://github.com/Harbour-Enterprises/SuperDoc/commit/a70584b))
- chore: use editor.options.element in handleClickOutside ([284838d](https://github.com/Harbour-Enterprises/SuperDoc/commit/284838d))
- fix: consider code review comments ([4360b4d](https://github.com/Harbour-Enterprises/SuperDoc/commit/4360b4d))
- fix: don't prevent default from CMD+F when no search icon in toolbar ([ce5dc2b](https://github.com/Harbour-Enterprises/SuperDoc/commit/ce5dc2b))
- fix: error when importing wp:anchor drawing that is an unsupported shape drawing ([dfd17ab](https://github.com/Harbour-Enterprises/SuperDoc/commit/dfd17ab))
- fix: filter out .rels files from header/footer processing ([b16f183](https://github.com/Harbour-Enterprises/SuperDoc/commit/b16f183))
- fix: har-10158 - fix comments highlighting and identify ([3dfae1c](https://github.com/Harbour-Enterprises/SuperDoc/commit/3dfae1c))
- fix: paragaph fields inside lists for export ([a492e4f](https://github.com/Harbour-Enterprises/SuperDoc/commit/a492e4f))
- fix: prevent footer/header rels files from being added to content types - it breaks validation ([fd48db4](https://github.com/Harbour-Enterprises/SuperDoc/commit/fd48db4))
- fix(lists paste): make lists work when paste into sd ([3f87332](https://github.com/Harbour-Enterprises/SuperDoc/commit/3f87332))
- superdoc examples: nodejs example document replaced ([be5a7be](https://github.com/Harbour-Enterprises/SuperDoc/commit/be5a7be))
- Update package.json ([4106edd](https://github.com/Harbour-Enterprises/SuperDoc/commit/4106edd))
- refactor: remove e2e tests ([0d7a5f7](https://github.com/Harbour-Enterprises/SuperDoc/commit/0d7a5f7))
- refactor: remove missing reference to e2e ([c8ee227](https://github.com/Harbour-Enterprises/SuperDoc/commit/c8ee227))
- refactor: removed missing e2e references ([4cdad7f](https://github.com/Harbour-Enterprises/SuperDoc/commit/4cdad7f))
- refactor(selection): new approach ([e836d02](https://github.com/Harbour-Enterprises/SuperDoc/commit/e836d02))

## <small>0.15.1 (2025-07-24)</small>

- chore: add missing JSDOC ([d49b3f4](https://github.com/Harbour-Enterprises/SuperDoc/commit/d49b3f4))
- chore: add npm run watch to root and npm run watch:es to superdoc package ([117bcff](https://github.com/Harbour-Enterprises/SuperDoc/commit/117bcff))
- chore: add updateSectionById to documentSection api ([048516f](https://github.com/Harbour-Enterprises/SuperDoc/commit/048516f))
- chore: bump version → 0.14.20-next.0 ([6ab4515](https://github.com/Harbour-Enterprises/SuperDoc/commit/6ab4515))
- chore: clean up before document sections additions ([1522061](https://github.com/Harbour-Enterprises/SuperDoc/commit/1522061))
- chore: clean up extra logs ([b0c149b](https://github.com/Harbour-Enterprises/SuperDoc/commit/b0c149b))
- chore: hide lock for now, update sd version ([6d6056d](https://github.com/Harbour-Enterprises/SuperDoc/commit/6d6056d))
- chore: increase minor to 0.15 ([b3224dc](https://github.com/Harbour-Enterprises/SuperDoc/commit/b3224dc))
- chore: make document section node atomic and isolating ([ecf5aa1](https://github.com/Harbour-Enterprises/SuperDoc/commit/ecf5aa1))
- chore: manual bump patch ([cc5a3e6](https://github.com/Harbour-Enterprises/SuperDoc/commit/cc5a3e6))
- chore: release v0.14.20-next.1 [skip ci] ([0087c0c](https://github.com/Harbour-Enterprises/SuperDoc/commit/0087c0c))
- chore: release v0.14.20-next.3 [skip ci] ([939741f](https://github.com/Harbour-Enterprises/SuperDoc/commit/939741f))
- chore: release v0.14.20-next.4 [skip ci] ([7b0923a](https://github.com/Harbour-Enterprises/SuperDoc/commit/7b0923a))
- chore: release v0.14.20-next.5 [skip ci] ([a4594b3](https://github.com/Harbour-Enterprises/SuperDoc/commit/a4594b3))
- chore: release v0.14.20-next.6 [skip ci] ([31ea580](https://github.com/Harbour-Enterprises/SuperDoc/commit/31ea580))
- feat: add context menu document section options ([eeee4f0](https://github.com/Harbour-Enterprises/SuperDoc/commit/eeee4f0))
- feat: add editor sections example ([6b9b0f2](https://github.com/Harbour-Enterprises/SuperDoc/commit/6b9b0f2))
- feat: add external plugin example ([efc5012](https://github.com/Harbour-Enterprises/SuperDoc/commit/efc5012))
- feat: initial document sections node ([7def5d4](https://github.com/Harbour-Enterprises/SuperDoc/commit/7def5d4))
- fix list item node view update, apply marks for new items ([79969bf](https://github.com/Harbour-Enterprises/SuperDoc/commit/79969bf))
- fix lists and linked styles ([7c782b8](https://github.com/Harbour-Enterprises/SuperDoc/commit/7c782b8))
- fix ydoc update ([4c4413c](https://github.com/Harbour-Enterprises/SuperDoc/commit/4c4413c))
- fix: capitalize InputRule in broken import ([73e16cb](https://github.com/Harbour-Enterprises/SuperDoc/commit/73e16cb))
- fix: comments focus ([cbd3d3e](https://github.com/Harbour-Enterprises/SuperDoc/commit/cbd3d3e))
- fix: setWordSelection if no word selected ([b5209c7](https://github.com/Harbour-Enterprises/SuperDoc/commit/b5209c7))
- fix: update ydoc when generating collaborative data ([160fae0](https://github.com/Harbour-Enterprises/SuperDoc/commit/160fae0))

## <small>0.14.19 (2025-07-23)</small>

- fix: missing styles import ([4a216f4](https://github.com/Harbour-Enterprises/SuperDoc/commit/4a216f4))
- chore: bump version → 0.14.19-next.0 ([d9e4fb8](https://github.com/Harbour-Enterprises/SuperDoc/commit/d9e4fb8))
- chore: fix editor handleClickOutside when editor has been destroyed ([c77cbe2](https://github.com/Harbour-Enterprises/SuperDoc/commit/c77cbe2))
- chore: release v0.14.19-next.1 [skip ci] ([689acbd](https://github.com/Harbour-Enterprises/SuperDoc/commit/689acbd))
- chore: release v0.14.19-next.2 [skip ci] ([e4acb71](https://github.com/Harbour-Enterprises/SuperDoc/commit/e4acb71))
- chore: update README on custom node example ([62612e4](https://github.com/Harbour-Enterprises/SuperDoc/commit/62612e4))

## <small>0.14.18 (2025-07-22)</small>

- chore: bump version → 0.14.18-next.0 ([ddba2ed](https://github.com/Harbour-Enterprises/SuperDoc/commit/ddba2ed))
- chore: release v0.14.18-next.1 [skip ci] ([30c598f](https://github.com/Harbour-Enterprises/SuperDoc/commit/30c598f))
- chore: release v0.14.18-next.2 [skip ci] ([a253b34](https://github.com/Harbour-Enterprises/SuperDoc/commit/a253b34))
- chore: release v0.14.18-next.3 [skip ci] ([48038d6](https://github.com/Harbour-Enterprises/SuperDoc/commit/48038d6))
- chore(deps): bump the npm_and_yarn group across 2 directories with 3 updates ([bde2c4d](https://github.com/Harbour-Enterprises/SuperDoc/commit/bde2c4d))
- fix: add check for missing var ([539b49b](https://github.com/Harbour-Enterprises/SuperDoc/commit/539b49b))
- fix: convert var to zero when undefined ([ccf3478](https://github.com/Harbour-Enterprises/SuperDoc/commit/ccf3478))
- fix: make tests pass ([1f4f8f1](https://github.com/Harbour-Enterprises/SuperDoc/commit/1f4f8f1))
- fix: page number styling + table import fixes ([3f785dd](https://github.com/Harbour-Enterprises/SuperDoc/commit/3f785dd))
- fix: select whole doc ([e72ba3d](https://github.com/Harbour-Enterprises/SuperDoc/commit/e72ba3d))
- fix: selections is lost when toolbar dropdown item is clicked ([2b59a56](https://github.com/Harbour-Enterprises/SuperDoc/commit/2b59a56))
- fix: undo/redo buttons are disabled in colaborative mode ([b76a20b](https://github.com/Harbour-Enterprises/SuperDoc/commit/b76a20b))

## <small>0.14.17 (2025-07-22)</small>

- chore: add ESLint configuration and CI workflow for linting and testing ([5dceff1](https://github.com/Harbour-Enterprises/SuperDoc/commit/5dceff1))
- chore: bump patch manually ([bc6a9bb](https://github.com/Harbour-Enterprises/SuperDoc/commit/bc6a9bb))
- chore: bump version → 0.14.14-next.0 ([a63275a](https://github.com/Harbour-Enterprises/SuperDoc/commit/a63275a))
- chore: bump version to fix versioning with main ([05c79d5](https://github.com/Harbour-Enterprises/SuperDoc/commit/05c79d5))
- chore: release v0.14.14-next.1 [skip ci] ([5a5d27f](https://github.com/Harbour-Enterprises/SuperDoc/commit/5a5d27f))
- chore: release v0.14.14-next.2 [skip ci] ([ba3ecb1](https://github.com/Harbour-Enterprises/SuperDoc/commit/ba3ecb1))
- chore: release v0.14.14-next.3 [skip ci] ([35ec1f5](https://github.com/Harbour-Enterprises/SuperDoc/commit/35ec1f5))
- chore: release v0.14.14-next.4 [skip ci] ([baf38b0](https://github.com/Harbour-Enterprises/SuperDoc/commit/baf38b0))
- chore: release v0.14.15-next.1 [skip ci] ([d7b4c3d](https://github.com/Harbour-Enterprises/SuperDoc/commit/d7b4c3d))
- chore: release v0.14.16-next.1 [skip ci] ([7a72ce3](https://github.com/Harbour-Enterprises/SuperDoc/commit/7a72ce3))
- chore: release v0.14.16-next.2 [skip ci] ([7495195](https://github.com/Harbour-Enterprises/SuperDoc/commit/7495195))
- chore: release v0.14.16-next.3 [skip ci] ([c0fdc6e](https://github.com/Harbour-Enterprises/SuperDoc/commit/c0fdc6e))
- chore: release v0.14.16-next.4 [skip ci] ([5719b8d](https://github.com/Harbour-Enterprises/SuperDoc/commit/5719b8d))
- chore: release v0.14.16-next.5 [skip ci] ([0c70295](https://github.com/Harbour-Enterprises/SuperDoc/commit/0c70295))
- chore: revert to using style.css post vite 6 upgrade ([3c2d9c4](https://github.com/Harbour-Enterprises/SuperDoc/commit/3c2d9c4))
- chore: update commitlint configuration to disable body line length limit ([802cc8c](https://github.com/Harbour-Enterprises/SuperDoc/commit/802cc8c))
- chore: update ESLint configuration to enhance linting rules and ignore patterns ([d40593c](https://github.com/Harbour-Enterprises/SuperDoc/commit/d40593c))
- chore: update ESLint configuration to include additional ignore patterns and global variables ([98f51e1](https://github.com/Harbour-Enterprises/SuperDoc/commit/98f51e1))
- chore: update locks ([4651dd8](https://github.com/Harbour-Enterprises/SuperDoc/commit/4651dd8))
- Bump the npm_and_yarn group across 3 directories with 4 updates ([a732dea](https://github.com/Harbour-Enterprises/SuperDoc/commit/a732dea))
- Fix init media not to run on child editors ([134052f](https://github.com/Harbour-Enterprises/SuperDoc/commit/134052f))
- fix numbering.xml on import ([1dbef67](https://github.com/Harbour-Enterprises/SuperDoc/commit/1dbef67))
- fix updateYdocDocxData call ([cce35b0](https://github.com/Harbour-Enterprises/SuperDoc/commit/cce35b0))
- Ignore missing rels ([1f7c619](https://github.com/Harbour-Enterprises/SuperDoc/commit/1f7c619))
- update numbering.xml in collab ([1c9a19a](https://github.com/Harbour-Enterprises/SuperDoc/commit/1c9a19a))
- feat: added PR url to sd tests ([8d62b6b](https://github.com/Harbour-Enterprises/SuperDoc/commit/8d62b6b))
- feat: trigger superdoc-tests ([195ea77](https://github.com/Harbour-Enterprises/SuperDoc/commit/195ea77))
- fix: adjust pagination spacer height range in tests ([029c838](https://github.com/Harbour-Enterprises/SuperDoc/commit/029c838))
- fix: correct typeof comparison in list migration ([6a75ef7](https://github.com/Harbour-Enterprises/SuperDoc/commit/6a75ef7))
- fix: correct typo in exporter debug parameter ([eb7c45d](https://github.com/Harbour-Enterprises/SuperDoc/commit/eb7c45d))
- fix: footer formatting issues(HAR-10117) ([5018e9a](https://github.com/Harbour-Enterprises/SuperDoc/commit/5018e9a))
- fix: prevent assignment to readonly global version ([1059af1](https://github.com/Harbour-Enterprises/SuperDoc/commit/1059af1))
- fix: remove duplicate documentMode in header/footer editor ([8bb6d70](https://github.com/Harbour-Enterprises/SuperDoc/commit/8bb6d70))
- fix: remove duplicate keepOnSplit property in styleId ([1f23697](https://github.com/Harbour-Enterprises/SuperDoc/commit/1f23697))
- fix: remove invisible Unicode characters from comment ([b1d523a](https://github.com/Harbour-Enterprises/SuperDoc/commit/b1d523a))
- fix: resolve variable redeclaration in splitListItem ([de6ce5a](https://github.com/Harbour-Enterprises/SuperDoc/commit/de6ce5a))
- fix: secret ([666e198](https://github.com/Harbour-Enterprises/SuperDoc/commit/666e198))
- fix: standardize code formatting ([dfde48c](https://github.com/Harbour-Enterprises/SuperDoc/commit/dfde48c))
- fix: use variable on SD tests URL ([f400911](https://github.com/Harbour-Enterprises/SuperDoc/commit/f400911))
- fix: workflow dispatch params ([0217eb0](https://github.com/Harbour-Enterprises/SuperDoc/commit/0217eb0))
- fix(har-10122): toolbar styles are missing ([eb7a599](https://github.com/Harbour-Enterprises/SuperDoc/commit/eb7a599))
- fix(har-10122): update compiler options ([a434993](https://github.com/Harbour-Enterprises/SuperDoc/commit/a434993))
- tests: updated pull request trigger ([19facd4](https://github.com/Harbour-Enterprises/SuperDoc/commit/19facd4))

## <small>0.14.16 (2025-07-17)</small>

- chore: fix hooks in release-it config ([3d86319](https://github.com/Harbour-Enterprises/SuperDoc/commit/3d86319))
- chore: release v0.14.15 [skip ci] ([547a404](https://github.com/Harbour-Enterprises/SuperDoc/commit/547a404))
- chore: revert to using style.css post vite 6 upgrade ([33585f9](https://github.com/Harbour-Enterprises/SuperDoc/commit/33585f9))

* Merge pull request #674 from Harbour-Enterprises/fix/fix-style-file-name-change-from-vite (259c359c)
* chore: revert to using style.css post vite 6 upgrade (33585f97)

## <small>0.14.15 (2025-07-17)</small>

- fix(har-10122): toolbar styles are missing ([08365df](https://github.com/Harbour-Enterprises/SuperDoc/commit/08365df))
- fix(har-10122): update compiler options ([2e108f0](https://github.com/Harbour-Enterprises/SuperDoc/commit/2e108f0))

## <small>0.14.14 (2025-07-16)</small>

- chore: bump version → 0.14.13-next.0 ([e29702b](https://github.com/Harbour-Enterprises/SuperDoc/commit/e29702b))
- chore: changes to release-it config ([301c3b0](https://github.com/Harbour-Enterprises/SuperDoc/commit/301c3b0))
- chore: release v0.14.13-next.1 [skip ci] ([a5400ca](https://github.com/Harbour-Enterprises/SuperDoc/commit/a5400ca))
- chore: release v0.14.13-next.2 [skip ci] ([194d95d](https://github.com/Harbour-Enterprises/SuperDoc/commit/194d95d))
- chore: release v0.14.14 [skip ci] ([6dda18d](https://github.com/Harbour-Enterprises/SuperDoc/commit/6dda18d))

## <small>0.14.14 (2025-07-16)</small>

## <small>0.14.13 (2025-07-16)</small>

- chore: bump version → 0.14.12-next.0 ([75c4ef4](https://github.com/Harbour-Enterprises/SuperDoc/commit/75c4ef4))
- chore: manually update package version ([f45bdcd](https://github.com/Harbour-Enterprises/SuperDoc/commit/f45bdcd))
- chore: re-add table actions button to default buttons in toolbar ([f70ac8c](https://github.com/Harbour-Enterprises/SuperDoc/commit/f70ac8c))
- chore: release v0.14.12-next.1 [skip ci] ([62d45af](https://github.com/Harbour-Enterprises/SuperDoc/commit/62d45af))
- chore: release v0.14.12-next.2 [skip ci] ([503ccc2](https://github.com/Harbour-Enterprises/SuperDoc/commit/503ccc2))
- chore: release v0.14.12-next.4 [skip ci] ([2ea4054](https://github.com/Harbour-Enterprises/SuperDoc/commit/2ea4054))
- chore: release v0.14.12-next.5 [skip ci] ([327ae1b](https://github.com/Harbour-Enterprises/SuperDoc/commit/327ae1b))
- HAR-10020 Fix word selection on double click ([eb60f61](https://github.com/Harbour-Enterprises/SuperDoc/commit/eb60f61))
- HAR-10078 Set custom text selection when default can't be applied ([8147689](https://github.com/Harbour-Enterprises/SuperDoc/commit/8147689))
- update selection approach ([5de55f2](https://github.com/Harbour-Enterprises/SuperDoc/commit/5de55f2))
- update table cellMinWidth ([a8551ac](https://github.com/Harbour-Enterprises/SuperDoc/commit/a8551ac))

## <small>0.14.12 (2025-07-16)</small>

- chore: fix github release for latest ([66aec83](https://github.com/Harbour-Enterprises/SuperDoc/commit/66aec83))

## <small>0.14.11 (2025-07-16)</small>

- chore: release v0.14.11-next.7 [skip ci] ([7e7ec71](https://github.com/Harbour-Enterprises/SuperDoc/commit/7e7ec71))
- chore: update next release-it config ([cb493ec](https://github.com/Harbour-Enterprises/SuperDoc/commit/cb493ec))

## <small>0.14.10 (2025-07-15)</small>

- chore: release v0.14.10 [skip ci] ([e1a8edf](https://github.com/Harbour-Enterprises/SuperDoc/commit/e1a8edf))
- Releases/v0.14.9 (#645) ([ce9fe79](https://github.com/Harbour-Enterprises/SuperDoc/commit/ce9fe79)), closes [#645](https://github.com/Harbour-Enterprises/SuperDoc/issues/645) [#653](https://github.com/Harbour-Enterprises/SuperDoc/issues/653)
- Strikethrough toolbar item fix (#658) ([82a784a](https://github.com/Harbour-Enterprises/SuperDoc/commit/82a784a)), closes [#658](https://github.com/Harbour-Enterprises/SuperDoc/issues/658)
- Update version ([a53bfe2](https://github.com/Harbour-Enterprises/SuperDoc/commit/a53bfe2))

## <small>0.14.9 (2025-07-04)</small>

- chore: release v0.14.9 [skip ci] ([f53e688](https://github.com/Harbour-Enterprises/SuperDoc/commit/f53e688))
- Fix element mount for migrateParagraphFieldsListsV2 ([732a314](https://github.com/Harbour-Enterprises/SuperDoc/commit/732a314))

## <small>0.14.8 (2025-07-04)</small>

- chore: release v0.14.8 [skip ci] ([63a57ef](https://github.com/Harbour-Enterprises/SuperDoc/commit/63a57ef))

## <small>0.14.7 (2025-07-03)</small>

- chore: release v0.14.7 [skip ci] ([5b0beb3](https://github.com/Harbour-Enterprises/SuperDoc/commit/5b0beb3))
- fix: removed document lock listener ([0cd62b4](https://github.com/Harbour-Enterprises/SuperDoc/commit/0cd62b4))

## <small>0.14.6 (2025-07-03)</small>

- chore: release v0.14.6 [skip ci] ([201ff87](https://github.com/Harbour-Enterprises/SuperDoc/commit/201ff87))

## <small>0.14.5 (2025-07-03)</small>

- chore: release v0.14.5 [skip ci] ([5a3b5e9](https://github.com/Harbour-Enterprises/SuperDoc/commit/5a3b5e9))

## <small>0.14.4 (2025-07-02)</small>

- chore: release v0.14.4 [skip ci] ([0de3757](https://github.com/Harbour-Enterprises/SuperDoc/commit/0de3757))

## <small>0.14.3 (2025-07-02)</small>

- chore: release v0.14.3 [skip ci] ([a613dab](https://github.com/Harbour-Enterprises/SuperDoc/commit/a613dab))

## <small>0.14.2 (2025-07-01)</small>

- chore: release v0.14.2 [skip ci] ([3c1240f](https://github.com/Harbour-Enterprises/SuperDoc/commit/3c1240f))
- Bump patch ([38e54b4](https://github.com/Harbour-Enterprises/SuperDoc/commit/38e54b4))

## <small>0.14.1 (2025-07-01)</small>

- chore: release v0.14.1 [skip ci] ([a599c1a](https://github.com/Harbour-Enterprises/SuperDoc/commit/a599c1a))
- Clean up and increase version to 0.14.0 ([fbd3d42](https://github.com/Harbour-Enterprises/SuperDoc/commit/fbd3d42))

## [0.14.10](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.9-next.15...v0.14.10) (2025-07-15)

## [0.14.9](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.9-next.15...v0.14.10) (2025-07-04)

## [0.14.8](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.9-next.15...v0.14.10) (2025-07-04)

## [0.14.7](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.9-next.15...v0.14.10) (2025-07-03)

### Bug Fixes

- removed document lock listener ([0cd62b4](https://github.com/Harbour-Enterprises/SuperDoc/commit/0cd62b473d9ad4df748d9c708dd1112ef3e68b81))

## [0.14.6](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.9-next.15...v0.14.10) (2025-07-03)

## [0.14.5](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.9-next.15...v0.14.10) (2025-07-03)

## [0.14.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.9-next.15...v0.14.10) (2025-07-02)

## [0.14.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.9-next.15...v0.14.10) (2025-07-02)

## [0.14.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.9-next.15...v0.14.10) (2025-07-01)

## [0.14.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.9-next.15...v0.14.10) (2025-07-01)

## [0.13.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.9-next.15...v0.14.10) (2025-06-20)

## [0.13.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.9-next.15...v0.14.10) (2025-06-17)

## [0.13.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.9-next.15...v0.14.10) (2025-06-16)

## [0.12.36](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.9-next.15...v0.14.10) (2025-06-10)

## [0.14.9](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.8...v0.14.9) (2025-07-04)

## [0.14.8](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.8-next.2...v0.14.8) (2025-07-04)

## [0.14.7](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.8-next.2...v0.14.8) (2025-07-03)

### Bug Fixes

- removed document lock listener ([0cd62b4](https://github.com/Harbour-Enterprises/SuperDoc/commit/0cd62b473d9ad4df748d9c708dd1112ef3e68b81))

## [0.14.6](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.8-next.2...v0.14.8) (2025-07-03)

## [0.14.5](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.8-next.2...v0.14.8) (2025-07-03)

## [0.14.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.8-next.2...v0.14.8) (2025-07-02)

## [0.14.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.8-next.2...v0.14.8) (2025-07-02)

## [0.14.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.8-next.2...v0.14.8) (2025-07-01)

## [0.14.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.8-next.2...v0.14.8) (2025-07-01)

## [0.13.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.8-next.2...v0.14.8) (2025-06-20)

## [0.13.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.8-next.2...v0.14.8) (2025-06-17)

## [0.13.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.8-next.2...v0.14.8) (2025-06-16)

## [0.12.36](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.8-next.2...v0.14.8) (2025-06-10)

## [0.14.7](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.6...v0.14.7) (2025-07-03)

## [0.14.8-next.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.7-next.1...v0.14.8-next.1) (2025-07-03)

### Bug Fixes

- removed document lock listener ([0cd62b4](https://github.com/Harbour-Enterprises/SuperDoc/commit/0cd62b473d9ad4df748d9c708dd1112ef3e68b81))

## [0.14.6](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.6-next.6...v0.14.6) (2025-07-03)

## [0.14.5](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.6-next.6...v0.14.6) (2025-07-03)

### Bug Fixes

## [0.14.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.6-next.6...v0.14.6) (2025-07-02)

## [0.14.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.6-next.6...v0.14.6) (2025-07-02)

## [0.14.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.6-next.6...v0.14.6) (2025-07-01)

## [0.14.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.6-next.6...v0.14.6) (2025-07-01)

## [0.13.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.6-next.6...v0.14.6) (2025-06-20)

## [0.13.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.6-next.6...v0.14.6) (2025-06-17)

## [0.13.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.6-next.6...v0.14.6) (2025-06-16)

## [0.12.36](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.6-next.6...v0.14.6) (2025-06-10)

## [0.14.5](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.5-next.4...v0.14.5) (2025-07-03)

### Features

## [0.14.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.5-next.4...v0.14.5) (2025-07-02)

## [0.14.6-next.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.6-next.3...v0.14.6-next.4) (2025-07-03)

## [0.14.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.5-next.4...v0.14.5) (2025-07-02)

## [0.14.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.5-next.4...v0.14.5) (2025-07-01)

## [0.14.6-next.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.6-next.3...v0.14.6-next.4) (2025-07-03)

## [0.14.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.5-next.4...v0.14.5) (2025-07-01)

## [0.14.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.5-next.4...v0.14.5) (2025-07-01)

## [0.13.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.5-next.4...v0.14.5) (2025-06-20)

## [0.13.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.5-next.4...v0.14.5) (2025-06-17)

## [0.13.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.5-next.4...v0.14.5) (2025-06-16)

## [0.12.36](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.5-next.4...v0.14.5) (2025-06-10)

## [0.14.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.4-next.2...v0.14.4) (2025-07-02)

## [0.14.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.4-next.2...v0.14.4) (2025-07-02)

## [0.14.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.4-next.2...v0.14.4) (2025-07-01)

## [0.14.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.4-next.2...v0.14.4) (2025-07-01)

## [0.13.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.4-next.2...v0.14.4) (2025-06-20)

## [0.13.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.4-next.2...v0.14.4) (2025-06-17)

## [0.13.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.4-next.2...v0.14.4) (2025-06-16)

## [0.12.36](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.4-next.2...v0.14.4) (2025-06-10)

## [0.14.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.2...v0.14.3) (2025-07-02)

## [0.14.2-next.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.2...v0.14.3) (2025-07-01)

## [0.14.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.1...v0.14.2) (2025-07-01)

## [0.14.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.1...v0.14.2) (2025-07-01)

## [0.13.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.1...v0.14.2) (2025-06-20)

## [0.13.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.1...v0.14.2) (2025-06-17)

## [0.13.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.4-next.2...v0.14.4) (2025-06-17)

## [0.13.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.1...v0.14.2) (2025-06-16)

## [0.13.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.1...v0.14.2) (2025-06-16)

## [0.12.36](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.1...v0.14.2) (2025-06-10)

## [0.14.1-next.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.1...v0.14.2) (2025-07-01)

## [0.14.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.0-next.27...v0.14.1) (2025-07-01)

## [0.13.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.0-next.27...v0.14.1) (2025-06-20)

## [0.13.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.0-next.27...v0.14.1) (2025-06-17)

## [0.13.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.0-next.27...v0.14.1) (2025-06-16)

## [0.12.36](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.14.0-next.27...v0.14.1) (2025-06-10)

## [0.13.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.13.3-next.9...v0.13.4) (2025-06-20)

## [0.12.35](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.37-next.1...v0.12.37-next.2) (2025-06-06)

## [0.12.33](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.37-next.1...v0.12.37-next.2) (2025-06-06)

## [0.12.37-next.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.36-next.12...v0.12.37-next.1) (2025-06-16)

## [0.12.36-next.12](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.36-next.11...v0.12.36-next.12) (2025-06-12)

## [0.12.36-next.11](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.36-next.10...v0.12.36-next.11) (2025-06-11)

## [0.12.36-next.10](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.36-next.9...v0.12.36-next.10) (2025-06-11)

## [0.12.36-next.9](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.36-next.8...v0.12.36-next.9) (2025-06-11)

## [0.12.36-next.8](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.36-next.7...v0.12.36-next.8) (2025-06-11)

## [0.12.36-next.7](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.36-next.6...v0.12.36-next.7) (2025-06-10)

## [0.12.36-next.6](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.36-next.5...v0.12.36-next.6) (2025-06-10)

## [0.13.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.13.2...v0.13.3) (2025-06-16)

## [0.13.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.13.2...v0.13.3) (2025-06-16)

## [0.12.36-next.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.36-next.3...v0.12.36-next.4) (2025-06-10)

### Reverts

- Revert "Undo tests around spacing - will refactor" ([f40647f](https://github.com/Harbour-Enterprises/SuperDoc/commit/f40647f7788f97db7a678282f0d197f59af981f3))

## [0.12.36-next.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.36-next.2...v0.12.36-next.3) (2025-06-09)

## [0.12.36-next.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.36-next.1...v0.12.36-next.2) (2025-06-09)

## [0.12.36-next.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.35-next.1...v0.12.36-next.1) (2025-06-06)

## [0.12.35-next.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.34-next.2...v0.12.35-next.1) (2025-06-06)

### Features

- (accessibility) simulate click with enter ([f9cd0b4](https://github.com/Harbour-Enterprises/SuperDoc/commit/f9cd0b4f5f8148ad0d0afad091288b32333f4cd3))
- added extra accessibility features ([6a0f9d8](https://github.com/Harbour-Enterprises/SuperDoc/commit/6a0f9d80ae281f21ebc39beb8a14be027ef24619))
- added initial toolbar keyboard navigation ([e37d79b](https://github.com/Harbour-Enterprises/SuperDoc/commit/e37d79bd284265f9b22f9a1ec23d05e58c21263a))
- added roving tabindex ([6c77015](https://github.com/Harbour-Enterprises/SuperDoc/commit/6c770155532b805888d37bc91cb4d120129d541f))

## [0.12.34-next.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.34-next.1...v0.12.34-next.2) (2025-06-06)

### Features

- added extra accessibility features ([6a0f9d8](https://github.com/Harbour-Enterprises/SuperDoc/commit/6a0f9d80ae281f21ebc39beb8a14be027ef24619))

## [0.12.33](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.34-next.2...v0.12.35) (2025-06-06)

### Features

- (accessibility) simulate click with enter ([f9cd0b4](https://github.com/Harbour-Enterprises/SuperDoc/commit/f9cd0b4f5f8148ad0d0afad091288b32333f4cd3))
- added initial toolbar keyboard navigation ([e37d79b](https://github.com/Harbour-Enterprises/SuperDoc/commit/e37d79bd284265f9b22f9a1ec23d05e58c21263a))
- added roving tabindex ([6c77015](https://github.com/Harbour-Enterprises/SuperDoc/commit/6c770155532b805888d37bc91cb4d120129d541f))

## [0.12.33](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.31-next.5...v0.12.33) (2025-06-06)

## [0.12.31-next.5](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.31-next.4...v0.12.31-next.5) (2025-06-06)

## [0.12.31-next.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.31-next.3...v0.12.31-next.4) (2025-06-06)

## [0.12.31-next.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.31-next.2...v0.12.31-next.3) (2025-06-06)

## [0.12.31-next.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.31-next.1...v0.12.31-next.2) (2025-06-06)

## [0.12.31-next.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.30-next.2...v0.12.31-next.1) (2025-06-05)

## [0.12.30-next.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.13.1...v0.12.30-next.2) (2025-06-05)

## [0.13.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.13.0...v0.13.1) (2025-06-05)

# [0.13.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.31...v0.13.0) (2025-06-05)

### Bug Fixes

- added missing dep ([de22944](https://github.com/Harbour-Enterprises/SuperDoc/commit/de229443f5352a186b1d95afc0f4dbbc7f9dd93b))
- removed unnecessary change ([9e3b43b](https://github.com/Harbour-Enterprises/SuperDoc/commit/9e3b43b8bb94357ae4f9ca37d04c9c5321060f59))

### Features

- added high contrast mode example ([6802937](https://github.com/Harbour-Enterprises/SuperDoc/commit/6802937bfe67cf0ee500d4dbd1464efc6ebcd7b9))
- added initial support for high contrast mode ([eabd56f](https://github.com/Harbour-Enterprises/SuperDoc/commit/eabd56f11790614d72c5ae084a0506361b50344c))
- added missing package-lock changes ([a0776fc](https://github.com/Harbour-Enterprises/SuperDoc/commit/a0776fca006084eceb2ead48ad4f35259c758e82))
- expose function to set high contrast mode ([aab5ebb](https://github.com/Harbour-Enterprises/SuperDoc/commit/aab5ebbee9b68717cfc3fa6e86d0d7c70c955125))

## [0.12.31](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.30...v0.12.31) (2025-06-05)

## [0.12.30](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.29...v0.12.30) (2025-06-05)

## [0.12.29](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.28...v0.12.29) (2025-06-05)

### Features

- **ai:** Add support for italic and underline text formatting in AI helpers ([86c282a](https://github.com/Harbour-Enterprises/SuperDoc/commit/86c282a274c883bfada1a1fe5634164392cc07ce))

## [0.12.28](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.27...v0.12.28) (2025-06-05)

## [0.12.27](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.26...v0.12.27) (2025-06-05)

## [0.12.26](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.25...v0.12.26) (2025-06-05)

## [0.12.25](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.24...v0.12.25) (2025-06-05)

## [0.12.24](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.23...v0.12.24) (2025-06-05)

## [0.12.23](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.22...v0.12.23) (2025-06-05)

## [0.12.22](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.21...v0.12.22) (2025-06-04)

## [0.12.21](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.20...v0.12.21) (2025-06-04)

## [0.12.20](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.19...v0.12.20) (2025-06-04)

## [0.12.19](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.18...v0.12.19) (2025-06-04)

## [0.12.18](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.17...v0.12.18) (2025-06-04)

## [0.12.17](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.16...v0.12.17) (2025-06-04)

## [0.12.16](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.15...v0.12.16) (2025-06-03)

## [0.12.15](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.14...v0.12.15) (2025-06-03)

## [0.12.14](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.13...v0.12.14) (2025-06-03)

## [0.12.13](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.12...v0.12.13) (2025-06-03)

### Features

- allow to export the raw blob without triggering a download ([5ba3259](https://github.com/Harbour-Enterprises/SuperDoc/commit/5ba32592ab5b6f26e15b35890d024765443ee983))

## [0.12.12](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.11...v0.12.12) (2025-06-03)

## [0.12.11](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.10...v0.12.11) (2025-06-03)

## [0.12.10](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.9...v0.12.10) (2025-06-03)

## [0.12.9](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.8...v0.12.9) (2025-06-03)

## [0.12.8](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.7...v0.12.8) (2025-06-03)

## [0.12.7](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.6...v0.12.7) (2025-06-03)

## [0.12.6](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.5...v0.12.6) (2025-06-02)

## [0.12.5](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.4...v0.12.5) (2025-05-30)

## [0.12.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.3...v0.12.4) (2025-05-30)

## [0.12.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.2...v0.12.3) (2025-05-30)

## [0.12.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.12.1...v0.12.2) (2025-05-30)

## [0.12.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.54...v0.12.1) (2025-05-30)

## [0.11.54](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.53...v0.11.54) (2025-05-29)

## [0.11.53](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.52...v0.11.53) (2025-05-29)

## [0.11.52](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.51...v0.11.52) (2025-05-29)

## [0.11.51](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.50...v0.11.51) (2025-05-28)

## [0.11.50](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.49...v0.11.50) (2025-05-28)

## [0.11.49](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.48...v0.11.49) (2025-05-28)

## [0.11.48](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.47...v0.11.48) (2025-05-28)

## [0.11.47](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.46...v0.11.47) (2025-05-28)

## [0.11.46](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.45...v0.11.46) (2025-05-28)

## [0.11.45](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.44...v0.11.45) (2025-05-27)

## [0.11.44](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.43...v0.11.44) (2025-05-27)

## [0.11.43](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.42...v0.11.43) (2025-05-27)

## [0.11.42](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.41...v0.11.42) (2025-05-27)

## [0.11.41](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.39...v0.11.41) (2025-05-27)

## [0.11.39](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.38...v0.11.39) (2025-05-27)

## [0.11.38](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.37...v0.11.38) (2025-05-27)

## [0.11.37](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.36...v0.11.37) (2025-05-24)

## [0.11.36](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.34...v0.11.36) (2025-05-24)

## [0.11.34](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.33...v0.11.34) (2025-05-23)

## [0.11.33](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.32...v0.11.33) (2025-05-23)

### Bug Fixes

- **docs:** update favicon and webmanifest paths ([60cea5d](https://github.com/Harbour-Enterprises/SuperDoc/commit/60cea5d7e4948602e394b8c970d06474ba98d9fa))

## [0.11.32](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.31...v0.11.32) (2025-05-21)

### Features

- text formatting functionality in AI Writer; add formatDocument method ([5bdd103](https://github.com/Harbour-Enterprises/SuperDoc/commit/5bdd103df8744534005c3fbedc5ad13d25f2c8af))

## [0.11.31](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.30...v0.11.31) (2025-05-21)

## [0.11.30](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.29...v0.11.30) (2025-05-21)

## [0.11.29](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.28...v0.11.29) (2025-05-21)

## [0.11.28](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.27...v0.11.28) (2025-05-21)

## [0.11.27](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.26...v0.11.27) (2025-05-20)

## [0.11.26](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.25...v0.11.26) (2025-05-20)

## [0.11.25](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.24...v0.11.25) (2025-05-19)

## [0.11.24](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.23...v0.11.24) (2025-05-19)

## [0.11.23](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.22...v0.11.23) (2025-05-19)

## [0.11.22](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.21...v0.11.22) (2025-05-19)

### Bug Fixes

- revert back to main ai writer ([02e86e9](https://github.com/Harbour-Enterprises/SuperDoc/commit/02e86e90589bedbeec9b41ce8275dd778714764c))

### Features

- enhance AI highlight functionality with custom styling and animation controls ([293a577](https://github.com/Harbour-Enterprises/SuperDoc/commit/293a5776891fe3ab3e288b1dd461ebf0723c1691))
- loading and other ai writer enhancements ([325f210](https://github.com/Harbour-Enterprises/SuperDoc/commit/325f210f80e0e278b9d23e116a54ce13c9b5c6ee))
- new dark purple loading dots ([60bdc0b](https://github.com/Harbour-Enterprises/SuperDoc/commit/60bdc0b00de2eb3cc6586daa2b2f41ecd95d8363))

## [0.11.21](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.20...v0.11.21) (2025-05-19)

## [0.11.20](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.19...v0.11.20) (2025-05-19)

## [0.11.19](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.18...v0.11.19) (2025-05-19)

## [0.11.18](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.17...v0.11.18) (2025-05-18)

## [0.11.17](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.16...v0.11.17) (2025-05-18)

## [0.11.16](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.15...v0.11.16) (2025-05-16)

## [0.11.15](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.14...v0.11.15) (2025-05-16)

## [0.11.14](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.13...v0.11.14) (2025-05-16)

## [0.11.13](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.12...v0.11.13) (2025-05-15)

## [0.11.12](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.11...v0.11.12) (2025-05-14)

## [0.11.11](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.10...v0.11.11) (2025-05-14)

## [0.11.10](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.9...v0.11.10) (2025-05-13)

## [0.11.9](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.8...v0.11.9) (2025-05-13)

## [0.11.8](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.7...v0.11.8) (2025-05-13)

## [0.11.7](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.6...v0.11.7) (2025-05-13)

## [0.11.6](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.5...v0.11.6) (2025-05-13)

## [0.11.5](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.4...v0.11.5) (2025-05-13)

## [0.11.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.3...v0.11.4) (2025-05-13)

## [0.11.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.2...v0.11.3) (2025-05-13)

## [0.11.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.11.1...v0.11.2) (2025-05-13)

## [0.11.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.69...v0.11.1) (2025-05-13)

## [0.10.69](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.68...v0.10.69) (2025-05-13)

## [0.10.68](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.67...v0.10.68) (2025-05-13)

## [0.10.67](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.66...v0.10.67) (2025-05-12)

## [0.10.66](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.65...v0.10.66) (2025-05-12)

## [0.10.65](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.64...v0.10.65) (2025-05-12)

## [0.10.64](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.63...v0.10.64) (2025-05-09)

## [0.10.63](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.62...v0.10.63) (2025-05-09)

## [0.10.62](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.61...v0.10.62) (2025-05-08)

## [0.10.61](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.60...v0.10.61) (2025-05-08)

## [0.10.60](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.59...v0.10.60) (2025-05-08)

## [0.10.59](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.58...v0.10.59) (2025-05-08)

## [0.10.58](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.57...v0.10.58) (2025-05-08)

## [0.10.57](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.56...v0.10.57) (2025-05-07)

## [0.10.56](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.55...v0.10.56) (2025-05-07)

## [0.10.55](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.54...v0.10.55) (2025-05-07)

## [0.10.54](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.53...v0.10.54) (2025-05-07)

## [0.10.53](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.52...v0.10.53) (2025-05-07)

## [0.10.52](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.51...v0.10.52) (2025-05-07)

## [0.10.51](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.50...v0.10.51) (2025-05-06)

## [0.10.50](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.49...v0.10.50) (2025-05-02)

## [0.10.49](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.48...v0.10.49) (2025-05-02)

## [0.10.48](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.47...v0.10.48) (2025-05-02)

## [0.10.47](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.46...v0.10.47) (2025-05-02)

## [0.10.46](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.45...v0.10.46) (2025-05-02)

## [0.10.45](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.44...v0.10.45) (2025-05-01)

## [0.10.44](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.43...v0.10.44) (2025-05-01)

## [0.10.43](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.42...v0.10.43) (2025-05-01)

## [0.10.42](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.41...v0.10.42) (2025-05-01)

## [0.10.41](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.40...v0.10.41) (2025-05-01)

## [0.10.40](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.39...v0.10.40) (2025-05-01)

## [0.10.39](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.38...v0.10.39) (2025-05-01)

## [0.10.38](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.37...v0.10.38) (2025-05-01)

## [0.10.37](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.36...v0.10.37) (2025-05-01)

## [0.10.36](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.35...v0.10.36) (2025-05-01)

## [0.10.35](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.34...v0.10.35) (2025-05-01)

## [0.10.34](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.33...v0.10.34) (2025-05-01)

## [0.10.33](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.32...v0.10.33) (2025-04-29)

## [0.10.32](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.31...v0.10.32) (2025-04-29)

## [0.10.31](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.30...v0.10.31) (2025-04-29)

## [0.10.30](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.28...v0.10.30) (2025-04-29)

## [0.10.28](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.27...v0.10.28) (2025-04-29)

## [0.10.27](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.26...v0.10.27) (2025-04-29)

## [0.10.26](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.25...v0.10.26) (2025-04-29)

## [0.10.25](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.24...v0.10.25) (2025-04-29)

## [0.10.24](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.23...v0.10.24) (2025-04-29)

## [0.10.23](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.22...v0.10.23) (2025-04-28)

### Bug Fixes

- add ai icons to commons ([9ab0fa4](https://github.com/Harbour-Enterprises/SuperDoc/commit/9ab0fa42b3f5c1f7f5b2c66cab0c96f240ec786c))
- add in safety check for dispatch ([3550f80](https://github.com/Harbour-Enterprises/SuperDoc/commit/3550f8033776bab508d6c83d81d8c28d85c128ac))
- enhance AI text animation and processing ([91e2c73](https://github.com/Harbour-Enterprises/SuperDoc/commit/91e2c735f1de748af974fda6ab570ba684f66311))
- format conditional ([28d5ade](https://github.com/Harbour-Enterprises/SuperDoc/commit/28d5adebfcd787710c23f2cc059d5d221cc35097))
- make ai event more generic ([a2a94fc](https://github.com/Harbour-Enterprises/SuperDoc/commit/a2a94fc3a1e7a42a600c37cd317fe66869f6a14c))
- prefix or remove global styles ([112c087](https://github.com/Harbour-Enterprises/SuperDoc/commit/112c087a1587df7e7ff9517556524adc07a842e9))
- self contain the ai writer styles ([a699dc1](https://github.com/Harbour-Enterprises/SuperDoc/commit/a699dc125e94c0064eb00e1445b2978e1ac6bd66))
- update data attribute naming for AI animation marks ([274fd41](https://github.com/Harbour-Enterprises/SuperDoc/commit/274fd4192b6b5b0a4dd610a44a315f81ac198a6f))
- use a ref for ai layer ([e40adf2](https://github.com/Harbour-Enterprises/SuperDoc/commit/e40adf269f9e2333f9b994368a223c53cb51a844))

### Features

- add AI layer toggle functionality in SuperDoc component ([d43e907](https://github.com/Harbour-Enterprises/SuperDoc/commit/d43e90786fb7d710ab06d6661625825680fbb0b2))
- add composable for selected text in editor ([27ba4eb](https://github.com/Harbour-Enterprises/SuperDoc/commit/27ba4eb247e42ecf621ced0a91af7088805f063f))
- add magic wand icon to superdoc icons ([e466138](https://github.com/Harbour-Enterprises/SuperDoc/commit/e466138f316c913b644203402524cb0940cedb9b))
- enhance AI Writer with text selection highlighting and improved UI styles ([ad582e6](https://github.com/Harbour-Enterprises/SuperDoc/commit/ad582e6c8f6707cdc59d33833810ea5d068a8858))
- enhance AIWriter component to support event emission through superToolbar ([cef1d22](https://github.com/Harbour-Enterprises/SuperDoc/commit/cef1d2239cc08daebe776e03a7470ebbb3c1ccff))
- enhance AIWriter component with new SVG icons and gradient styles ([15f2960](https://github.com/Harbour-Enterprises/SuperDoc/commit/15f296044989195e105af5b05eceb85b7437cbe0))
- implement AI animation mark and enhance streaming functions in AIWriter ([17235ba](https://github.com/Harbour-Enterprises/SuperDoc/commit/17235ba69f65ea785726db0daa982465b87d5373))
- initial commit for ai implementation ([13aba6a](https://github.com/Harbour-Enterprises/SuperDoc/commit/13aba6a46981108ad6df3a6173c5524c04006900))
- integrate AI layer functionality with new composable ([c6db2d3](https://github.com/Harbour-Enterprises/SuperDoc/commit/c6db2d3beca4a7e7e2844115b119a254c047a177))
- integrate AI Writer functionality with cursor positioning and UI controls ([dd0c357](https://github.com/Harbour-Enterprises/SuperDoc/commit/dd0c357da6959b48f500712522a35c645e4dfb63))
- streamline AI Writer to always use streaming approach and close after first text chunk ([bea95b4](https://github.com/Harbour-Enterprises/SuperDoc/commit/bea95b49f052dcb539669e2434eda89d53d351ec))
- support custom endpoint configuration ([5f6c8df](https://github.com/Harbour-Enterprises/SuperDoc/commit/5f6c8dfedbb0de22df014f3936d85f5d4a3d351d))

## [0.10.22](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.21...v0.10.22) (2025-04-25)

## [0.10.21](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.20...v0.10.21) (2025-04-25)

## [0.10.20](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.19...v0.10.20) (2025-04-25)

## [0.10.19](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.18...v0.10.19) (2025-04-24)

## [0.10.18](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.17...v0.10.18) (2025-04-24)

## [0.10.17](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.16...v0.10.17) (2025-04-24)

## [0.10.16](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.15...v0.10.16) (2025-04-24)

## [0.10.15](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.14...v0.10.15) (2025-04-24)

## [0.10.14](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.13...v0.10.14) (2025-04-24)

## [0.10.13](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.12...v0.10.13) (2025-04-24)

## [0.10.12](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.11...v0.10.12) (2025-04-23)

## [0.10.11](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.10...v0.10.11) (2025-04-23)

## [0.10.10](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.9...v0.10.10) (2025-04-23)

## [0.10.9](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.8...v0.10.9) (2025-04-23)

## [0.10.8](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.7...v0.10.8) (2025-04-23)

## [0.10.7](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.6...v0.10.7) (2025-04-23)

## [0.10.6](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.5...v0.10.6) (2025-04-23)

## [0.10.5](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.4...v0.10.5) (2025-04-23)

## [0.10.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.3...v0.10.4) (2025-04-23)

## [0.10.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.10.1...v0.10.3) (2025-04-23)

## [0.10.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.32...v0.10.1) (2025-04-23)

## [0.9.32](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.31...v0.9.32) (2025-04-22)

## [0.9.31](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.30...v0.9.31) (2025-04-22)

## [0.9.30](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.29...v0.9.30) (2025-04-22)

## [0.9.29](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.28...v0.9.29) (2025-04-21)

## [0.9.28](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.27...v0.9.28) (2025-04-18)

## [0.9.27](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.26...v0.9.27) (2025-04-18)

## [0.9.26](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.25...v0.9.26) (2025-04-17)

## [0.9.25](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.24...v0.9.25) (2025-04-17)

## [0.9.24](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.23...v0.9.24) (2025-04-17)

## [0.9.23](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.22...v0.9.23) (2025-04-17)

## [0.9.22](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.21...v0.9.22) (2025-04-17)

## [0.9.21](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.20...v0.9.21) (2025-04-17)

## [0.9.20](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.19...v0.9.20) (2025-04-17)

## [0.9.19](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.18...v0.9.19) (2025-04-17)

## [0.9.18](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.17...v0.9.18) (2025-04-17)

## [0.9.17](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.16...v0.9.17) (2025-04-16)

## [0.9.16](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.15...v0.9.16) (2025-04-16)

## [0.9.15](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.14...v0.9.15) (2025-04-16)

## [0.9.14](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.13...v0.9.14) (2025-04-15)

## [0.9.13](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.12...v0.9.13) (2025-04-15)

## [0.9.12](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.11...v0.9.12) (2025-04-15)

## [0.9.11](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.10...v0.9.11) (2025-04-15)

## [0.9.10](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.9...v0.9.10) (2025-04-14)

## [0.9.9](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.8...v0.9.9) (2025-04-11)

## [0.9.8](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.7...v0.9.8) (2025-04-11)

## [0.9.7](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.6...v0.9.7) (2025-04-11)

## [0.9.6](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.5...v0.9.6) (2025-04-11)

## [0.9.5](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.4...v0.9.5) (2025-04-11)

## [0.9.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.9.1...v0.9.4) (2025-04-11)

## [0.9.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.30...v0.9.1) (2025-04-10)

## [0.8.30](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.29...v0.8.30) (2025-04-10)

### Reverts

- Revert "Remove pdfjs from SuperDoc lib - expect as peer dependency only" ([2b4457a](https://github.com/Harbour-Enterprises/SuperDoc/commit/2b4457a4240df04220ae545257bc48444aeb5627))
- Revert "Update locks" ([b413e93](https://github.com/Harbour-Enterprises/SuperDoc/commit/b413e93f49efd440e54a8c72c9c297c3ef626303))
- Revert "Bump version" ([cb11b8e](https://github.com/Harbour-Enterprises/SuperDoc/commit/cb11b8e5c8df714857d158db362e5365c13ad98d))
- Revert "Allow passing in pdfjs worker url from user" ([958b09d](https://github.com/Harbour-Enterprises/SuperDoc/commit/958b09d7b79fb94a3d0ae2ced4376e7a50117cce))
- Revert "fix pdf viewer destroy" ([f52a153](https://github.com/Harbour-Enterprises/SuperDoc/commit/f52a153710f12735670a8f496c39b949785b63ea))

## [0.8.29](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.28...v0.8.29) (2025-04-10)

## [0.8.28](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.27...v0.8.28) (2025-04-10)

## [0.8.27](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.26...v0.8.27) (2025-04-10)

## [0.8.26](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.25...v0.8.26) (2025-04-10)

## [0.8.25](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.24...v0.8.25) (2025-04-10)

## [0.8.24](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.23...v0.8.24) (2025-04-10)

## [0.8.23](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.22...v0.8.23) (2025-04-09)

## [0.8.22](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.21...v0.8.22) (2025-04-09)

## [0.8.21](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.20...v0.8.21) (2025-04-09)

## [0.8.20](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.19...v0.8.20) (2025-04-09)

## [0.8.19](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.18...v0.8.19) (2025-04-09)

## [0.8.18](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.17...v0.8.18) (2025-04-08)

## [0.8.17](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.16...v0.8.17) (2025-04-08)

## [0.8.16](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.15...v0.8.16) (2025-04-08)

## [0.8.15](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.14...v0.8.15) (2025-04-07)

## [0.8.14](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.13...v0.8.14) (2025-04-07)

## [0.8.13](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.12...v0.8.13) (2025-04-03)

## [0.8.12](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.11...v0.8.12) (2025-04-03)

## [0.8.11](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.10...v0.8.11) (2025-04-02)

## [0.8.10](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.9...v0.8.10) (2025-04-02)

## [0.8.9](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.8...v0.8.9) (2025-04-02)

## [0.8.8](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.7...v0.8.8) (2025-04-02)

## [0.8.7](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.5...v0.8.7) (2025-04-01)

## [0.8.5](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.4...v0.8.5) (2025-03-28)

## [0.8.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.3...v0.8.4) (2025-03-28)

## [0.8.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.2...v0.8.3) (2025-03-28)

## [0.8.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.8.1...v0.8.2) (2025-03-28)

## [0.8.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.7.10...v0.8.1) (2025-03-28)

## [0.7.10](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.7.9...v0.7.10) (2025-03-28)

## [0.7.9](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.7.8...v0.7.9) (2025-03-28)

### Reverts

- Revert "Update rich text extensions list, adds isEditable to paragraph as an experimental attr" ([2ffe859](https://github.com/Harbour-Enterprises/SuperDoc/commit/2ffe859d5ac82cc9f5222a791d86aecb744874f8))
- Revert "Remove comments plugin from rich text extensions" ([d9fafb7](https://github.com/Harbour-Enterprises/SuperDoc/commit/d9fafb7506ef93d9fa15086177dec36f30efb36d))
- Revert "Update locks" ([b6c5c42](https://github.com/Harbour-Enterprises/SuperDoc/commit/b6c5c42a87941f7154f76ba9158664b76e989a6e))

## [0.7.8](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.7.7...v0.7.8) (2025-03-28)

## [0.7.7](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.7.6...v0.7.7) (2025-03-28)

## [0.7.6](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.7.5...v0.7.6) (2025-03-27)

## [0.7.5](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.7.4...v0.7.5) (2025-03-27)

## [0.7.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.7.3...v0.7.4) (2025-03-27)

## [0.7.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.7.2...v0.7.3) (2025-03-27)

## [0.7.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.7.1...v0.7.2) (2025-03-26)

## [0.7.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.113...v0.7.1) (2025-03-26)

## [0.6.113](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.112...v0.6.113) (2025-03-25)

## [0.6.112](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.111...v0.6.112) (2025-03-25)

## [0.6.111](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.110...v0.6.111) (2025-03-25)

## [0.6.110](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.109...v0.6.110) (2025-03-25)

## [0.6.109](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.108...v0.6.109) (2025-03-25)

## [0.6.108](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.107...v0.6.108) (2025-03-25)

## [0.6.107](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.106...v0.6.107) (2025-03-25)

## [0.6.106](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.105...v0.6.106) (2025-03-24)

## [0.6.105](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.104...v0.6.105) (2025-03-24)

## [0.6.104](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.103...v0.6.104) (2025-03-24)

## [0.6.103](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.102...v0.6.103) (2025-03-24)

## [0.6.102](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.101...v0.6.102) (2025-03-24)

## [0.6.101](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.100...v0.6.101) (2025-03-24)

## [0.6.100](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.99...v0.6.100) (2025-03-24)

## [0.6.99](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.98...v0.6.99) (2025-03-24)

## [0.6.98](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.97...v0.6.98) (2025-03-24)

## [0.6.97](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.96...v0.6.97) (2025-03-24)

## [0.6.96](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.95...v0.6.96) (2025-03-23)

## [0.6.95](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.94...v0.6.95) (2025-03-21)

## [0.6.94](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.93...v0.6.94) (2025-03-21)

## [0.6.93](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.92...v0.6.93) (2025-03-21)

## [0.6.92](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.91...v0.6.92) (2025-03-20)

## [0.6.91](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.90...v0.6.91) (2025-03-20)

## [0.6.90](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.89...v0.6.90) (2025-03-20)

## [0.6.89](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.88...v0.6.89) (2025-03-20)

## [0.6.88](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.87...v0.6.88) (2025-03-20)

### Bug Fixes

- comments not repositioning after you add comment to existing dialog ([ffa51ae](https://github.com/Harbour-Enterprises/SuperDoc/commit/ffa51ae37913c6674431b94f56081b9d7adb36f2))

## [0.6.87](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.86...v0.6.87) (2025-03-20)

## [0.6.86](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.84...v0.6.86) (2025-03-20)

## [0.6.84](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.83...v0.6.84) (2025-03-20)

## [0.6.83](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.80...v0.6.83) (2025-03-19)

### Bug Fixes

- do not reposition floating comments when selected ([5edfff8](https://github.com/Harbour-Enterprises/SuperDoc/commit/5edfff8a1b02f499a9f9219e1e1d1bd7b1c49b75))
- improve floating comments offset calculation and scrolling behavior ([2ae0b62](https://github.com/Harbour-Enterprises/SuperDoc/commit/2ae0b62def80c0acf52ad84389914a6324250bb9))

## [0.6.80](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.79...v0.6.80) (2025-03-19)

## [0.6.79](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.78...v0.6.79) (2025-03-18)

## [0.6.78](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.76...v0.6.78) (2025-03-18)

### Bug Fixes

- improve selection bounds calculation for floating comments ([7d9306d](https://github.com/Harbour-Enterprises/SuperDoc/commit/7d9306d8b6c1505ffaf906db6298e07810ff01c1))

## [0.6.76](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.75...v0.6.76) (2025-03-18)

## [0.6.75](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.74...v0.6.75) (2025-03-17)

## [0.6.74](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.73...v0.6.74) (2025-03-17)

## [0.6.73](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.71...v0.6.73) (2025-03-17)

## [0.6.71](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.70...v0.6.71) (2025-03-17)

## [0.6.70](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.69...v0.6.70) (2025-03-17)

## [0.6.69](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.68...v0.6.69) (2025-03-17)

## [0.6.68](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.67...v0.6.68) (2025-03-17)

## [0.6.67](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.66...v0.6.67) (2025-03-17)

## [0.6.66](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.65...v0.6.66) (2025-03-17)

## [0.6.65](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.64...v0.6.65) (2025-03-15)

## [0.6.64](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.63...v0.6.64) (2025-03-15)

## [0.6.63](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.62...v0.6.63) (2025-03-14)

## [0.6.62](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.61...v0.6.62) (2025-03-14)

## [0.6.61](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.60...v0.6.61) (2025-03-14)

## [0.6.60](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.59...v0.6.60) (2025-03-14)

## [0.6.59](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.58...v0.6.59) (2025-03-14)

## [0.6.58](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.57...v0.6.58) (2025-03-14)

## [0.6.57](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.56...v0.6.57) (2025-03-14)

## [0.6.56](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.55...v0.6.56) (2025-03-14)

## [0.6.55](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.54...v0.6.55) (2025-03-13)

## [0.6.54](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.53...v0.6.54) (2025-03-13)

## [0.6.53](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.52...v0.6.53) (2025-03-13)

### Reverts

- Revert "chore(deps): bump the npm_and_yarn group across 1 directory with 2 updates" ([931801f](https://github.com/Harbour-Enterprises/SuperDoc/commit/931801fc0f2b0ab004837d000811bf2f53960671))

## [0.6.52](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.50...v0.6.52) (2025-03-13)

## [0.6.50](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.49...v0.6.50) (2025-03-12)

### Bug Fixes

- add test-results to gitignore ([0f859d2](https://github.com/Harbour-Enterprises/SuperDoc/commit/0f859d2ca4181f9f0ad275b74ecd71e126469be7))
- changed hard break file ([ebc27da](https://github.com/Harbour-Enterprises/SuperDoc/commit/ebc27da52a749ac065bf1a085899c5ab12a360b7))
- e2e test ([81782e2](https://github.com/Harbour-Enterprises/SuperDoc/commit/81782e20af76c3cace913c14c7a3f953439e8e6b))
- e2e test ([179b794](https://github.com/Harbour-Enterprises/SuperDoc/commit/179b7946cc0a3e6e53cc66bc7f252d182dbb8552))
- e2e tests ([64a7a87](https://github.com/Harbour-Enterprises/SuperDoc/commit/64a7a87a6c2e002b6f7191056ec13ce98b8c2c18))
- e2e tests ([5c80d74](https://github.com/Harbour-Enterprises/SuperDoc/commit/5c80d742da1191e16d879a4aa90fa05ba571a112))
- e2e tests to run headless no CI/CD ([f1479f7](https://github.com/Harbour-Enterprises/SuperDoc/commit/f1479f7521b864f35e0b7d8b017b1a91bd12703e))
- tests ([1f2ebd9](https://github.com/Harbour-Enterprises/SuperDoc/commit/1f2ebd9c5b2143cfcf147dfe6de5e340a17a1bd0))
- unit tests ([fba4cf4](https://github.com/Harbour-Enterprises/SuperDoc/commit/fba4cf48f7e9f6e48ffa0431273195e9042d7ad5))

### Features

- added e2e tests to pipeline ([6e0ead4](https://github.com/Harbour-Enterprises/SuperDoc/commit/6e0ead435b7bd8d18a3d01faa64deb9a89e18494))

## [0.6.49](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.48...v0.6.49) (2025-03-12)

## [0.6.48](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.47...v0.6.48) (2025-03-11)

## [0.6.47](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.46...v0.6.47) (2025-03-11)

## [0.6.46](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.45...v0.6.46) (2025-03-11)

## [0.6.45](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.44...v0.6.45) (2025-03-10)

## [0.6.44](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.43...v0.6.44) (2025-03-10)

## [0.6.43](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.42...v0.6.43) (2025-03-10)

## [0.6.42](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.41...v0.6.42) (2025-03-10)

## [0.6.41](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.40...v0.6.41) (2025-03-10)

## [0.6.40](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.39...v0.6.40) (2025-03-10)

## [0.6.39](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.38...v0.6.39) (2025-03-10)

## [0.6.38](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.37...v0.6.38) (2025-03-06)

## [0.6.37](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.36...v0.6.37) (2025-03-06)

## [0.6.36](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.35...v0.6.36) (2025-03-06)

## [0.6.35](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.34...v0.6.35) (2025-03-06)

## [0.6.34](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.32...v0.6.34) (2025-03-06)

### Bug Fixes

- remove only handleSynced listener after it's triggered ([#354](https://github.com/Harbour-Enterprises/SuperDoc/issues/354)) ([2805de6](https://github.com/Harbour-Enterprises/SuperDoc/commit/2805de67470d05af4658ce244cfb5225de45e7ad))

## [0.6.32](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.31...v0.6.32) (2025-03-06)

## [0.6.31](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.30...v0.6.31) (2025-03-05)

## [0.6.30](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.28...v0.6.30) (2025-03-05)

## [0.6.28](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.27...v0.6.28) (2025-03-04)

## [0.6.27](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.26...v0.6.27) (2025-03-04)

## [0.6.26](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.25...v0.6.26) (2025-03-04)

## [0.6.25](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.24...v0.6.25) (2025-03-04)

## [0.6.24](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.23...v0.6.24) (2025-03-04)

## [0.6.23](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.22...v0.6.23) (2025-03-04)

## [0.6.22](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.21...v0.6.22) (2025-03-04)

## [0.6.21](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.20...v0.6.21) (2025-03-04)

## [0.6.20](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.19...v0.6.20) (2025-03-03)

## [0.6.19](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.18...v0.6.19) (2025-03-03)

## [0.6.18](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.17...v0.6.18) (2025-03-03)

## [0.6.17](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.16...v0.6.17) (2025-03-03)

## [0.6.16](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.15...v0.6.16) (2025-03-03)

## [0.6.15](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.14...v0.6.15) (2025-03-03)

### Features

- added tests on ci/cd ([#314](https://github.com/Harbour-Enterprises/SuperDoc/issues/314)) ([bc4296f](https://github.com/Harbour-Enterprises/SuperDoc/commit/bc4296f9fdf926e6af2542d58987ec7c39b0c40e))

## [0.6.14](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.13...v0.6.14) (2025-02-28)

## [0.6.13](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.12...v0.6.13) (2025-02-28)

## [0.6.12](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.11...v0.6.12) (2025-02-28)

## [0.6.11](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.10...v0.6.11) (2025-02-28)

## [0.6.10](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.9...v0.6.10) (2025-02-28)

## [0.6.9](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.8...v0.6.9) (2025-02-28)

## [0.6.8](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.7...v0.6.8) (2025-02-27)

## [0.6.7](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.6...v0.6.7) (2025-02-27)

## [0.6.6](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.5...v0.6.6) (2025-02-27)

## [0.6.5](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.4...v0.6.5) (2025-02-27)

## [0.6.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.3...v0.6.4) (2025-02-26)

## [0.6.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.2...v0.6.3) (2025-02-26)

## [0.6.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.6.1...v0.6.2) (2025-02-26)

## [0.6.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.5.15...v0.6.1) (2025-02-26)

## [0.5.15](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.5.14...v0.5.15) (2025-02-26)

## [0.5.14](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.5.12...v0.5.14) (2025-02-26)

## [0.5.12](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.5.11...v0.5.12) (2025-02-26)

## [0.5.11](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.5.10...v0.5.11) (2025-02-26)

## [0.5.10](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.5.9...v0.5.10) (2025-02-26)

## [0.5.9](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.5.8...v0.5.9) (2025-02-25)

## [0.5.8](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.5.7...v0.5.8) (2025-02-25)

## [0.5.7](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.5.6...v0.5.7) (2025-02-25)

## [0.5.6](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.5.5...v0.5.6) (2025-02-24)

## [0.5.5](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.5.4...v0.5.5) (2025-02-23)

## [0.5.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.5.3...v0.5.4) (2025-02-21)

## [0.5.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.5.2...v0.5.3) (2025-02-20)

## [0.5.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.5.1...v0.5.2) (2025-02-19)

### Bug Fixes

- export types ([5fc3526](https://github.com/Harbour-Enterprises/SuperDoc/commit/5fc3526f1510b330d48d0c55b0b1192db17f36f1))
- package lock json ([cdcc3c8](https://github.com/Harbour-Enterprises/SuperDoc/commit/cdcc3c8920b8745b183faf62a90eb91112f708b5))
- removed unused export ([6ff128c](https://github.com/Harbour-Enterprises/SuperDoc/commit/6ff128ce21b463a989bddc0d85c1122c45d7bc55))

### Features

- added initial TS support ([bcfae25](https://github.com/Harbour-Enterprises/SuperDoc/commit/bcfae25a83b565035b82ce704433a4f984fae39e))
- added initial TS support for super-editor ([e9b546e](https://github.com/Harbour-Enterprises/SuperDoc/commit/e9b546eda756e6e244a31ef3de6c273afa0f3e5c))

## [0.5.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.40...v0.5.1) (2025-02-19)

## [0.4.40](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.39...v0.4.40) (2025-02-19)

## [0.4.39](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.38...v0.4.39) (2025-02-18)

## [0.4.38](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.36...v0.4.38) (2025-02-18)

## [0.4.36](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.35...v0.4.36) (2025-02-07)

## [0.4.35](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.34...v0.4.35) (2025-02-07)

## [0.4.34](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.33...v0.4.34) (2025-02-07)

## [0.4.33](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.32...v0.4.33) (2025-02-06)

## [0.4.32](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.31...v0.4.32) (2025-02-06)

## [0.4.31](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.29...v0.4.31) (2025-02-05)

## [0.4.29](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.28...v0.4.29) (2025-02-04)

## [0.4.28](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.27...v0.4.28) (2025-02-04)

## [0.4.27](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.26...v0.4.27) (2025-02-04)

## [0.4.26](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.25...v0.4.26) (2025-01-31)

## [0.4.25](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.24...v0.4.25) (2025-01-31)

## [0.4.24](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.18...v0.4.24) (2025-01-31)

## [0.4.18](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.17...v0.4.18) (2025-01-30)

## [0.4.17](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.15...v0.4.17) (2025-01-30)

## [0.4.15](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.14...v0.4.15) (2025-01-30)

## [0.4.14](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.13...v0.4.14) (2025-01-29)

## [0.4.13](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.12...v0.4.13) (2025-01-29)

## [0.4.12](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.11...v0.4.12) (2025-01-28)

## [0.4.11](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.10...v0.4.11) (2025-01-28)

## [0.4.10](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.9...v0.4.10) (2025-01-28)

## [0.4.9](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.8...v0.4.9) (2025-01-27)

## [0.4.8](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.7...v0.4.8) (2025-01-27)

## [0.4.7](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.6...v0.4.7) (2025-01-24)

### Features

- add doc info ([d884818](https://github.com/Harbour-Enterprises/SuperDoc/commit/d8848183dd0ec6b05901f91f0bf8161bfaf1a8bc))
- telemetry service ([1e5f103](https://github.com/Harbour-Enterprises/SuperDoc/commit/1e5f103e73f5b8eadc43574a3d0266492c76e811))

## [0.4.6](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.5...v0.4.6) (2025-01-23)

## [0.4.5](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.4...v0.4.5) (2025-01-23)

## [0.4.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.3...v0.4.4) (2025-01-23)

## [0.4.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.2...v0.4.3) (2025-01-22)

### Reverts

- Revert "fix pdf preview scale" ([18d1f02](https://github.com/Harbour-Enterprises/SuperDoc/commit/18d1f0206bbd93989feb89d8400a02e26e949097))

## [0.4.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.1...v0.4.2) (2025-01-22)

## [0.4.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.3.14...v0.4.1) (2025-01-22)

## [0.3.14](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.3.11...v0.3.14) (2025-01-22)

## [0.3.11](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.3.9...v0.3.11) (2025-01-22)

## [0.3.9](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.3.8...v0.3.9) (2025-01-22)

### Bug Fixes

- broken links on README.md ([85910c9](https://github.com/Harbour-Enterprises/SuperDoc/commit/85910c9b4e6d835295b0f4ffdf087040031c5e2a))

## [0.3.8](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.3.7...v0.3.8) (2025-01-17)

## [0.3.7](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.3.6...v0.3.7) (2025-01-17)

## [0.3.6](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.3.4...v0.3.6) (2025-01-16)

## [0.3.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.3.3...v0.3.4) (2025-01-15)

## [0.3.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.3.2...v0.3.3) (2025-01-15)

## [0.3.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.3.1...v0.3.2) (2025-01-15)

## [0.3.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.2.44...v0.3.1) (2025-01-15)

## [0.2.44](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.4.0...v0.2.44) (2025-01-15)

# [0.4.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.2.40...v0.4.0) (2025-01-15)

### Features

- add code examples ([487830a](https://github.com/Harbour-Enterprises/SuperDoc/commit/487830acc78b74a0ac542c1d80811e472b643f8f))

## [0.2.40](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.2.39...v0.2.40) (2025-01-14)

## [0.2.39](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.2.38...v0.2.39) (2025-01-14)

## [0.2.38](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.2.37...v0.2.38) (2025-01-14)

## [0.2.37](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.2.36...v0.2.37) (2025-01-14)

## [0.2.36](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.2.34...v0.2.36) (2025-01-14)

## [0.2.34](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.2.33...v0.2.34) (2025-01-14)

## [0.2.33](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.2.32...v0.2.33) (2025-01-14)

## [0.2.32](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.2.31...v0.2.32) (2025-01-14)

## [0.2.31](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.2.30...v0.2.31) (2025-01-14)

## [0.2.30](https://github.com/Harbour-Enterprises/SuperDoc/compare/v0.2.29...v0.2.30) (2025-01-14)

## [0.2.29](https://github.com/Harbour-Enterprises/SuperDoc/compare/0.2.28...v0.2.29) (2025-01-14)

## [0.2.28](https://github.com/Harbour-Enterprises/SuperDoc/compare/5c9123141ae7d28460f7e7dd69d7ffb0029c081f...0.2.28) (2025-01-14)

### Features

- add paths to ignore during npm publish ([0afaaed](https://github.com/Harbour-Enterprises/SuperDoc/commit/0afaaedcd71e01ddca84b50f1f1681018bb077f8))
- add pre-commit + gitleaks ([43cd78b](https://github.com/Harbour-Enterprises/SuperDoc/commit/43cd78bba054bc0975f093ed3ba629b9f66c6fe0))
- add release-it + changelogs + gh release tags ([e0e3ae9](https://github.com/Harbour-Enterprises/SuperDoc/commit/e0e3ae971f8e90265f12fa42dde2a88c076816f4))

### Reverts

- revert changeset config (#130) ([5c91231](https://github.com/Harbour-Enterprises/SuperDoc/commit/5c9123141ae7d28460f7e7dd69d7ffb0029c081f)), closes [#130](https://github.com/Harbour-Enterprises/SuperDoc/issues/130) [#128](https://github.com/Harbour-Enterprises/SuperDoc/issues/128) [#127](https://github.com/Harbour-Enterprises/SuperDoc/issues/127) [#126](https://github.com/Harbour-Enterprises/SuperDoc/issues/126) [#125](https://github.com/Harbour-Enterprises/SuperDoc/issues/125) [#124](https://github.com/Harbour-Enterprises/SuperDoc/issues/124)

# superdoc

## 0.0.3

### Patch Changes

- Upgrades to fields

## 0.0.2

### Patch Changes

- Patch superdoc

## 0.0.2

### Patch Changes

- Patch superdoc
