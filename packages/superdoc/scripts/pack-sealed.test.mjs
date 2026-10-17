import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vite-plus/test';

import {
  packSealedPublicPackage,
  publicPackReceiptPath,
  readPublicPackReceipt,
  runPnpmPack,
} from './pack-sealed.mjs';
import { hashPublicTree } from './public-output-receipt.mjs';

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'sealed-pack-test-'));
  const packageRoot = path.join(root, 'package');
  mkdirSync(path.join(packageRoot, 'dist'), { recursive: true });
  mkdirSync(path.join(packageRoot, 'dist-cdn'));
  writeFileSync(path.join(packageRoot, 'dist', 'superdoc.es.js'), 'export { createSuperDocV2Integration } from "@superdoc/docx-engine";\n');
  writeFileSync(path.join(packageRoot, 'dist', 'superdoc.cjs'), 'exports.npm = require("@superdoc/docx-engine");\n');
  writeFileSync(path.join(packageRoot, 'dist', 'style.css'), '@import "@superdoc/docx-engine/style.css";\n');
  writeFileSync(path.join(packageRoot, 'dist-cdn', 'superdoc.min.js'), 'globalThis.SuperDoc = {};\n');
  writeFileSync(path.join(packageRoot, 'README.md'), '# SuperDoc\n');
  writeFileSync(path.join(packageRoot, 'LICENSE'), 'AGPL-3.0\n');
  writeFileSync(path.join(packageRoot, 'NOTICE'), 'Notice\n');
  writeJson(path.join(packageRoot, 'package.json'), {
    name: 'superdoc',
    version: '2.0.0',
    license: 'AGPL-3.0',
    files: ['dist', 'dist-cdn'],
    exports: { '.': { source: './source.js', import: './dist/superdoc.es.js' } },
    dependencies: {
      '@superdoc/docx-engine': '0.1.0',
      '@types/mdast': 'catalog:',
      uuid: 'catalog:',
    },
    peerDependencies: { yjs: 'catalog:', react: '>=16.8.0' },
    devDependencies: { vite: 'catalog:' },
    scripts: { prepack: 'rewrite-source', postpack: 'restore-source', test: 'vp test' },
  });
  const npmTree = hashPublicTree(path.join(packageRoot, 'dist'));
  const cdnTree = hashPublicTree(path.join(packageRoot, 'dist-cdn'));
  const receipt = {
    schema: 'superdoc-public-producer-receipt.v1',
    digest: 'a'.repeat(64),
    surfaces: {
      npm: {
        directory: 'dist',
        digest: npmTree.digest,
        fileCount: npmTree.fileCount,
        sizeBytes: npmTree.sizeBytes,
      },
      cdn: {
        directory: 'dist-cdn',
        digest: cdnTree.digest,
        fileCount: cdnTree.fileCount,
        sizeBytes: cdnTree.sizeBytes,
      },
    },
  };
  const receiptPath = path.join(root, 'public-producer-receipt.json');
  writeJson(receiptPath, receipt);
  const outputPath = path.join(packageRoot, 'superdoc.tgz');
  const packReceiptPath = publicPackReceiptPath(packageRoot);
  mkdirSync(path.dirname(packReceiptPath), { recursive: true });
  writeFileSync(outputPath, 'previous tarball bytes');
  writeFileSync(packReceiptPath, 'previous pack receipt bytes');
  return { root, packageRoot, receipt, receiptPath, outputPath, packReceiptPath };
}

function dependencies(fixture, observed = {}) {
  return {
    selectOutput: () => ({
      receipt: fixture.receipt,
      receiptPath: fixture.receiptPath,
      surfaceRoots: {
        npm: path.join(fixture.packageRoot, 'dist'),
        cdn: path.join(fixture.packageRoot, 'dist-cdn'),
      },
      pointer: null,
    }),
    verifyReceipt: () => fixture.receipt,
    readCatalog: () => ({ '@types/mdast': '^4.0.4', uuid: '^11.1.1', yjs: '^13.6.19' }),
    runPack: ({ stageRoot, packDestination }) => {
      observed.stageManifest = JSON.parse(readFileSync(path.join(stageRoot, 'package.json'), 'utf8'));
      observed.stageEntries = readdirSync(stageRoot).sort();
      mkdirSync(packDestination, { recursive: true });
      const tarball = path.join(packDestination, 'superdoc-2.0.0.tgz');
      writeFileSync(tarball, 'new sealed tarball bytes');
      return tarball;
    },
    auditTarball: () => {},
  };
}

