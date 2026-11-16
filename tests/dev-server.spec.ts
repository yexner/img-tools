// Opens every tool on the development server (`npx vite dev --port 5174`) with a file added, and fails on any
// console error or failed request. The production build hides some Svelte errors that `vite dev` shows,
// such as changing state inside a template, and `vite dev` renders pages on the server, which a build does not.
// Run: DEV_URL=http://localhost:5174 npx playwright test tests/dev-server.spec.ts
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { addFiles } from './helpers/run';
test.skip(!process.env.DEV_URL, 'needs a running development server (DEV_URL)');
test.use({ baseURL: process.env.DEV_URL });
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
for (const t of tools) {
  test(t.slug, async ({ page }) => {
    const errors: string[] = [];
    page.on(
      'console',
      (m) => m.type() === 'error' && errors.push(m.text().split('\n').slice(0, 2).join(' ')),
    );
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('response', (r) => r.status() >= 400 && errors.push(r.status() + ' ' + r.url()));
    await page.goto(`/${t.slug}/`);
    await page.waitForTimeout(1200);
    const name = t.accepts.map((a) => fixture[a]).find(Boolean);
    if (name) {
      await addFiles(page, `tests/fixtures/${name}`);
      await page.waitForTimeout(1200);
      const run = page.locator('button.primary', { hasNotText: /^Download/ }).first();
      if ((await run.count()) && (await run.isEnabled())) await run.click();
      await page.waitForTimeout(1200);
    }
    expect(errors).toEqual([]);
  });
}
