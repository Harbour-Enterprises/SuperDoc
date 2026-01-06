# [1.3.0-next.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v1.3.0-next.1...v1.3.0-next.2) (2026-01-06)


### Bug Fixes

* account for indentation when drawing paragraph borders ([#1655](https://github.com/Harbour-Enterprises/SuperDoc/issues/1655)) ([01a8d39](https://github.com/Harbour-Enterprises/SuperDoc/commit/01a8d394784d714c539963430abc712dc360a0cd))
* bug - page number format from first section overrides number ([#1654](https://github.com/Harbour-Enterprises/SuperDoc/issues/1654)) ([c45ecfa](https://github.com/Harbour-Enterprises/SuperDoc/commit/c45ecfae71be17953e88662e8e646dab173b4c61))
* partial row height computation ([#1652](https://github.com/Harbour-Enterprises/SuperDoc/issues/1652)) ([0ccd3c8](https://github.com/Harbour-Enterprises/SuperDoc/commit/0ccd3c8c9924cc2a5d35cd9d09ff45dc1a964496))

# [1.3.0-next.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v1.2.2-next.1...v1.3.0-next.1) (2026-01-06)


### Features

* add support for subscript and superscript rendering ([#1649](https://github.com/Harbour-Enterprises/SuperDoc/issues/1649)) ([1e3019c](https://github.com/Harbour-Enterprises/SuperDoc/commit/1e3019cbc8d28d6cf9bd1720c56926b6fc300e8d))

## [1.2.2-next.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v1.2.1...v1.2.2-next.1) (2026-01-06)


### Bug Fixes

* adjusted row height not preserved when table doesn't fit current page ([#1642](https://github.com/Harbour-Enterprises/SuperDoc/issues/1642)) ([edcab55](https://github.com/Harbour-Enterprises/SuperDoc/commit/edcab5507ee92d56ab25079b7345928c8dd7839a))
* auto color in tables with dark cells ([#1644](https://github.com/Harbour-Enterprises/SuperDoc/issues/1644)) ([f498a03](https://github.com/Harbour-Enterprises/SuperDoc/commit/f498a03dff563e7e24aaed78cbbb3b93bedf23a8))
* hanging indent in tables ([#1647](https://github.com/Harbour-Enterprises/SuperDoc/issues/1647)) ([ee8a206](https://github.com/Harbour-Enterprises/SuperDoc/commit/ee8a206378f0941fb2fa4ea02842fd3629f43350))
* paragraph borders inside table cells ([#1646](https://github.com/Harbour-Enterprises/SuperDoc/issues/1646)) ([13a3797](https://github.com/Harbour-Enterprises/SuperDoc/commit/13a3797c3706ad75a55bb09a055f7fddd0662609))
* table widths with percents ([#1645](https://github.com/Harbour-Enterprises/SuperDoc/issues/1645)) ([a64a7b7](https://github.com/Harbour-Enterprises/SuperDoc/commit/a64a7b743279326bc5a0e72a6553d2f0e400a5ee))

## [1.2.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v1.2.0...v1.2.1) (2026-01-05)


### Bug Fixes

* fallback to converter titlePg if no metadata ([#1612](https://github.com/Harbour-Enterprises/SuperDoc/issues/1612)) ([d5d16e9](https://github.com/Harbour-Enterprises/SuperDoc/commit/d5d16e96fab02a43a9828f7332bcdbf38c1cedbe)), closes [#1639](https://github.com/Harbour-Enterprises/SuperDoc/issues/1639)
* first page multi section logic, other numbering ([#1641](https://github.com/Harbour-Enterprises/SuperDoc/issues/1641)) ([48856ea](https://github.com/Harbour-Enterprises/SuperDoc/commit/48856ea536d5f73e25b8f20a7c4476e388d2156d))
* section start page ([#1639](https://github.com/Harbour-Enterprises/SuperDoc/issues/1639)) ([fbd71c7](https://github.com/Harbour-Enterprises/SuperDoc/commit/fbd71c755936653ae976c61d4bd6ffe110424925))
* take justification into account when laying out tables ([#1640](https://github.com/Harbour-Enterprises/SuperDoc/issues/1640)) ([b0a4b7d](https://github.com/Harbour-Enterprises/SuperDoc/commit/b0a4b7de0e96076856b06c9e5dd388b8b3924127))

## [1.1.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v1.1.3...v1.1.4) (2026-01-05)


### Bug Fixes

* missing comment text on export ([#1582](https://github.com/Harbour-Enterprises/SuperDoc/issues/1582)) ([#1637](https://github.com/Harbour-Enterprises/SuperDoc/issues/1637)) ([5ec87a0](https://github.com/Harbour-Enterprises/SuperDoc/commit/5ec87a032cbcd8aca802ca9495a4ae54c7bef398))

## [1.1.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v1.1.2...v1.1.3) (2026-01-02)


### Bug Fixes

* sd type export ([68a4362](https://github.com/Harbour-Enterprises/SuperDoc/commit/68a43624037a1968db9aae370560dd475cf0e1df))

## [1.1.2](https://github.com/Harbour-Enterprises/SuperDoc/compare/v1.1.1...v1.1.2) (2025-12-31)


### Bug Fixes

* add destroyed to flag to abort init [stable] ([#1617](https://github.com/Harbour-Enterprises/SuperDoc/issues/1617)) ([337b452](https://github.com/Harbour-Enterprises/SuperDoc/commit/337b4520d0e6e68da50855e6e5dd6f476df2ebd0))

## [1.1.1](https://github.com/Harbour-Enterprises/SuperDoc/compare/v1.1.0...v1.1.1) (2025-12-29)


### Bug Fixes

* infinite loop when paginating if top margin = header margin, zero margins ([84f7623](https://github.com/Harbour-Enterprises/SuperDoc/commit/84f7623c57234385f2c7d47bc3ee96ee93c1e9a5))

# [1.1.0](https://github.com/Harbour-Enterprises/SuperDoc/compare/v1.0.5...v1.1.0) (2025-12-29)


### Features

* enhance presentation editor viewing mode styles and functionality ([#1596](https://github.com/Harbour-Enterprises/SuperDoc/issues/1596)) ([88ac831](https://github.com/Harbour-Enterprises/SuperDoc/commit/88ac831e249d2abef7a6f578ebfbd7bb67ceaac9))

## [1.0.5](https://github.com/Harbour-Enterprises/SuperDoc/compare/v1.0.4...v1.0.5) (2025-12-29)


### Bug Fixes

* receives media from storage image media ([#1609](https://github.com/Harbour-Enterprises/SuperDoc/issues/1609)) ([bee06ec](https://github.com/Harbour-Enterprises/SuperDoc/commit/bee06ecffd28d89c178aab185e73730b91805e98))

## [1.0.4](https://github.com/Harbour-Enterprises/SuperDoc/compare/v1.0.3...v1.0.4) (2025-12-23)


### Bug Fixes

* underline off ([#1584](https://github.com/Harbour-Enterprises/SuperDoc/issues/1584)) ([535add9](https://github.com/Harbour-Enterprises/SuperDoc/commit/535add901ef138097c8d88d7ebf301c8bc007fe6))

## [1.0.3](https://github.com/Harbour-Enterprises/SuperDoc/compare/v1.0.2...v1.0.3) (2025-12-23)


### Bug Fixes

* header/footer collapsing from image placement ([#1575](https://github.com/Harbour-Enterprises/SuperDoc/issues/1575)) ([1ca9165](https://github.com/Harbour-Enterprises/SuperDoc/commit/1ca91659205b3cfd200f8b11c8a4ade143a452d7))
* margins with multi column sections, text wrapping in sections ([#1571](https://github.com/Harbour-Enterprises/SuperDoc/issues/1571)) ([d3ee276](https://github.com/Harbour-Enterprises/SuperDoc/commit/d3ee276301ee92bed4f2d9434e5f0163ea840a28))
* right click ([#1574](https://github.com/Harbour-Enterprises/SuperDoc/issues/1574)) ([cf870c4](https://github.com/Harbour-Enterprises/SuperDoc/commit/cf870c48db9bd5a662850ed0bf1d2c7e87ab9a90))
* right click context ([#1572](https://github.com/Harbour-Enterprises/SuperDoc/issues/1572)) ([9afaba9](https://github.com/Harbour-Enterprises/SuperDoc/commit/9afaba9301fb27d2411707eacd6aee44d3b52809))
* selections in tables ([#1573](https://github.com/Harbour-Enterprises/SuperDoc/issues/1573)) ([888ea49](https://github.com/Harbour-Enterprises/SuperDoc/commit/888ea4967fd6e4ac3bfa378ba6ce87bcc5f1ba48))

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
