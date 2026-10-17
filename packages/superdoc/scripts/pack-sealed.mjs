#!/usr/bin/env node

import { createHash, randomBytes } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  constants as fsConstants,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { auditSuperdocPackageArtifact } from '../../../scripts/audit-publish-artifact.mjs';
import { withUncompressedTarball } from '../../../scripts/tarball-audit.mjs';
import {
  observeEngineInputIdentity,
  readDeclaredEngineVersion,
  verifyPreparedEngine,
} from '../../../scripts/engine-prepared-input.mjs';
import {
  hashPublicTree,
  readPublicOutputSelection,
  verifyPublicOutputReceipt,
} from './public-output-receipt.mjs';

const require = createRequire(import.meta.url);
const { buildSanitizedPackManifest } = require('./sanitize-pack-manifest.cjs');

export const PUBLIC_PACK_RECEIPT_SCHEMA = 'superdoc-public-pack-receipt.v2';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKED_DIRECTORIES = Object.freeze(['dist', 'dist-cdn']);
const PACKED_FILES = Object.freeze(['README.md', 'LICENSE', 'NOTICE']);
const PACKED_MANIFEST_FILES = Object.freeze([...PACKED_DIRECTORIES, ...PACKED_FILES]);
const SEMVER_PATTERN =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u;

export function readPnpmDefaultCatalog({ packageRoot = PACKAGE_ROOT, exec = execFileSync } = {}) {
  let output;
  try {
    output = exec('pnpm', ['config', 'get', 'catalog', '--json'], {
      cwd: packageRoot,
      encoding: 'utf8',
    });
  } catch (error) {
    throw new Error(`could not read the pnpm default catalog for sealed packing: ${error.message}`);
  }

  let catalog;
  try {
    catalog = JSON.parse(output);
  } catch (error) {
    throw new Error(`pnpm returned an unreadable default catalog for sealed packing: ${error.message}`);
  }
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    throw new Error('pnpm returned a non-object default catalog for sealed packing');
  }
  return catalog;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function withDigest(unsigned) {
  return { ...unsigned, digest: sha256(canonicalJson(unsigned)) };
}

export function publicPackReceiptPath(packageRoot = PACKAGE_ROOT) {
  return path.join(packageRoot, 'build-receipts', 'public-pack-receipt.json');
}

function copyRegularFile(source, destination) {
  const stat = lstatSync(source, { throwIfNoEntry: false });
  if (!stat?.isFile() || stat.isSymbolicLink()) {
    throw new Error(`sealed pack input must be a regular file: ${source}`);
  }
  mkdirSync(path.dirname(destination), { recursive: true });
  copyFileSync(source, destination, fsConstants.COPYFILE_EXCL);
}

function copyRegularTree(sourceRoot, destinationRoot) {
  const rootStat = lstatSync(sourceRoot, { throwIfNoEntry: false });
  if (!rootStat?.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error(`sealed pack input must be a regular directory: ${sourceRoot}`);
  }
  mkdirSync(destinationRoot, { recursive: false });
  const walk = (sourceDirectory, destinationDirectory) => {
    for (const entry of readdirSync(sourceDirectory, { withFileTypes: true })) {
      const source = path.join(sourceDirectory, entry.name);
      const destination = path.join(destinationDirectory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`sealed pack input contains a symlink: ${source}`);
      if (entry.isDirectory()) {
        mkdirSync(destination);
        walk(source, destination);
      } else if (entry.isFile()) {
        copyFileSync(source, destination, fsConstants.COPYFILE_EXCL);
      } else {
        throw new Error(`sealed pack input contains an unsupported filesystem entry: ${source}`);
      }
    }
  };
  walk(sourceRoot, destinationRoot);
}

function checkpoint(name, failAt) {
  if (failAt === name) throw new Error(`injected sealed-pack failure at ${name}`);
}

