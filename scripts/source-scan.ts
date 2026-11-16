// Rules: no network API, no navigation and no HTML or code injection outside an explicit allow-list.
// Workers are not covered by the page's CSP on GitHub Pages (a <meta> policy does not reach them and Pages
// sends no headers), so this scan is the main guard that source code cannot talk to the network from a
// worker. It is a pattern check, not a sandbox: it reads whole files (so a line break does not hide a call),
// bans computed access to the global objects, and accepts a dynamic import only with a local string literal.
// Reviewers still have to read every change to a worker or a codec. The e2e tests add a runtime check.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

interface Rule {
  name: string;
  /** Matched against the whole file. */
  pattern: RegExp;
  /** Path prefixes or exact paths where the pattern is allowed. */
  allow: string[];
}

// Words that name a network API: any use is flagged, so `const f = fetch` and `fetch\n(url)` do not slip by.
const word = (name: string, allow: string[] = []): Rule => ({
  name,
  pattern: new RegExp(`\\b${name}\\b`),
  allow,
});

// Objects that hold the network APIs. Reaching into them with a computed key (`self['fet' + 'ch']`) is how a
// pattern check is avoided, so it is not allowed at all.
const GLOBALS = 'self|globalThis|window|navigator|document|top|parent|frames|opener';

// A dynamic import must name a local file or package as a plain string. Anything else (a variable, a
// template, a URL) is flagged.
const LOCAL_IMPORT = `(['"])(?!https?:|//|data:|blob:|javascript:)[^'"\\n]*\\1\\s*[,)]`;

export const rules: Rule[] = [
  word('fetch', ['src/lib/codecs/']),
  word('XMLHttpRequest'),
  word('WebSocket'),
  word('EventSource'),
  word('sendBeacon'),
  { name: 'eval()', pattern: /\beval\s*\(/, allow: [] },
  { name: 'new Function()', pattern: /\bnew\s+Function\s*\(/, allow: [] },
  {
    name: 'innerHTML/outerHTML',
    pattern: /\b(inner|outer)HTML\b|insertAdjacentHTML|document\.write\s*\(/,
    allow: [],
  },
  {
    name: '{@html}',
    pattern: /\{@html\b/,
    // Seo.svelte writes JSON-LD (escaped so it cannot close its script tag); it is not executable.
    allow: [
      'src/lib/ui/Icon.svelte',
      'src/lib/shell/Seo.svelte',
      'src/routes/datenschutz/+page.svelte',
    ],
  },
  {
    name: 'importScripts()',
    pattern: /\bimportScripts\b/,
    allow: ['src/lib/codecs/', 'static/heic-worker.js'],
  },
  {
    name: 'computed access to a global object',
    pattern: new RegExp(`\\b(${GLOBALS})\\s*(\\?\\.)?\\s*\\[`),
    allow: [],
  },
  {
    name: 'import() of anything but a local string',
    pattern: new RegExp(`\\bimport\\s*\\((?!\\s*${LOCAL_IMPORT})`),
    allow: [],
  },
  {
    name: 'import of a URL',
    pattern: /\bfrom\s*['"](https?:|\/\/|data:|blob:)|^\s*import\s*['"](https?:|\/\/|data:|blob:)/m,
    allow: [],
  },
  {
    name: 'new Worker()',
    pattern: /\bnew\s+Worker\b/,
    // Each of these starts a worker from a file in the build, never from a blob or a URL given at run time.
    allow: [
      'src/lib/codecs/heic.ts',
      'src/lib/codecs/pdfjs.ts',
      'src/lib/core/gifjob.ts',
      'src/lib/core/pool.ts',
    ],
  },
  { name: 'SharedWorker', pattern: /\bSharedWorker\b/, allow: [] },
  { name: 'service worker', pattern: /\bserviceWorker\b/, allow: [] },
  // The CSP does not stop navigation, so a script could send data in a URL.
  {
    name: 'window.open()',
    pattern: /\bwindow\s*\.\s*open\s*\(|\bopen\s*\(\s*['"]https?:/,
    allow: [],
  },
  {
    name: 'changing location',
    pattern: /\blocation\s*(\.\s*(href|assign|replace)\b|=(?!=))/,
    allow: [],
  },
  { name: 'meta refresh', pattern: /http-equiv\s*=\s*['"]?refresh/i, allow: [] },
  { name: 'ping attribute', pattern: /<a\b[^>]*\sping\s*=/i, allow: [] },
];

export interface Source {
  path: string;
  text: string;
}

export function scan(files: Source[]): string[] {
  const found: string[] = [];
  for (const f of files) {
    if (/\.test\.ts$/.test(f.path)) continue;
    for (const rule of rules) {
      if (rule.allow.some((a) => f.path === a || f.path.startsWith(a))) continue;
      for (const m of f.text.matchAll(new RegExp(rule.pattern.source, `g${rule.pattern.flags}`))) {
        const line = f.text.slice(0, m.index).split('\n').length;
        found.push(`${f.path}:${line}: ${rule.name} is not allowed here`);
      }
    }
  }
  return found;
}

function walk(dir: string, out: Source[]) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|svelte|js|mjs|cjs|html)$/.test(name)) {
      out.push({ path, text: readFileSync(path, 'utf8') });
    }
  }
}

/** Scans our own source and the hand-written files in `static/`; never `node_modules`. */
export function scanSource(roots = ['src', 'static']): string[] {
  const files: Source[] = [];
  for (const root of roots) walk(root, files);
  return scan(files);
}

if (process.argv[1]?.endsWith('source-scan.ts')) {
  const problems = scanSource();
  if (problems.length) {
    console.error('Source scan failed:\n  ' + problems.join('\n  '));
    process.exit(1);
  }
  console.log('Source scan OK.');
}
