// Runs against a build with a fake Umami host. The host's script.js is replaced by a stub:
//   PUBLIC_UMAMI_WEBSITE_ID=test PUBLIC_UMAMI_HOST_URL=https://umami.invalid PUBLIC_UMAMI_DOMAINS=localhost \
//   npm run build && ANALYTICS_BUILD=1 npx playwright test analytics
import { expect, test, type Page } from '@playwright/test';
import { openTool, addFiles } from './helpers/run';

test.skip(
  !process.env.ANALYTICS_BUILD || Boolean(process.env.ANALYTICS_OPT_IN),
  'needs the analytics-on (opt-out) build; the opt-in build is covered by analytics-opt-in.spec.ts',
);

const ALLOWED_DATA = new Set([
  'files',
  'input',
  'output',
  'preset',
  'quality',
  'ms',
  'reason',
  'browser',
]);
const ALLOWED_PAYLOAD = new Set([
  'website',
  'hostname',
  'url',
  'title',
  'language',
  'referrer',
  'name',
  'data',
]);

// Stands in for Umami's script: it records what the site hands to umami.track(), as Umami would send it.
const FAKE_SCRIPT = `window.umami = { track: function (name, data) {
  var payload = { website: 'test', hostname: location.hostname, url: location.pathname,
    title: document.title, language: navigator.language, referrer: '' };
  if (name) { payload.name = name; if (data) payload.data = data; }
  fetch('https://umami.invalid/api/send', { method: 'POST', body: JSON.stringify({ type: 'event', payload: payload }) });
} };`;

let scriptRequests = 0;

function capture(page: Page) {
  scriptRequests = 0;
  const bodies: Record<string, unknown>[] = [];
  void page.route('https://umami.invalid/script.js', (route) => {
    scriptRequests++;
    return route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_SCRIPT });
  });
  void page.route('https://umami.invalid/api/send', async (route) => {
    bodies.push(JSON.parse(route.request().postData() ?? '{}'));
    await route.fulfill({
      status: 200,
      body: '{}',
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  return bodies;
}

test('page view and tool events use only allowed fields', async ({ page }) => {
  const bodies = capture(page);
  await openTool(page, 'convert-image');
  await addFiles(page, 'tests/fixtures/sample.png');
  await page.locator('button.primary').first().click();
  await expect(page.getByRole('button', { name: /^Download/ }).first()).toBeVisible();
  await expect.poll(() => bodies.length).toBeGreaterThanOrEqual(3);

  const names = bodies.map((b) => (b.payload as { name?: string }).name);
  expect(names).toContain(undefined); // page view
  expect(names).toContain('convert-image:upload');
  expect(names).toContain('convert-image:run');
  expect(names).toContain('convert-image:done');
  for (const b of bodies) {
    const payload = b.payload as Record<string, unknown>;
    for (const k of Object.keys(payload)) expect(ALLOWED_PAYLOAD.has(k), k).toBe(true);
    for (const k of Object.keys((payload.data as object) ?? {}))
      expect(ALLOWED_DATA.has(k), k).toBe(true);
    expect(payload.url).toBe('/convert-image/');
    expect(JSON.stringify(b)).not.toContain('sample');
  }
});

test('Global Privacy Control sends nothing', async ({ page }) => {
  const bodies = capture(page);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true }),
  );
  await openTool(page, 'convert-image');
  await addFiles(page, 'tests/fixtures/sample.png');
  await page.locator('button.primary').first().click();
  await expect(page.getByRole('button', { name: /^Download/ }).first()).toBeVisible();
  expect(bodies).toEqual([]);
  expect(scriptRequests).toBe(0);
});

const LEAD = 'Your images never leave your device.';
const NO_SIGNAL_TEXT =
  'No images, file contents or metadata are stored or sent. The only thing counted is anonymous usage (which tool is used), never anything from your pictures.';

test('without a browser signal there is no switch and the band says what is counted', async ({
  page,
}) => {
  const bodies = capture(page);
  await page.goto('/privacy/');
  const band = page.getByRole('region', { name: 'Privacy' });
  await expect(band.getByText(LEAD)).toBeVisible();
  await expect(band.getByText(NO_SIGNAL_TEXT)).toBeVisible();
  await expect(band.getByRole('link', { name: /Learn more/ })).toBeVisible();
  await expect(page.getByRole('switch')).toHaveCount(0);
  await expect.poll(() => scriptRequests).toBeGreaterThan(0);
  await expect.poll(() => bodies.length).toBeGreaterThan(0);
});

for (const [name, init, sentence] of [
  [
    'Global Privacy Control',
    () => Object.defineProperty(navigator, 'globalPrivacyControl', { value: true }),
    'Your browser has Global Privacy Control enabled, so usage counting is switched off for you.',
  ],
  [
    'Do Not Track',
    () => Object.defineProperty(navigator, 'doNotTrack', { value: '1' }),
    'Your browser has Do Not Track enabled, so usage counting is switched off for you.',
  ],
] as const) {
  test(`${name} shows the sentence, no switch, and sends nothing`, async ({ page }) => {
    const bodies = capture(page);
    await page.addInitScript(init);
    await page.goto('/privacy/');
    const band = page.getByRole('region', { name: 'Privacy' });
    await expect(band.getByText(LEAD)).toBeVisible();
    await expect(band.getByText(sentence)).toBeVisible();
    await expect(page.getByRole('switch')).toHaveCount(0);
    await openTool(page, 'convert-image');
    await addFiles(page, 'tests/fixtures/sample.png');
    await page.locator('button.primary').first().click();
    await expect(page.getByRole('button', { name: /^Download/ }).first()).toBeVisible();
    expect(bodies).toEqual([]);
    expect(scriptRequests).toBe(0); // script.js is never requested
  });
}

test('adding a file counts one upload event with nothing else in it, on every kind of tool', async ({
  page,
}) => {
  const bodies = capture(page);
  for (const [slug, fixture] of [
    ['convert-image', 'sample.png'], // batch tool
    ['photo-collage', 'sample.png'], // compose tool
    ['color-palette', 'sample.png'], // single-file tool
  ]) {
    await page.goto(`/${slug}/`);
    await page.locator('body[data-ready]').waitFor();
    await addFiles(page, `tests/fixtures/${fixture}`);
    await expect
      .poll(
        () =>
          bodies.filter((b) => (b.payload as { name?: string }).name === `${slug}:upload`).length,
      )
      .toBe(1);
  }
  for (const b of bodies) {
    const p = b.payload as { name?: string; data?: object };
    if (p.name?.endsWith(':upload')) expect(p.data).toBeUndefined();
  }
});