function assertStagedSurfaces(stageRoot, publicReceipt, npmOnly) {
  for (const [surface, directory] of [
    ['npm', 'dist'],
    ['cdn', 'dist-cdn'],
  ]) {
    if (npmOnly && surface === 'cdn') continue;
    const sealed = publicReceipt.surfaces?.[surface];
    const staged = hashPublicTree(path.join(stageRoot, directory));
    if (
      !sealed ||
      sealed.directory !== directory ||
      staged.digest !== sealed.digest ||
      staged.fileCount !== sealed.fileCount ||
      staged.sizeBytes !== sealed.sizeBytes
    ) {
      throw new Error(`staged ${surface} output does not match public producer receipt ${publicReceipt.digest}`);
    }
  }
}

export function normalizePackVersionOverride(versionOverride) {
  if (versionOverride == null) return null;
  if (typeof versionOverride !== 'string' || !SEMVER_PATTERN.test(versionOverride)) {
    throw new Error(`sealed pack version override must be a valid semantic version; got ${JSON.stringify(versionOverride)}`);
  }
  return versionOverride;
}

function createPackStage({ packageRoot, stageRoot, publicReceipt, surfaceRoots, readCatalog, versionOverride, localOnly, npmOnly }) {
  mkdirSync(stageRoot, { recursive: false });
  for (const directory of PACKED_DIRECTORIES) {
    if (npmOnly && directory === 'dist-cdn') continue;
    const surface = directory === 'dist' ? 'npm' : 'cdn';
    copyRegularTree(surfaceRoots[surface], path.join(stageRoot, directory));
  }
  for (const file of PACKED_FILES) {
    copyRegularFile(path.join(packageRoot, file), path.join(stageRoot, file));
  }

  const sourceManifestPath = path.join(packageRoot, 'package.json');
  const sourceManifest = JSON.parse(readFileSync(sourceManifestPath, 'utf8'));
  const hasInternalWorkspace = existsSync(path.resolve(packageRoot, '../../../v2/package.json'));
  const catalog = readCatalog({ packageRoot });
  const packedManifest = buildSanitizedPackManifest(sourceManifest, {
    hasInternalWorkspace,
    files: npmOnly ? PACKED_MANIFEST_FILES.filter(file => file !== 'dist-cdn') : PACKED_MANIFEST_FILES,
    catalog,
  });
  if (versionOverride) packedManifest.version = versionOverride;
  if (localOnly) {
    packedManifest.private = true;
    delete packedManifest.publishConfig;
  }
  writeFileSync(path.join(stageRoot, 'package.json'), `${JSON.stringify(packedManifest, null, 2)}\n`, { flag: 'wx' });
  assertStagedSurfaces(stageRoot, publicReceipt, npmOnly);
  return packedManifest;
}

/** Run the package manager with lifecycle scripts disabled. */
export function runPnpmPack({ stageRoot, packDestination, spawn = spawnSync }) {
  mkdirSync(packDestination, { recursive: true });
  const result = spawn('pnpm', ['pack', '--config.ignore-scripts=true', '--pack-destination', packDestination], {
    cwd: stageRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      npm_config_ignore_scripts: 'true',
      PNPM_CONFIG_IGNORE_SCRIPTS: 'true',
    },
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`pnpm pack exited with ${result.status ?? result.signal}`);
  }
  const tarballs = readdirSync(packDestination)
    .filter((entry) => entry.endsWith('.tgz'))
    .map((entry) => path.join(packDestination, entry));
  if (tarballs.length !== 1) {
    throw new Error(`pnpm pack produced ${tarballs.length} tarballs; expected exactly one`);
  }
  return tarballs[0];
}

