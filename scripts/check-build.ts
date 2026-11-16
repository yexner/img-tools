// Post-build checks: budgets, CSP meta tag on every page, LGPL separation, .nojekyll.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { scanSource } from './source-scan.ts';

const OUT = 'build';
const KB = 1000;
const LIMITS = {
  homeJs: 100 * KB,
  toolJs: 60 * KB,
  css: 25 * KB,
  fonts: 160 * KB,
  site: 100 * 1000 * KB,
};

const problems: string[] = [];
const fail = (m: string) => problems.push(m);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const gz = (file: string) => gzipSync(readFileSync(file), { level: 9 }).length;

/** Scripts a page loads: modulepreload links plus the dynamic imports in its bootstrap. */
function scriptsOf(htmlPath: string): string[] {
  const html = readFileSync(htmlPath, 'utf8');
  const refs = new Set<string>();
  for (const m of html.matchAll(/<link href="([^"]+\.js)" rel="modulepreload"/g)) refs.add(m[1]);
  for (const m of html.matchAll(/import\("([^"]+\.js)"\)/g)) refs.add(m[1]);
  return [...refs].map((r) => resolve(dirname(htmlPath), r));
}
const sum = (files: Iterable<string>, f = gz) => [...files].reduce((s, x) => s + f(x), 0);

if (!existsSync(OUT)) {
  console.error('No build folder. Run `vite build` first.');
  process.exit(1);
}
const files = walk(OUT);
const pages = files.filter((f) => f.endsWith('.html') && !f.endsWith('404.html'));

// Home page JS and each tool's own JS (everything beyond the home page's set).
const home = new Set(scriptsOf(join(OUT, 'index.html')));
const homeJs = sum(home);
if (homeJs > LIMITS.homeJs)
  fail(`Home page JS is ${(homeJs / KB).toFixed(1)} KB gzipped (limit ${LIMITS.homeJs / KB}).`);
const report: string[] = [`home JS ${(homeJs / KB).toFixed(1)} KB gz`];
let worstTool = { name: '', size: 0 };
interface ManifestEntry {
  file: string;
  imports?: string[];
}
const manifestPath = '.svelte-kit/output/client/.vite/manifest.json';
const manifest: Record<string, ManifestEntry> = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : {};
function closure(key: string, seen = new Set<string>()): Set<string> {
  const entry = manifest[key];
  if (!entry || seen.has(key)) return seen;
  seen.add(key);
  for (const dep of entry.imports ?? []) closure(dep, seen);
  return seen;
}
for (const key of Object.keys(manifest)) {
  const slug = key.match(/^src\/tools\/([^/]+)\/Tool\.svelte$/)?.[1];
  if (!slug) continue;
  const own = [...closure(key)]
    .map((k) => resolve(OUT, manifest[k].file))
    .filter((f) => !home.has(f));
  const size = sum(own);
  if (size > worstTool.size) worstTool = { name: slug, size };
  if (size > LIMITS.toolJs) {
    fail(`${slug}: own JS is ${(size / KB).toFixed(1)} KB gzipped (limit ${LIMITS.toolJs / KB}).`);
  }
}
report.push(`largest tool JS ${(worstTool.size / KB).toFixed(1)} KB gz (${worstTool.name})`);

// CSS and fonts.
const homeHtml = readFileSync(join(OUT, 'index.html'), 'utf8');
const css = [...homeHtml.matchAll(/href="([^"]+\.css)"/g)].map((m) => resolve(OUT, m[1]));
const cssSize = sum(css);
if (cssSize > LIMITS.css)
  fail(`Global CSS is ${(cssSize / KB).toFixed(1)} KB gzipped (limit ${LIMITS.css / KB}).`);
const fonts = sum(
  files.filter((f) => f.endsWith('.woff2')),
  (f) => statSync(f).size,
);
if (fonts > LIMITS.fonts)
  fail(`Fonts are ${(fonts / KB).toFixed(0)} KB (limit ${LIMITS.fonts / KB}).`);
report.push(`CSS ${(cssSize / KB).toFixed(1)} KB gz`, `fonts ${(fonts / KB).toFixed(0)} KB`);

const total = sum(files, (f) => statSync(f).size);
if (total > LIMITS.site) fail(`The build is ${(total / 1e6).toFixed(1)} MB (limit 100 MB).`);
report.push(`site ${(total / 1e6).toFixed(1)} MB`);

// CSP meta tag on every page; a build without analytics names no foreign origin.
const analyticsOn = Boolean(
  process.env.PUBLIC_UMAMI_WEBSITE_ID && process.env.PUBLIC_UMAMI_HOST_URL,
);
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const csp = html.match(/http-equiv="content-security-policy" content="([^"]+)"/)?.[1];
  if (!csp) fail(`${page}: no Content-Security-Policy meta tag.`);
  else if (!analyticsOn && /https?:\/\//.test(csp))
    fail(`${page}: the CSP names a foreign origin in a build without analytics.`);
}

