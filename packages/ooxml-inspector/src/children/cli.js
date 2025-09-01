import { childrenOf, allTags, namespaces } from './lookup.js';
import { getAttributes } from './index.js';

// Explicit namespace allowlist for now
// Keeping: w*, a:, pic:, wp:, r:, mc:, cp:, dc:, dcterms:
// Skipping for now: m:, v:, o:, p:, x:, g20:, cdr:, etc.
const ALLOWED_PREFIXES = new Set(['w:', 'a:', 'pic:', 'wp:', 'r:', 'mc:', 'cp:', 'dc:', 'dcterms:']);

export function runChildrenCLI(argv) {
  const sub = argv[0];
  const arg = argv[1];

  switch (sub) {
    case 'children': {
      if (!arg) {
        console.error('Usage: ooxml children <prefix:local>');
        process.exit(2);
      }
      console.log(JSON.stringify(childrenOf(arg), null, 2));
      break;
    }

    case 'tags': {
      const prefix = arg && !arg.startsWith('--') ? arg : null;
      const flags = new Set(argv.slice(prefix ? 2 : 1).filter((a) => a.startsWith('--')));
      const parentsOnly = flags.has('--parents');
      const plain = flags.has('--plain');

      // look for --namespace <ns>
      const nsIndex = argv.findIndex((a) => a === '--namespace');
      const nsPrefix = nsIndex !== -1 ? argv[nsIndex + 1] : null;

      let tags = allTags({ prefix, hasChildren: parentsOnly ? true : null });

      // apply allowlist filter
      tags = tags.filter((t) => {
        for (const p of ALLOWED_PREFIXES) {
          if (t.startsWith(p)) return true;
        }
        return false;
      });

      // apply explicit --namespace filter if given
      if (nsPrefix) {
        tags = tags.filter((t) => t.startsWith(nsPrefix + ':'));
      }

      console.log(plain ? tags.join('\n') : JSON.stringify({ count: tags.length, tags }, null, 2));
      console.log(`Total tags (filtered): ${tags.length}`);
      break;
    }

    case 'namespaces': {
      console.log(JSON.stringify(namespaces(), null, 2));
      break;
    }

    case 'attrs': {
      if (!arg) return usage();
      const attrs = getAttributes(arg);
      if (attrs == null) notFound(arg);
      else {
        const keys = Object.keys(attrs);
        if (!keys.length) {
          console.log('(no attributes)');
          break;
        }
        for (const k of keys) {
          const spec = attrs[k];
          const bits = [];
          if (spec.use) bits.push(`use=${spec.use}`);
          if (spec.type) bits.push(`type=${spec.type}`);
          if (spec.default != null) bits.push(`default=${spec.default}`);
          if (spec.fixed != null) bits.push(`fixed=${spec.fixed}`);
          if (spec.ref) bits.push(`ref=${spec.ref}`);
          console.log(`${k}${bits.length ? '  ' + bits.join(' ') : ''}`);
        }
      }
      break;
    }

    default:
      console.error(
        'Usage:\n  ooxml children <qname>\n  ooxml tags [prefix] [--parents] [--plain]\n  ooxml namespaces',
      );
      process.exit(2);
  }
}

function usage() {
  console.error(
    `Usage:
  ooxml children <qname>       # list allowed children for a tag
  ooxml attrs <qname>          # list allowed attributes for a tag
  ooxml tags                   # list all known tags (QNames)
  ooxml namespaces             # list namespace prefix map
Options:
  -j, --json                   # JSON output`,
  );
  process.exit(2);
}

function notFound(q) {
  console.error(`Unknown element: \${q}\\`);
  process.exit(2);
}