function assertTarballAllowlist(tarballPath) {
  const entries = execFileSync('tar', ['-tf', tarballPath], { encoding: 'utf8' })
    .split('\n')
    .map((entry) => entry.trim().replace(/^\.\//u, ''))
    .filter(Boolean);
  for (const entry of entries) {
    if (entry.split('/').includes('..') || (!entry.startsWith('package/') && entry !== 'package')) {
      throw new Error(`packed tarball contains an unsafe entry: ${entry}`);
    }
    const relative = entry.replace(/^package\/?/u, '');
    if (!relative || relative.endsWith('/')) continue;
    const allowed =
      relative === 'package.json' ||
      PACKED_FILES.includes(relative) ||
      PACKED_DIRECTORIES.some((directory) => relative === directory || relative.startsWith(`${directory}/`));
    if (!allowed) throw new Error(`packed tarball contains a non-allowlisted entry: ${relative}`);
  }

  const verboseEntries = execFileSync('tar', ['-tvf', tarballPath], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  for (const entry of verboseEntries) {
    const kind = entry.trimStart()[0];
    if (kind !== '-' && kind !== 'd') {
      throw new Error(`packed tarball contains a non-regular entry: ${entry}`);
    }
  }
}

function auditPackedTarball(tarballPath) {
  return withUncompressedTarball(tarballPath, auditUncompressedTarball);
}

function auditUncompressedTarball(tarballPath) {
  assertTarballAllowlist(tarballPath);
  const audit = auditSuperdocPackageArtifact(tarballPath, { label: 'superdoc-tarball' });
  if (!audit.ok) {
    throw new Error(
      `[audit-publish-artifact] FAIL superdoc-tarball:\n${audit.violations.map((item) => `  - ${item}`).join('\n')}`,
    );
  }
}

function restoreFile(filePath, previousBytes) {
  if (previousBytes === null) {
    rmSync(filePath, { force: true });
    return;
  }
  mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${randomBytes(6).toString('hex')}.rollback`;
  try {
    writeFileSync(temporary, previousBytes, { flag: 'wx' });
    renameSync(temporary, filePath);
  } finally {
    rmSync(temporary, { force: true });
  }
}

function promotePackPair({
  tarballCandidate,
  packReceiptCandidate,
  outputPath,
  packReceiptPath,
  additionalPromotions = [],
  failAt,
}) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  const suffix = `${process.pid}.${randomBytes(6).toString('hex')}`;
  const localTarballCandidate = `${outputPath}.${suffix}.tmp`;
  const metadataPromotions = [
    { candidatePath: packReceiptCandidate, destinationPath: packReceiptPath, id: 'pack-receipt' },
    ...additionalPromotions,
  ];
  const destinations = new Set();
  const preparedMetadata = metadataPromotions.map((promotion, index) => {
    const destinationPath = path.resolve(promotion.destinationPath);
    const candidatePath = path.resolve(promotion.candidatePath);
    if (destinationPath === path.resolve(outputPath) || destinations.has(destinationPath)) {
      throw new Error(`sealed pack promotion repeats destination ${destinationPath}`);
    }
    destinations.add(destinationPath);
    mkdirSync(path.dirname(destinationPath), { recursive: true });
    return {
      id: promotion.id ?? `metadata-${index}`,
      candidatePath,
      destinationPath,
      localCandidate: `${destinationPath}.${suffix}.tmp`,
      previousBytes: existsSync(destinationPath) ? readFileSync(destinationPath) : null,
    };
  });
  try {
    copyFileSync(tarballCandidate, localTarballCandidate, fsConstants.COPYFILE_EXCL);
    for (const promotion of preparedMetadata) {
      copyFileSync(promotion.candidatePath, promotion.localCandidate, fsConstants.COPYFILE_EXCL);
    }
    checkpoint('before-promotion', failAt);

    try {
      for (const promotion of preparedMetadata) {
        renameSync(promotion.localCandidate, promotion.destinationPath);
      }
      checkpoint('after-pack-receipt-promote', failAt);
      checkpoint('after-metadata-promote', failAt);
      checkpoint('before-tar-promote', failAt);
      // This is deliberately the final operation. Until this atomic rename,
      // the previous canonical tarball remains untouched and usable.
      renameSync(localTarballCandidate, outputPath);
    } catch (error) {
      for (const promotion of [...preparedMetadata].reverse()) {
        restoreFile(promotion.destinationPath, promotion.previousBytes);
      }
      throw error;
    }
  } finally {
    rmSync(localTarballCandidate, { force: true });
    for (const promotion of preparedMetadata) rmSync(promotion.localCandidate, { force: true });
  }
}

export function readPublicPackReceipt({
  packageRoot = PACKAGE_ROOT,
  receiptPath = publicPackReceiptPath(packageRoot),
  tarballPath = path.join(packageRoot, 'superdoc.tgz'),
  expectedPublicReceiptDigest = null,
  expectedLocalOnly = false,
} = {}) {
  let receipt;
  try {
    receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  } catch (error) {
    throw new Error(`public pack receipt is unreadable: ${receiptPath} (${error.message})`);
  }
  if (receipt?.schema !== PUBLIC_PACK_RECEIPT_SCHEMA) {
    throw new Error(`public pack receipt schema mismatch: ${receipt?.schema}`);
  }
  const { digest, ...unsigned } = receipt;
  if (digest !== sha256(canonicalJson(unsigned))) throw new Error('public pack receipt failed its self-digest check');
  if (receipt.localOnly !== expectedLocalOnly) {
    throw new Error(`public pack receipt local-only state does not match required ${expectedLocalOnly}`);
  }
  if (expectedPublicReceiptDigest && receipt.publicProducerReceiptDigest !== expectedPublicReceiptDigest) {
    throw new Error('public pack receipt is bound to a different public producer receipt');
  }
  const bytes = readFileSync(tarballPath);
  if (receipt.tarball?.sha256 !== sha256(bytes) || receipt.tarball?.sizeBytes !== bytes.byteLength) {
    throw new Error('SuperDoc tarball does not match its public pack receipt');
  }
  return receipt;
}

export function packSealedPublicPackage({
  packageRoot = PACKAGE_ROOT,
  v2Root = path.resolve(packageRoot, '../../../v2'),
  outputPath = path.join(packageRoot, 'superdoc.tgz'),
  packReceiptPath = publicPackReceiptPath(packageRoot),
  env = process.env,
  failAt = env.SUPERDOC_PACK_FAIL_AT ?? null,
  selectOutput = readPublicOutputSelection,
  verifyReceipt = verifyPublicOutputReceipt,
  runPack = runPnpmPack,
  auditTarball = auditPackedTarball,
  validateTarball = null,
  prepareStage = null,
  preparePromotion = null,
  readCatalog = readPnpmDefaultCatalog,
  versionOverride = env.SUPERDOC_PACK_VERSION_OVERRIDE ?? null,
  localOnly = false,
  npmOnly = false,
} = {}) {
  if (npmOnly && !localOnly) throw new Error('npm-only packing requires --local-only; publication requires both surfaces');
  versionOverride = normalizePackVersionOverride(versionOverride);
  const sourceManifestPath = path.join(packageRoot, 'package.json');
  const sourceManifestBefore = readFileSync(sourceManifestPath);
  const selection = selectOutput({ packageRoot });
  const publicReceipt = verifyReceipt({
    packageRoot,
    v2Root,
    requiredSurfaces: npmOnly ? ['npm'] : ['npm', 'cdn'],
    env,
    surfaceRoots: selection.surfaceRoots,
    receiptPath: selection.receiptPath,
  });
  if (publicReceipt.digest !== selection.receipt.digest) {
    throw new Error('public output selection changed while the sealed pack was being verified');
  }
  let engineProtection = null;
  if (publicReceipt.engineInput?.mode === 'prepared' && existsSync(path.join(v2Root, 'package.json'))) {
    const verified = verifyPreparedEngine({
      v2Root,
      expectedVersion: readDeclaredEngineVersion(packageRoot),
      surfaces: npmOnly ? ['dist'] : ['dist', 'dist-cdn'],
      expectedReceiptDigest: publicReceipt.engineInput.producerReceiptDigest,
      currentInputIdentity: observeEngineInputIdentity({ v2Root }),
      expectedBuildProfile: localOnly ? 'eval-fast' : 'canonical',
    });
    if (!localOnly && verified.receipt.protectionCache?.authoritativeForPublication !== true) {
      throw new Error('sealed public publication requires an authoritative canonical engine');
    }
    engineProtection = {
      buildProfile: verified.receipt.buildProfile,
      authoritativeForPublication: verified.receipt.protectionCache?.authoritativeForPublication === true,
    };
  }
  checkpoint('after-receipt-verify', failAt);

  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'superdoc-sealed-pack-'));
  try {
    const stageRoot = path.join(temporaryRoot, 'package');
    const packDestination = path.join(temporaryRoot, 'packed');
    createPackStage({
      packageRoot,
      stageRoot,
      publicReceipt,
      surfaceRoots: selection.surfaceRoots,
      readCatalog,
      versionOverride,
      localOnly,
      npmOnly,
    });
    const stageMetadata = prepareStage
      ? prepareStage({ stageRoot, publicReceipt, selection, temporaryRoot })
      : null;
    checkpoint('after-stage', failAt);
    const packedManifest = JSON.parse(readFileSync(path.join(stageRoot, 'package.json'), 'utf8'));
    const packRootTree = hashPublicTree(stageRoot);
    const generatedTarball = runPack({ stageRoot, packDestination });
    checkpoint('after-pack', failAt);
    if (validateTarball) validateTarball(generatedTarball);
    auditTarball(generatedTarball);
    checkpoint('after-audit', failAt);

    const tarballBytes = readFileSync(generatedTarball);
    const packReceipt = withDigest({
      schema: PUBLIC_PACK_RECEIPT_SCHEMA,
      package: { name: packedManifest.name, version: packedManifest.version },
      publicProducerReceiptDigest: publicReceipt.digest,
      localOnly,
      engineProtection,
      derivation: stageMetadata?.packReceiptMetadata ?? null,
      packRoot: {
        digest: packRootTree.digest,
        fileCount: packRootTree.fileCount,
        sizeBytes: packRootTree.sizeBytes,
      },
      packedManifestSha256: sha256(readFileSync(path.join(stageRoot, 'package.json'))),
      tarball: { sha256: sha256(tarballBytes), sizeBytes: tarballBytes.byteLength },
      createdAtIso: new Date().toISOString(),
    });
    const packReceiptCandidate = path.join(temporaryRoot, 'public-pack-receipt.json');
    writeFileSync(packReceiptCandidate, `${JSON.stringify(packReceipt, null, 2)}\n`, { flag: 'wx' });
    checkpoint('after-pack-receipt', failAt);
    const promotionMetadata = preparePromotion
      ? preparePromotion({
          generatedTarball,
          packReceipt,
          publicReceipt,
          stageMetadata,
          stageRoot,
          temporaryRoot,
        })
      : null;
    const additionalPromotions = promotionMetadata?.files ?? [];
    checkpoint('after-additional-metadata', failAt);
    const sourceManifestAfter = readFileSync(sourceManifestPath);
    if (!sourceManifestBefore.equals(sourceManifestAfter)) {
      throw new Error('source package.json changed during sealed packing');
    }
    promotePackPair({
      tarballCandidate: generatedTarball,
      packReceiptCandidate,
      outputPath,
      packReceiptPath,
      additionalPromotions,
      failAt,
    });

    return { outputPath, packReceiptPath, packReceipt, stageMetadata, promotionMetadata };
  } finally {
    try {
      rmSync(temporaryRoot, { recursive: true, force: true });
    } catch (error) {
      console.warn(`[pack-sealed] could not remove temporary stage ${temporaryRoot}: ${error.message}`);
    }
  }
}

function isCliEntry() {
  return process.argv[1] != null && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isCliEntry()) {
  try {
    const localOnly = process.argv.slice(2).includes('--local-only');
    const npmOnly = process.argv.slice(2).includes('--npm-only');
    if (npmOnly && !localOnly) throw new Error('--npm-only requires --local-only');
    if (process.argv.slice(2).some((arg) => !['--local-only', '--npm-only'].includes(arg))) throw new Error('unknown pack-sealed option');
    const result = packSealedPublicPackage(localOnly ? {
      localOnly,
      npmOnly,
      outputPath: path.join(PACKAGE_ROOT, 'superdoc-internal.tgz'),
      packReceiptPath: path.join(PACKAGE_ROOT, 'build-receipts', 'public-pack-internal-receipt.json'),
    } : {});
    console.log(`[pack-sealed] wrote ${result.outputPath}`);
    console.log(`[pack-sealed] receipt ${result.packReceiptPath} (${result.packReceipt.digest})`);
  } catch (error) {
    console.error(`[pack-sealed] ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
    process.exitCode = 1;
  }
}