if (!existsSync(join(OUT, '.nojekyll'))) fail('build/.nojekyll is missing.');

// The privacy notice still has the e-recht24 sample controller (a warning, not a failure).
const notice = join(OUT, 'datenschutz', 'index.html');
if (existsSync(notice) && readFileSync(notice, 'utf8').includes('Beispielfirma'))
  console.warn(
    'WARNING: /datenschutz/ still names the sample controller "Beispielfirma"; replace it in src/routes/datenschutz/e-recht24.html.',
  );

// The site's license notices (the LGPL notice requirement): the published text must name the LGPL component.
const notices = join(OUT, 'third-party-notices.txt');
if (!existsSync(notices) || !readFileSync(notices, 'utf8').includes('libheif-js'))
  fail('build/third-party-notices.txt is missing or does not list libheif-js');

// LGPL separation: when the HEIC decoder is bundled it must be the npm file, unmodified.
const heicNpm = 'node_modules/libheif-js/libheif-wasm/libheif.js';
const emitted = files.filter((f) => /libheif/i.test(f) && f.endsWith('.js'));
if (emitted.length) {
  const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
  if (!existsSync(heicNpm) || !emitted.some((f) => sha(f) === sha(heicNpm))) {
    fail('The emitted libheif file is not byte-identical to the npm file');
  }
  for (const f of files.filter(
    (x) => x.endsWith('.js') && !emitted.includes(x) && !x.endsWith('heic-worker.js'),
  )) {
    if (readFileSync(f, 'utf8').includes('HeifDecoder'))
      fail(`${f}: contains libheif code; it must stay a separate file.`);
  }
}

// Sitemap and robots.txt: the sitemap is a file at build/sitemap.xml and lists every tool.
const sitemap = join(OUT, 'sitemap.xml');
if (!existsSync(sitemap)) fail('build/sitemap.xml is missing.');
else {
  const xml = readFileSync(sitemap, 'utf8');
  const toolsJson: { slug: string }[] = JSON.parse(readFileSync(join(OUT, 'tools.json'), 'utf8'));
  for (const { slug } of toolsJson)
    if (!xml.includes(`<loc>https://img-tools.fyi/${slug}/</loc>`))
      fail(`build/sitemap.xml does not list ${slug}.`);
}
const robots = join(OUT, 'robots.txt');
if (
  !existsSync(robots) ||
  !readFileSync(robots, 'utf8').includes('Sitemap: https://img-tools.fyi/sitemap.xml')
)
  fail('build/robots.txt does not name the sitemap.');

// Source rules.
problems.push(...scanSource());

// Codec assets are reported, not limited.
const big = files
  .filter((f) => statSync(f).size > 200 * KB)
  .map((f) => `${relative(OUT, f)} ${(gz(f) / KB).toFixed(0)} KB gz`);
console.log('Build report: ' + report.join(' · '));
if (big.length) console.log('Large assets:\n  ' + big.join('\n  '));

if (problems.length) {
  console.error('\nBuild checks failed:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('Build checks OK.');
