// WCAG 2.1 A and AA audit with axe on every page and every tool, empty and with a file added.
// The smoke spec only fails on serious problems; this one fails on any.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

test.skip(!!process.env.ANALYTICS_BUILD, 'runs against the analytics-off build');

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const tools: { slug: string; accepts: string[] }[] = JSON.parse(
  readFileSync('build/tools.json', 'utf8'),
);
const fixture: Record<string, string> = {
  jpeg: 'sample.jpg',
  png: 'sample.png',
  webp: 'sample.webp',
  avif: 'sample.avif',
  gif: 'anim.gif',
  bmp: 'sample.bmp',
  tiff: 'sample.tiff',
  heic: 'sample.heic',
  svg: 'sample.svg',
  pdf: 'sample.pdf',
  video: 'clip.mp4',
  image: 'sample.png',
};

async function violations(page: import('@playwright/test').Page, theme: 'light' | 'dark') {
  await page.emulateMedia({ colorScheme: theme });
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 3)
        .join(' | ')}`,
  );
}

for (const path of ['/', '/privacy/', '/datenschutz/', '/about/', '/llm-info/']) {
  for (const theme of ['light', 'dark'] as const) {
    test(`a11y ${path} ${theme}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(await violations(page, theme)).toEqual([]);
    });
  }
}

for (const tool of tools) {
  for (const theme of ['light', 'dark'] as const) {
    test(`a11y tool ${tool.slug} ${theme}`, async ({ page }) => {
      await page.goto(`/${tool.slug}/`);
      await page.locator('body[data-ready]').waitFor();
      expect(await violations(page, theme), 'empty').toEqual([]);
      const name = tool.accepts.map((a) => fixture[a]).find(Boolean);
      if (!name) return;
      await page.locator('input[type=file]').setInputFiles(`tests/fixtures/${name}`);
      await page.waitForTimeout(600);
      expect(await violations(page, theme), 'with a file').toEqual([]);
    });
  }
}
