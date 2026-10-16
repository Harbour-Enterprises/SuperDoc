import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SuperDocClient } from '@superdoc/sdk';

// Text from a heading in the firm's document. Its run has no direct
// formatting, so everything query.match reports for it comes from styles.
const SAMPLE_TEXT = 'Master Services Agreement';

const client = new SuperDocClient({
  user: { name: 'Style guide builder', email: 'styles@example.com' },
  // Allow a slow first start of the document host, for example on a cold server.
  startupTimeoutMs: 30_000,
});

try {
  await client.connect();

  // 1. Extract an editable guide from the firm's document.
  const firm = await client.open({ doc: './firm-document.docx' });
  try {
    const guide = await extractGuide(firm);
    await writeFile('./style-guide.json', JSON.stringify(guide, null, 2));

    // 2. Edit the guide. In an application, a person does this in your UI.
    editGuide(guide);

    // 3. Write the edits back and save the result as a template package.
    await writeGuide(firm, guide);
    await firm.save({ out: './style-guide-template.docx', force: true });
  } finally {
    await firm.close({ discard: true });
  }

  // 4. Preview the template on a draft, then apply it.
  const draft = await client.open({ doc: './draft.docx' });
  try {
    /** @type {{ kind: 'path', path: string }} */
    const source = { kind: 'path', path: path.resolve('./style-guide-template.docx') };

    // The SDK throws when an operation fails, so each result here is a success.
    const preview = await draft.templates.apply({ source, dryRun: true });
    console.log('Would apply:', preview.appliedScopes.map((entry) => entry.scope));
    console.log('Skipped:', preview.skippedScopes);
    console.log('Never applied:', preview.unsupportedItems);
    console.log('Warnings:', preview.warnings);

    await draft.templates.apply({ source });
    await draft.save({ out: './draft.styled.docx', force: true });
  } finally {
    await draft.close({ discard: true });
  }
} finally {
  await client.dispose();
}

/**
 * Read the theme, document defaults, every paragraph and character style, and
 * the effective formatting of one sample run.
 *
 * @param {any} doc
 */
async function extractGuide(doc) {
  const { theme } = await doc.styles.getTheme({});
  if (theme.source === 'fallback') {
    console.warn('The document has no usable theme. Theme values are the Office defaults.');
  }

  // `props` and `runProps` keep theme references raw. `resolved` and
  // `resolvedRun` follow basedOn, document defaults, and the theme.
  // Provenance says which layer each resolved value came from.
  const model = await doc.get({ options: { includeResolved: true, includeProvenance: true } });
  const catalog = await doc.styles.getCatalog({ includePreview: true });

  const styles = [];
  for (const item of catalog.styles) {
    const paragraphStyle = model.styles?.paragraph?.[item.id];
    const characterStyle = model.styles?.character?.[item.id];
    if (!paragraphStyle && !characterStyle) continue;

    styles.push({
      id: item.id,
      name: item.name,
      type: paragraphStyle ? 'paragraph' : 'character',
      basedOn: item.basedOn,
      next: item.next,
      metadata: {
        aliases: item.aliases,
        locked: item.locked,
        custom: item.custom,
        priority: item.priority,
        qFormat: item.qFormat,
        hidden: item.hidden,
        semiHidden: item.semiHidden,
        unhideWhenUsed: item.unhideWhenUsed,
      },
      // styles.create cannot redefine half of a linked pair, such as Heading 1.
      editable: item.link === null,
      authored: paragraphStyle
        ? { paragraph: paragraphStyle.props, run: paragraphStyle.runProps }
        : { run: characterStyle.props },
      resolved: paragraphStyle
        ? { paragraph: paragraphStyle.resolved, run: paragraphStyle.resolvedRun }
        : { run: characterStyle.resolved },
      provenance: paragraphStyle
        ? { paragraph: paragraphStyle.provenance, run: paragraphStyle.runProvenance }
        : { run: characterStyle.provenance },
      // CSS-ready values with their origin: `theme` or `literal`.
      preview: item.preview?.css,
      previewSources: item.preview?.sources,
    });
  }

  const match = await doc.query.match({
    select: { type: 'text', pattern: SAMPLE_TEXT },
    require: 'first',
  });
  const sample = match.items[0];
  const sampleRun = sample?.matchKind === 'text' ? sample.blocks[0]?.runs[0] : undefined;

  return {
    theme: {
      source: theme.source,
      colors: theme.colorScheme,
      fonts: theme.fontScheme,
      colorMapping: theme.colorSchemeMapping,
    },
    defaults: {
      run: model.docDefaults?.run,
      paragraph: model.docDefaults?.paragraph,
      resolvedRun: model.docDefaults?.resolvedRun,
    },
    styles,
    sample: sampleRun
      ? { text: SAMPLE_TEXT, styleId: sampleRun.styleId, effective: sampleRun.styles.effective }
      : null,
  };
}

