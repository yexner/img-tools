// The site is written in US English: most searches use US
// spellings such as "color picker". This guard fails when a British spelling creeps into text that a visitor
// can read. Code that must match a third-party name (oxipng's `optimise`) is not scanned: only UI files are.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..', '..');

const BRITISH =
  /colour|neighbour|honour|favour|\bcent(?:re|res|red|ring)\b|\bgrey|optimis|minimis|maximis|normalis|summaris|recognis|customis|organis|analys(?:e|ed|es|ing)\b|behaviour|favourite|licence|catalogue|metre|programme|\bwhilst\b|\bamongst\b|\blearnt\b|\bcancell|\blabell/i;

// Not spellings: an HTML attribute and an internal error code.
const KEEP = /aria-labelledby|'cancelled'/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'datenschutz') walk(p, out); // the German notice is not English
    } else out.push(p);
  }
  return out;
}

/** Files whose text a visitor can read: tool names, help, UI, pages, data labels, static text. */
function uiFiles(): string[] {
  const src = walk(join(ROOT, 'src')).filter(
    (f) =>
      /[\\/]src[\\/](tools[\\/][^\\/]+[\\/](meta|help)\.ts|routes[\\/].*\.svelte|lib[\\/](data|ui|shell|families)[\\/][^.]*\.(ts|svelte))$/.test(
        f,
      ) && !f.endsWith('.test.ts'),
  );
  const toolUi = walk(join(ROOT, 'src', 'tools')).filter((f) => f.endsWith('.svelte'));
  const extra = ['band.ts', 'categories.ts'].map((f) => join(ROOT, 'src', 'lib', f));
  const stat = ['llms.txt', 'robots.txt', '404.html'].map((f) => join(ROOT, 'static', f));
  return [...new Set([...src, ...toolUi, ...extra, ...stat])];
}

describe('US English', () => {
  it('scans a sensible set of files', () => {
    expect(uiFiles().length).toBeGreaterThan(100);
  });

  it('keeps British spellings out of UI strings (the site uses US English)', () => {
    const hits: string[] = [];
    for (const f of uiFiles()) {
      readFileSync(f, 'utf8')
        .replace(KEEP, '')
        .split('\n')
        .forEach((line, i) => {
          if (BRITISH.test(line)) hits.push(`${f.slice(ROOT.length + 1)}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(hits, 'use US English (color, optimize, gray, center, favorite, license)').toEqual([]);
  });

  it('sets the document language to en-US', () => {
    expect(readFileSync(join(ROOT, 'src', 'app.html'), 'utf8')).toContain('lang="en-US"');
  });
});

describe('search copy', async () => {
  const { tools } = await import('./registry');
  const withSeo = tools.filter((t) => t.seoTitle || t.seoDescription || t.intro);

  it('keeps titles, descriptions and intros within their limits', () => {
    expect(withSeo.length).toBeGreaterThan(0);
    for (const t of withSeo) {
      if (t.seoTitle) {
        expect(t.seoTitle.length, `${t.slug} seoTitle`).toBeLessThanOrEqual(60);
        expect(t.seoTitle.endsWith('| IMG-TOOLS'), `${t.slug} seoTitle brand`).toBe(true);
      }
      if (t.seoDescription)
        expect(t.seoDescription.length, `${t.slug} seoDescription`).toBeLessThanOrEqual(155);
      if (t.intro) {
        expect(t.intro.trim().length, `${t.slug} intro`).toBeGreaterThan(0);
        expect(t.intro.length, `${t.slug} intro`).toBeLessThan(400);
      }
    }
  });

  it('has no duplicate titles or descriptions and no exclamation marks', () => {
    const titles = withSeo.flatMap((t) => (t.seoTitle ? [t.seoTitle] : []));
    const descs = withSeo.flatMap((t) => (t.seoDescription ? [t.seoDescription] : []));
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descs).size).toBe(descs.length);
    for (const t of withSeo)
      expect([t.seoTitle, t.seoDescription, t.intro].join(' '), t.slug).not.toContain('!');
  });
});
