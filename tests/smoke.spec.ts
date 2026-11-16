// One parameterized smoke test per tool: settings visible before any file, axe,
// offline use after the page is ready, no console errors, no cross-origin requests.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

interface ToolInfo {
  slug: string;
  name: string;
  accepts: string[];
  batch: boolean;
}

const tools: ToolInfo[] = JSON.parse(readFileSync('build/tools.json', 'utf8'));
const fixtureFor: Record<string, string> = {
  png: 'sample.png',
  jpeg: 'sample.jpg',
  webp: 'sample.webp',
  avif: 'sample.avif',
  bmp: 'sample.bmp',
  tiff: 'sample.tiff',
  heic: 'sample.heic',
  pdf: 'sample.pdf',
  gif: 'anim.gif',
  video: 'clip.mp4',
  svg: 'sample.svg',
  image: 'sample.png',
};

/** Tools that need one setting before they can run: what to do after the fixture is added. */
const setup: Record<string, (page: Page) => Promise<void>> = {
  'blur-face': (page) => page.getByRole('button', { name: 'Add region' }).click(),
  'redact-image': (page) => page.getByRole('button', { name: 'Add region' }).click(),
  'video-to-gif': (page) => page.locator('video[data-loaded]').waitFor(),
};

test.skip(!!process.env.ANALYTICS_BUILD, 'smoke tests run against the analytics-off build');

function watch(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => m.type() === 'error' && problems.push('console: ' + m.text()));
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('request', (r) => {
    const u = r.url();
    if (u.startsWith('data:') || u.startsWith('blob:')) return;
    if (new URL(u).origin !== 'http://localhost:4173') problems.push('cross-origin request: ' + u);
  });
  return problems;
}

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
  ).toEqual([]);
}

// A page's CSP does not reach a worker, so the checks above only protect the workers if they see worker
// requests. The HEIC worker loads the script it is told to; here it is told to load an address that never
// resolves (`.invalid` is reserved), and the page-level listener has to report it.
test('the network watch also sees requests made from inside a worker', async ({ page }) => {
  const seen: string[] = [];
  page.on('request', (r) => seen.push(r.url()));
  await page.goto('/');
  await page.evaluate(() => {
    const worker = new Worker('/heic-worker.js');
    worker.postMessage({
      cmd: 'init',
      id: 1,
      script: 'https://worker-check.invalid/x.js',
      wasm: '',
    });
  });
  await expect
    .poll(() => seen.some((u) => u.startsWith('https://worker-check.invalid/')))
    .toBe(true);
});

for (const path of ['/', '/privacy/', '/datenschutz/', '/about/', '/llm-info/']) {
  test(`page ${path}`, async ({ page }) => {
    const problems = watch(page);
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    await axe(page);
    expect(problems).toEqual([]);
  });
}

for (const tool of tools) {
  test(`tool ${tool.slug}`, async ({ page, context }) => {
    const problems = watch(page);
    await page.goto(`/${tool.slug}/`);
    await expect(page.getByRole('heading', { level: 1, name: tool.name })).toBeVisible();
    // P19: settings are visible before any file is added. Tools without file input have no Files box.
    if (tool.accepts.length) {
      await expect(page.getByRole('heading', { name: 'Files' })).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: 'Text' })).toBeVisible();
    }
    await axe(page);

    // Once the page is ready, the tool works with the network cut.
    await page.locator('body[data-ready]').waitFor();
    await context.setOffline(true);

    if (tool.accepts.length) {
      const fixture = tool.accepts.map((a) => fixtureFor[a]).find(Boolean);
      expect(fixture, `no fixture for ${tool.slug}; add one to tests/fixtures`).toBeTruthy();
      await page.locator('input[type=file]').setInputFiles(`tests/fixtures/${fixture}`);
    }
    await setup[tool.slug]?.(page);
    // Tools that run on their own (inspectors) have no run button.
    const run = page.locator('button.primary', { hasNotText: /^Download/ });
    if ((await run.count()) && (await run.first().isEnabled())) await run.first().click();
    const save = page.getByRole('button', { name: /^Download/ }).first();
    // Read-only tools (inspectors) have nothing to download; they show their result in the file list.
    const downloadable = await save.waitFor({ timeout: 4000 }).then(
      () => true,
      () => false,
    );
    if (downloadable) {
      const [download] = await Promise.all([page.waitForEvent('download'), save.click()]);
      expect(download.suggestedFilename()).toMatch(/\.\w+$/);
    } else {
      await expect(page.locator('ul.tray li .err')).toHaveCount(0);
      await expect(page.locator('ul.tray li .bar')).toHaveCount(0);
    }
    expect(problems).toEqual([]);
  });
}
