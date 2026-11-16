// The frame around every page: the notices at the top and the links in the footer.
import { expect, test } from '@playwright/test';

test.skip(!!process.env.ANALYTICS_BUILD, 'runs against the analytics-off build');

test('a yellow bar above the privacy bar says the project is in development and links to GitHub', async ({
  page,
}) => {
  await page.goto('/');
  const privacy = page.getByRole('region', { name: 'Privacy' });
  const dev = page.getByRole('region', { name: 'Project status' });
  await expect(dev).toContainText('still in development');
  const a = (await privacy.boundingBox())!;
  const b = (await dev.boundingBox())!;
  expect(a.y).toBeGreaterThanOrEqual(b.y + b.height - 1);
  await expect(dev.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
    'href',
    'https://github.com/yexner/img-tools',
  );
  await expect(dev.getByRole('link', { name: 'contributing guide' })).toHaveAttribute(
    'href',
    'https://github.com/yexner/img-tools/blob/main/CONTRIBUTING.md',
  );
  // It is on tool pages too.
  await page.goto('/convert-image/');
  await expect(dev).toBeVisible();
});

test('the llm-info page lists every tool and is linked from the footnote', async ({ page }) => {
  const tools: { slug: string; name: string }[] = await (
    await page.request.get('/tools.json')
  ).json();
  await page.goto('/');
  await page.getByRole('link', { name: 'For AI assistants' }).first().click();
  await expect(page).toHaveURL(/\/llm-info\/$/);
  for (const heading of ['Objective', 'Tools available', 'Privacy requirements']) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
  await expect(
    page.getByRole('heading', { name: /Why an assistant can recommend it/ }),
  ).toBeVisible();
  await expect(page.locator('main a[href*="convert-image"]').first()).toBeVisible();
  expect(await page.locator('main li > a').count()).toBeGreaterThanOrEqual(tools.length);
});

test('the open-source licenses link opens the text file, not a slash-suffixed route', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Open-source licenses' }).first().click();
  await page.waitForURL(/third-party-notices\.txt$/);
  await expect(page.locator('body')).toContainText('libheif-js');
});