describe('sealed public packing', () => {
  it('audits real archive contents before promoting the original compressed package', () => {
    for (const leakPrivateSource of [false, true]) {
      const fixture = createFixture();
      try {
        const adapters = dependencies(fixture);
        delete adapters.auditTarball;
        adapters.runPack = ({ stageRoot, packDestination }) => {
          mkdirSync(packDestination, { recursive: true });
          if (leakPrivateSource) writeFileSync(path.join(stageRoot, 'dist', 'leak.js'), '"v2-host/src/private.ts";');
          const archive = path.join(packDestination, 'superdoc-2.0.0.tgz');
          execFileSync('tar', ['-czf', archive, '-C', path.dirname(stageRoot), path.basename(stageRoot)]);
          return archive;
        };
        const pack = () => packSealedPublicPackage({ packageRoot: fixture.packageRoot,
          outputPath: fixture.outputPath, packReceiptPath: fixture.packReceiptPath, ...adapters });
        if (leakPrivateSource) {
          expect(pack).toThrow(/private v2 source-path marker/u);
          expect(readFileSync(fixture.outputPath, 'utf8')).toBe('previous tarball bytes');
        } else {
          pack();
          expect([...readFileSync(fixture.outputPath).subarray(0, 2)]).toEqual([0x1f, 0x8b]);
        }
      } finally {
        rmSync(fixture.root, { recursive: true, force: true });
      }
    }
  });

  it('leaves the source manifest and prior tarball byte-identical at every failure checkpoint', () => {
    const checkpoints = [
      'after-receipt-verify',
      'after-stage',
      'after-pack',
      'after-audit',
      'after-pack-receipt',
      'before-promotion',
      'after-pack-receipt-promote',
      'before-tar-promote',
    ];
    for (const failAt of checkpoints) {
      const fixture = createFixture();
      try {
        const sourceBefore = readFileSync(path.join(fixture.packageRoot, 'package.json'));
        const tarballBefore = readFileSync(fixture.outputPath);
        const packReceiptBefore = readFileSync(fixture.packReceiptPath);
        expect(() =>
          packSealedPublicPackage({
            packageRoot: fixture.packageRoot,
            outputPath: fixture.outputPath,
            packReceiptPath: fixture.packReceiptPath,
            failAt,
            ...dependencies(fixture),
          }),
        ).toThrow(new RegExp(failAt, 'u'));
        expect(readFileSync(path.join(fixture.packageRoot, 'package.json'))).toEqual(sourceBefore);
        expect(readFileSync(fixture.outputPath)).toEqual(tarballBefore);
        expect(readFileSync(fixture.packReceiptPath)).toEqual(packReceiptBefore);
      } finally {
        rmSync(fixture.root, { recursive: true, force: true });
      }
    }
  });

  it('packs only an ephemeral sanitized allowlist and binds the promoted tarball', () => {
    const fixture = createFixture();
    const observed = {};
    try {
      const sourceBefore = readFileSync(path.join(fixture.packageRoot, 'package.json'));
      const result = packSealedPublicPackage({
        packageRoot: fixture.packageRoot,
        outputPath: fixture.outputPath,
        packReceiptPath: fixture.packReceiptPath,
        ...dependencies(fixture, observed),
      });

      expect(readFileSync(path.join(fixture.packageRoot, 'package.json'))).toEqual(sourceBefore);
      expect(readFileSync(fixture.outputPath, 'utf8')).toBe('new sealed tarball bytes');
      expect(observed.stageEntries).toEqual(['LICENSE', 'NOTICE', 'README.md', 'dist', 'dist-cdn', 'package.json']);
      expect(observed.stageManifest.exports['.']).toEqual({ import: './dist/superdoc.es.js' });
      expect(observed.stageManifest.dependencies['@superdoc/docx-engine']).toBe('0.1.0');
      expect(observed.stageManifest.dependencies['@types/mdast']).toBe('^4.0.4');
      expect(observed.stageManifest.dependencies.uuid).toBe('^11.1.1');
      expect(observed.stageManifest.peerDependencies).toEqual({ yjs: '^13.6.19', react: '>=16.8.0' });
      expect(JSON.stringify(observed.stageManifest)).not.toMatch(/(?:catalog|workspace|link|file|portal):/u);
      expect(observed.stageManifest.devDependencies).toBeUndefined();
      expect(observed.stageManifest.scripts).toEqual({ test: 'vp test' });
      expect(
        readPublicPackReceipt({
          packageRoot: fixture.packageRoot,
          receiptPath: result.packReceiptPath,
          tarballPath: result.outputPath,
          expectedPublicReceiptDigest: fixture.receipt.digest,
        }).publicProducerReceiptDigest,
      ).toBe(fixture.receipt.digest);
      writeFileSync(fixture.outputPath, 'changed after pack receipt');
      expect(() =>
        readPublicPackReceipt({
          packageRoot: fixture.packageRoot,
          receiptPath: result.packReceiptPath,
          tarballPath: result.outputPath,
          expectedPublicReceiptDigest: fixture.receipt.digest,
        }),
      ).toThrow(/does not match its public pack receipt/u);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it('marks internal packs private and rejects them at a publication receipt read', () => {
    const fixture = createFixture();
    const observed = {};
    try {
      const sourceBefore = readFileSync(path.join(fixture.packageRoot, 'package.json'));
      const result = packSealedPublicPackage({
        packageRoot: fixture.packageRoot,
        outputPath: fixture.outputPath,
        packReceiptPath: fixture.packReceiptPath,
        localOnly: true,
        ...dependencies(fixture, observed),
      });
      expect(observed.stageManifest.private).toBe(true);
      expect(observed.stageManifest.publishConfig).toBeUndefined();
      expect(readFileSync(path.join(fixture.packageRoot, 'package.json'))).toEqual(sourceBefore);
      expect(result.packReceipt.localOnly).toBe(true);
      expect(() => readPublicPackReceipt({
        packageRoot: fixture.packageRoot,
        receiptPath: result.packReceiptPath,
        tarballPath: result.outputPath,
      })).toThrow(/local-only state/u);
      expect(readPublicPackReceipt({
        packageRoot: fixture.packageRoot,
        receiptPath: result.packReceiptPath,
        tarballPath: result.outputPath,
        expectedLocalOnly: true,
      }).localOnly).toBe(true);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it('packs a private npm-only behavior build without requiring or shipping CDN output', () => {
    const fixture = createFixture();
    const observed = {};
    try {
      rmSync(path.join(fixture.packageRoot, 'dist-cdn'), { recursive: true });
      delete fixture.receipt.surfaces.cdn;
      packSealedPublicPackage({
        packageRoot: fixture.packageRoot,
        outputPath: fixture.outputPath,
        packReceiptPath: fixture.packReceiptPath,
        localOnly: true,
        npmOnly: true,
        ...dependencies(fixture, observed),
      });
      expect(observed.stageEntries).not.toContain('dist-cdn');
      expect(observed.stageManifest.files).not.toContain('dist-cdn');
      expect(observed.stageManifest.private).toBe(true);
      expect(() => packSealedPublicPackage({ packageRoot: fixture.packageRoot, npmOnly: true })).toThrow(/local-only/u);
      expect(() => packSealedPublicPackage({
        packageRoot: fixture.packageRoot,
        ...dependencies(fixture),
      })).toThrow();
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it('applies a validated version override only inside the ephemeral pack stage', () => {
    const fixture = createFixture();
    const observed = {};
    try {
      const sourceBefore = readFileSync(path.join(fixture.packageRoot, 'package.json'));
      const result = packSealedPublicPackage({
        packageRoot: fixture.packageRoot,
        outputPath: fixture.outputPath,
        packReceiptPath: fixture.packReceiptPath,
        versionOverride: '2.0.0-local.4',
        ...dependencies(fixture, observed),
      });
      expect(observed.stageManifest.version).toBe('2.0.0-local.4');
      expect(result.packReceipt.package.version).toBe('2.0.0-local.4');
      expect(readFileSync(path.join(fixture.packageRoot, 'package.json'))).toEqual(sourceBefore);
      expect(() =>
        packSealedPublicPackage({
          packageRoot: fixture.packageRoot,
          outputPath: fixture.outputPath,
          packReceiptPath: fixture.packReceiptPath,
          versionOverride: 'not a version',
          ...dependencies(fixture),
        }),
      ).toThrow(/valid semantic version/u);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it('passes lifecycle-script disabling to pnpm pack', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'pnpm-pack-no-scripts-'));
    try {
      const stageRoot = path.join(root, 'stage');
      const destination = path.join(root, 'packed');
      mkdirSync(stageRoot);
      writeFileSync(path.join(stageRoot, 'payload.txt'), 'payload\n');
      writeJson(path.join(stageRoot, 'package.json'), {
        name: 'pack-script-proof',
        version: '1.0.0',
        files: ['payload.txt'],
        scripts: { prepack: 'node -e "require(\'node:fs\').writeFileSync(\'prepack-ran\', \'yes\')"' },
      });
      const tarball = runPnpmPack({ stageRoot, packDestination: destination });
      expect(existsSync(tarball)).toBe(true);
      expect(existsSync(path.join(stageRoot, 'prepack-ran'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