/**
 * Stand-in for a person editing the guide.
 *
 * @param {any} guide
 */
function editGuide(guide) {
  // Body text: 12 pt instead of the firm's default.
  guide.defaults.run = { ...guide.defaults.run, fontSize: 12 };
  guide.defaults.changed = true;

  // Clause references: the primary accent color instead of a shaded secondary accent.
  const clause = guide.styles.find((/** @type {any} */ style) => style.id === 'ClauseRef');
  if (clause?.editable) {
    clause.authored.run = { ...clause.authored.run, color: { model: 'theme', theme: 'accent1' } };
    clause.changed = true;
  }

  // A new paragraph style for quoted language.
  guide.styles.push({
    id: 'GuideQuote',
    name: 'Guide Quote',
    type: 'paragraph',
    basedOn: 'Normal',
    next: null,
    metadata: { custom: true, qFormat: true },
    editable: true,
    authored: {
      paragraph: { spacing: { before: 6, after: 6 } },
      run: { italic: true, color: { model: 'theme', theme: 'accent2' } },
    },
    changed: true,
  });
}

/**
 * Write changed guide entries back to the open document.
 *
 * @param {any} doc
 * @param {any} guide
 */
async function writeGuide(doc, guide) {
  if (guide.defaults.changed) {
    await doc.styles.apply({
      target: { scope: 'docDefaults', channel: 'run' },
      patch: { fontSize: toHalfPoints(guide.defaults.run.fontSize) },
    });
  }

  for (const style of guide.styles) {
    if (!style.changed) continue;
    if (!style.editable) {
      console.warn(`Skipped ${style.id}: linked styles cannot be redefined yet.`);
      continue;
    }

    // styles.create replaces the whole definition, so send every property to keep.
    await doc.styles.create({
      id: style.id,
      name: style.name,
      type: style.type,
      basedOn: style.basedOn,
      ...(style.type === 'paragraph' ? { next: style.next } : {}),
      ...withoutNulls(style.metadata),
      ...(style.type === 'paragraph' ? { paragraph: toParagraphPatch(style.authored.paragraph) } : {}),
      run: toRunPatch(style.authored.run),
      conflictPolicy: 'replace',
    });
  }
}

// Reads report points and SDColorRef values. Style writes take the units
// Word stores: half-points for font size, twentieths of a point for spacing,
// and hex strings for theme tint and shade.

/** @param {any} run */
function toRunPatch(run = {}) {
  /** @type {Record<string, unknown>} */
  const patch = {};
  for (const [key, value] of Object.entries(run)) {
    if (key === 'bold' || key === 'italic') patch[key] = value;
    else if (key === 'fontSize') patch.fontSize = toHalfPoints(value);
    else if (key === 'color') patch.color = toColorPatch(value);
    else if (key === 'fontFamily') patch.fontFamily = { ascii: value, hAnsi: value };
    else if (key === 'fonts') patch.fontFamily = toFontPatch(value);
    else throw new Error(`This example does not write run property "${key}".`);
  }
  return patch;
}

/** @param {any} paragraph */
function toParagraphPatch(paragraph = {}) {
  /** @type {Record<string, unknown>} */
  const patch = {};
  for (const [key, value] of Object.entries(paragraph)) {
    if (key === 'keepWithNext') patch.keepNext = value;
    else if (key === 'spacing') {
      const { before, after, ...rest } = value;
      if (Object.keys(rest).length > 0) throw new Error('This example writes spacing before and after only.');
      patch.spacing = withoutNulls({ before: toTwips(before), after: toTwips(after) });
    } else throw new Error(`This example does not write paragraph property "${key}".`);
  }
  return patch;
}

/** @param {any} color */
function toColorPatch(color) {
  if (color.model === 'rgb') return { val: color.value };
  if (color.model === 'auto') return { val: 'auto' };
  return withoutNulls({
    themeColor: color.theme,
    themeTint: toHexByte(color.tint),
    themeShade: toHexByte(color.shade),
  });
}

/** @param {any} fonts */
function toFontPatch(fonts) {
  const { csTheme, ...rest } = fonts;
  return withoutNulls({ ...rest, cstheme: csTheme });
}

/** @param {number} points */
function toHalfPoints(points) {
  return Math.round(points * 2);
}

/** @param {number | undefined} points */
function toTwips(points) {
  return points === undefined ? undefined : Math.round(points * 20);
}

/** @param {number | undefined} byte */
function toHexByte(byte) {
  return byte === undefined ? undefined : byte.toString(16).toUpperCase().padStart(2, '0');
}

/** @param {Record<string, unknown>} value */
function withoutNulls(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null));
}
