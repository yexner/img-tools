// Checks the Photo IDs & print tools: the size of the file and the resolution stored in it.
import { expect, test } from '@playwright/test';
import { addFiles, decoded, downloadNow, exiftool, openTool } from './helpers/run';

test.skip(!!process.env.ANALYTICS_BUILD, 'runs against the analytics-off build');

async function open(page: import('@playwright/test').Page) {
  await openTool(page, 'passport-photo');
  await addFiles(page, 'tests/fixtures/sample.jpg');
  await page.getByRole('button', { name: 'Create photo' }).waitFor();
}

test('passport-photo saves the UK size at 300 DPI with the resolution stored', async ({ page }) => {
  await open(page);
  await page.getByRole('radio', { name: 'United Kingdom' }).check();
  await expect(
    page.getByText('3.5 cm × 4.5 cm (1.38 in × 1.77 in), 413 × 531 px at 300 DPI'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Create photo' }).click();
  const out = await downloadNow(page);
  expect(out.name).toMatch(/passport-photo-uk-35x45mm\.jpg$/);
  const size = await decoded(page, out.bytes, 'image/jpeg');
  expect([size.w, size.h]).toEqual([413, 531]);
  const dpi = exiftool(out.bytes, 'p.jpg', ['-s3', '-XResolution', '-ResolutionUnit']);
  if (dpi) expect(dpi).toEqual(['300', 'inches']);
});

test('passport-photo shows the official values, a source and the data it lacks', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('radio', { name: 'India (passport)' }).check();
  await expect(page.getByText('Not stated on the official page').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /passportindia\.gov\.in/ })).toBeVisible();
  // No head height, so no guide lines to switch.
  await expect(page.getByText('Show guide lines for the head')).toHaveCount(0);
});

test('passport-photo keeps the box in the shape of the printed photo', async ({ page }) => {
  await open(page);
  await page.getByRole('radio', { name: 'Canada' }).check();
  await page.getByRole('button', { name: 'Create photo' }).click();
  const out = await downloadNow(page);
  const size = await decoded(page, out.bytes, 'image/jpeg');
  expect([size.w, size.h]).toEqual([591, 827]);
});

async function openSheet(page: import('@playwright/test').Page) {
  await open(page);
  await page.getByRole('radio', { name: 'Print sheet' }).check();
  // 35 x 45 mm photos, as in the UK, on the default 4 x 6 in sheet.
  await page.getByRole('radio', { name: 'United Kingdom' }).check();
  await page.getByRole('button', { name: 'Create sheet' }).waitFor();
}

test('passport-photo as a print sheet fills a photo sheet and stores 300 DPI', async ({ page }) => {
  await openSheet(page);
  await page.getByLabel('Gap between copies').fill('0');
  await expect(page.getByText('8 copies')).toBeVisible();
  await expect(page.getByText('1800 × 1200 px at 300 DPI')).toBeVisible();
  await page.getByRole('button', { name: 'Create sheet' }).click();
  await expect(page.getByRole('img', { name: 'The finished print sheet' })).toBeVisible();
  const out = await downloadNow(page);
  expect(out.name).toMatch(/-uk-35x45mm-sheet-4x6\.jpg$/);
  const size = await decoded(page, out.bytes, 'image/jpeg');
  expect([size.w, size.h]).toEqual([1800, 1200]);
  const dpi = exiftool(out.bytes, 's.jpg', ['-s3', '-XResolution', '-ResolutionUnit']);
  if (dpi) expect(dpi).toEqual(['300', 'inches']);
});

test('passport-photo as a print sheet warns when the gap costs copies and offers 600 DPI', async ({
  page,
}) => {
  await openSheet(page);
  await page.getByLabel('Gap between copies').fill('5');
  await expect(page.getByText(/with no gap\s+8 would fit/)).toBeVisible();
  await page.getByLabel('Gap between copies').fill('1');
  await expect(page.getByText(/Make the gap smaller/)).toHaveCount(0);
  await page.getByRole('radio', { name: '600 DPI' }).check();
  await expect(page.getByText('3600 × 2400 px at 600 DPI')).toBeVisible();
});

test('passport-photo switches between a single photo and a print sheet', async ({ page }) => {
  await open(page);
  await expect(page.getByLabel('Gap between copies')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create sheet' })).toHaveCount(0);
  await page.getByRole('radio', { name: 'Print sheet' }).check();
  await expect(page.getByLabel('Gap between copies')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create photo' })).toHaveCount(0);
  await page.getByRole('radio', { name: 'Single photo' }).check();
  await expect(page.getByRole('button', { name: 'Create photo' })).toBeVisible();
});

test('passport-photo takes the requirements of a country that is not listed', async ({ page }) => {
  await open(page);
  await page.getByRole('radio', { name: 'Custom' }).check();
  await page.getByLabel('Width', { exact: true }).fill('4');
  await page.getByLabel('Height', { exact: true }).fill('5');
  await page.getByLabel('Head height, smallest').fill('3.2');
  await page.getByLabel('Head height, largest').fill('3.6');
  await page.getByLabel('Background color required').fill('Light blue');
  await expect(
    page.getByText('4 cm × 5 cm (1.57 in × 1.97 in), 472 × 591 px at 300 DPI'),
  ).toBeVisible();
  await expect(page.getByText('Light blue', { exact: true })).toBeVisible();
  await expect(page.getByText('3.2–3.6 cm (1.26–1.42 in), chin to crown')).toBeVisible();
  await page.getByRole('button', { name: 'Create photo' }).click();
  const out = await downloadNow(page);
  expect(out.name).toMatch(/passport-photo-custom-40x50mm\.jpg$/);
  const size = await decoded(page, out.bytes, 'image/jpeg');
  expect([size.w, size.h]).toEqual([472, 591]);
});

test('passport-photo links to a feature request for a missing country', async ({ page }) => {
  await open(page);
  const link = page.getByRole('link', {
    name: 'Your country not listed? Submit a feature request!',
  });
  await expect(link).toHaveAttribute(
    'href',
    /^https:\/\/github\.com\/yexner\/img-tools\/issues\/new/,
  );
  await expect(link).toHaveAttribute('target', '_blank');
});
