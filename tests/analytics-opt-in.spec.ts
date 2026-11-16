// Runs against an opt-in build with a fake Umami host:
//   PUBLIC_UMAMI_WEBSITE_ID=test PUBLIC_UMAMI_HOST_URL=https://umami.invalid PUBLIC_UMAMI_DOMAINS=localhost \
//   PUBLIC_ANALYTICS_CONSENT=opt-in npx vite build && ANALYTICS_BUILD=1 ANALYTICS_OPT_IN=1 npx playwright test analytics
import { expect, test } from '@playwright/test';

test.skip(
  !process.env.ANALYTICS_BUILD || !process.env.ANALYTICS_OPT_IN,
  'needs the analytics-on opt-in build',
);

test('opt-in: nothing is requested until the visitor switches stats on', async ({ page }) => {
  let scriptRequests = 0;
  await page.route('https://umami.invalid/script.js', (route) => {
    scriptRequests++;
    return route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: 'window.umami = { track: function () {} };',
    });
  });
  await page.goto('/privacy/');
  const toggle = page.getByRole('switch').first();
  await expect(toggle).toBeVisible();
  await expect(toggle).not.toBeChecked();
  expect(scriptRequests).toBe(0);
  await toggle.check();
  await expect.poll(() => scriptRequests).toBe(1);
});

test('opt-in with Global Privacy Control: the sentence replaces the switch', async ({ page }) => {
  let scriptRequests = 0;
  await page.route('https://umami.invalid/script.js', (route) => {
    scriptRequests++;
    return route.abort();
  });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true }),
  );
  await page.goto('/privacy/');
  const band = page.getByRole('region', { name: 'Privacy' });
  await expect(
    band.getByText(
      'Your browser has Global Privacy Control enabled, so usage counting is switched off for you.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('switch')).toHaveCount(0);
  expect(scriptRequests).toBe(0);
});
