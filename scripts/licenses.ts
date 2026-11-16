// Allow-list check for production dependencies and generation of
// THIRD_PARTY_NOTICES.md and its copy static/third-party-notices.txt, which the site's footer links to.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ALLOWED = new Set([
  'MIT',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  'Zlib',
  '0BSD',
  'Unlicense',
  'CC0-1.0',
  'OFL-1.1',
]);
/** Licenses allowed for named packages only. */
const EXCEPTIONS: Record<string, string[]> = {
  'MPL-2.0': ['mediabunny'],
  'LGPL-3.0': ['libheif-js'],
  'LGPL-3.0-only': ['libheif-js'],
  'LGPL-3.0-or-later': ['libheif-js'],
};

interface Node {
  name?: string;
  version?: string;
  path?: string;
  license?: unknown;
  repository?: unknown;
  dependencies?: Record<string, Node>;
}
export interface Entry {
  name: string;
  version: string;
  license: string;
  repository?: string;
  text: string;
}

function licenseOf(node: Node): string {
  const l = node.license;
  if (typeof l === 'string') return l;
  if (l && typeof l === 'object' && 'type' in l) return String((l as { type: unknown }).type);
  return 'UNKNOWN';
}

/** An expression is allowed if one OR-alternative has every AND-part allowed for this package. */
export function isAllowed(expression: string, pkg: string): boolean {
  const alternatives = expression.replace(/[()]/g, '').split(/\s+OR\s+/i);
  return alternatives.some((alt) =>
    alt.split(/\s+AND\s+/i).every((part) => {
      const id = part.trim();
      return ALLOWED.has(id) || EXCEPTIONS[id]?.includes(pkg);
    }),
  );
}

function collect(node: Node, out: Map<string, Node>) {
  for (const dep of Object.values(node.dependencies ?? {})) {
    if (dep.name && dep.version && dep.path) out.set(`${dep.name}@${dep.version}`, dep);
    collect(dep, out);
  }
}

/**
 * Platform-specific native binaries (lockfile entries with "os" or "cpu", e.g. the optional
 * @napi-rs/canvas-<platform> packages of pdfjs-dist). npm installs only the variant for the host,
 * so listing what is installed made the notices differ between macOS and Linux. They are Node-only,
 * never part of the browser build, so they are left out of the notices on every host. Their
 * licenses come from the lockfile (which lists every variant) and are still checked here.
 */
function platformPackages(): { name: string; license: string }[] {
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as {
    packages?: Record<string, { os?: unknown; cpu?: unknown; dev?: boolean; license?: unknown }>;
  };
  return Object.entries(lock.packages ?? {})
    .filter(([key, p]) => key && !p.dev && (p.os || p.cpu))
    .map(([key, p]) => ({
      name: key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length),
      license: licenseOf(p as Node),
    }));
}

function textOf(dir: string): string {
  const files = readdirSync(dir).filter((f) => /^(licen[sc]e|notice|copying)/i.test(f));
  // pdfjs-dist ships extra WASM decoders, each with its own license file.
  const wasm = join(dir, 'wasm');
  const extra = existsSync(wasm)
    ? readdirSync(wasm)
        .filter((f) => /^licen[sc]e/i.test(f))
        .map((f) => join('wasm', f))
    : [];
  return [...files, ...extra]
    .map((f) => `--- ${f} ---\n${readFileSync(join(dir, f), 'utf8').trim()}`)
    .join('\n\n');
}

function repoOf(node: Node): string | undefined {
  const r = node.repository;
  const url =
    typeof r === 'string'
      ? r
      : r && typeof r === 'object' && 'url' in r
        ? String((r as { url: unknown }).url)
        : '';
  const clean = url
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^ssh:\/\/git@/, 'https://');
  return /^https:\/\//.test(clean) ? clean : undefined;
}

function main() {
  let raw: string;
  try {
    raw = execFileSync('npm', ['ls', '--omit=dev', '--all', '--long', '--json'], {
      maxBuffer: 1 << 28,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
  } catch (e) {
    raw = (e as { stdout?: Buffer }).stdout?.toString() ?? '';
  }
  const nodes = new Map<string, Node>();
  collect(JSON.parse(raw), nodes);

  const problems: string[] = [];
  const platform = platformPackages();
  for (const p of platform)
    if (!isAllowed(p.license, p.name)) problems.push(`${p.name} (lockfile): ${p.license}`);
  const skip = new Set(platform.map((p) => p.name));
  for (const [key, node] of nodes) if (skip.has(node.name!)) nodes.delete(key);
  const entries: Entry[] = [];
  for (const node of [...nodes.values()].sort((a, b) => a.name!.localeCompare(b.name!))) {
    const license = licenseOf(node);
    if (!isAllowed(license, node.name!)) problems.push(`${node.name}@${node.version}: ${license}`);
    entries.push({
      name: node.name!,
      version: node.version!,
      license,
      repository: repoOf(node),
      text: textOf(node.path!) || `License: ${license}. The package does not ship a license file.`,
    });
  }
  if (problems.length) {
    console.error(
      'Dependencies with licenses outside the allow-list (see ALLOWED in scripts/licenses.ts):\n  ' +
        problems.join('\n  '),
    );
    process.exit(1);
  }

  // Identical texts (the many bare MIT or Apache files) are stored once and shared.
  const texts = [...new Set(entries.map((e) => e.text))];
  const copyleft = entries
    .filter((e) => /^(LGPL|MPL)/.test(e.license))
    .map((e) => {
      const kind = e.license.startsWith('LGPL')
        ? 'It is used unmodified and served as its own file, loaded by a separate worker, so you can replace it with your own build of the library.'
        : 'It is used unmodified.';
      return `- **${e.name} ${e.version}** (${e.license}). ${kind} Source: ${e.repository ?? 'see the package'}; the exact published package is https://registry.npmjs.org/${e.name}/-/${e.name}-${e.version}.tgz`;
    });
  const notices =
    '# Third-party notices\n\n' +
    'Generated by `scripts/licenses.ts`. Do not edit by hand. IMG-TOOLS itself is MIT-licensed (see `LICENSE`).\n\n' +
    (copyleft.length
      ? `## Components under LGPL and MPL licenses\n\n${copyleft.join('\n')}\n\n`
      : '') +
    texts
      .map((text) => {
        const group = entries.filter((e) => e.text === text);
        const heading = group.map((e) => `${e.name} ${e.version}`).join(', ');
        const details = group
          .map((e) => `${e.name}: ${e.license}${e.repository ? `, source ${e.repository}` : ''}`)
          .join('\n');
        return `## ${heading}\n\n${details}\n\n\`\`\`text\n${text}\n\`\`\`\n`;
      })
      .join('\n');
  writeFileSync('THIRD_PARTY_NOTICES.md', notices);
  // The site links to this copy (a plain text file, so every browser shows it instead of downloading it).
  writeFileSync('static/third-party-notices.txt', notices);
  console.log(`Licenses OK: ${entries.length} production dependencies.`);
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split('/').pop()!) &&
  existsSync('package.json')
)
  main();
