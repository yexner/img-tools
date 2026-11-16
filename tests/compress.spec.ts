// Checks what the Compress tools really write.
import { test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
import {
  addFiles,
  addPngText,
  colorStats,
  pixelAt,
  convert,
  decoded,
  expect,
  hasText,
  makeGradient,
  makePng,
  openTool,
  upload,
} from './helpers/run';

test.skip(!!process.env.ANALYTICS_BUILD, 'runs against the analytics-off build');

const original = (name: string) => readFileSync(`tests/fixtures/${name}`).length;

test('compress-image by quality keeps the format and the size of the picture', async ({ page }) => {
  await openTool(page, 'compress-image');
  await page.getByRole('slider', { name: 'Quality' }).fill('40');
  const out = await convert(page, 'compress-image', 'tests/fixtures/sample.jpg', false);
  expect(out.name).toBe('sample-compressed.jpg');
  expect(out.bytes.length).toBeLessThan(original('sample.jpg'));
  expect(await decoded(page, out.bytes, 'image/jpeg')).toMatchObject({ w: 480, h: 360 });
});

test('compress-image to a file size fits under the target', async ({ page }) => {
  await openTool(page, 'compress-image');
  await page.getByRole('radio', { name: 'To a file size' }).check();
  await page.getByRole('radio', { name: 'Custom' }).check();
  await page.getByLabel('Target size (KB)').fill('8');
  await page.getByRole('radio', { name: 'JPG' }).check();
  await addFiles(page, 'tests/fixtures/sample.png');
  await page.locator('button.primary').first().click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  const bytes = readFileSync((await download.path())!);
  expect(bytes.length).toBeLessThanOrEqual(8000);
  expect(bytes.length).toBeGreaterThan(2000); // close to the target, not far below it
  await expect(page.getByText(/fits under 8 KB/)).toBeVisible();
});

test('compress-image says when the target cannot be reached', async ({ page }) => {
  await openTool(page, 'compress-image');
  await page.getByRole('radio', { name: 'To a file size' }).check();
  await page.getByRole('radio', { name: 'Custom' }).check();
  await page.getByLabel('Target size (KB)').fill('1');
  await page.getByRole('radio', { name: 'JPG' }).check();
  await addFiles(page, 'tests/fixtures/sample.png');
  await page.locator('button.primary').first().click();
  await expect(page.getByText(/Target not reached/)).toBeVisible();
});

test('compress-image offers the preset sizes, and PNG stays available in file size mode', async ({
  page,
}) => {
  await openTool(page, 'compress-image');
  await page.getByRole('radio', { name: 'To a file size' }).check();
  for (const kb of [20, 50, 100, 200, 500, 1000])
    await expect(page.getByRole('radio', { name: `${kb} KB`, exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'PNG', exact: true })).toBeVisible();
});

test('compress-image keeps the type of each file in a mixed batch', async ({ page }) => {
  await openTool(page, 'compress-image');
  await page.getByRole('slider', { name: 'Quality' }).fill('40');
  const out = await convert(
    page,
    'compress-image',
    [
      upload('sample.jpg', 'image/jpeg'),
      upload('sample.png', 'image/png'),
      upload('sample.webp', 'image/webp'),
    ],
    false,
  );
  expect(out.name).toBe('img-tools-compress-image.zip');
  const files = unzipSync(out.bytes);
  expect(Object.keys(files).sort()).toEqual([
    'sample-compressed.jpg',
    'sample-compressed.png',
    'sample-compressed.webp',
  ]);
  expect([...files['sample-compressed.jpg'].slice(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  expect([...files['sample-compressed.png'].slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  expect(new TextDecoder().decode(files['sample-compressed.webp'].slice(8, 12))).toBe('WEBP');
});

test('compress-image to a size keeps each type and fits JPG and WebP under 20 KB', async ({
  page,
}) => {
  await openTool(page, 'compress-image');
  await page.getByRole('radio', { name: 'To a file size' }).check();
  await page.getByRole('radio', { name: '20 KB', exact: true }).check();
  const out = await convert(
    page,
    'compress-image',
    [upload('sample.jpg', 'image/jpeg'), upload('sample.webp', 'image/webp')],
    false,
  );
  const files = unzipSync(out.bytes);
  expect(Object.keys(files).sort()).toEqual(['sample-compressed.jpg', 'sample-compressed.webp']);
  for (const bytes of Object.values(files)) expect(bytes.length).toBeLessThanOrEqual(20_000);
});

test('compress-image can compress to 10 KB as JPG', async ({ page }) => {
  await openTool(page, 'compress-image');
  await page.getByRole('radio', { name: 'To a file size' }).check();
  await page.getByRole('radio', { name: 'Custom' }).check();
  await page.getByLabel('Target size (KB)').fill('10');
  await page.getByRole('radio', { name: 'JPG' }).check();
  const out = await convert(page, 'compress-image', 'tests/fixtures/sample.png', false);
  expect(out.name).toBe('sample-compressed.jpg');
  expect(out.bytes.length).toBeLessThanOrEqual(10_000);
  expect(out.bytes.length).toBeGreaterThan(5_000);
});

test('compress-image reduces a PNG step by step to fit a size and stays a PNG', async ({
  page,
}) => {
  await openTool(page, 'compress-image');
  const gradient = await makeGradient(page, 300, 200);
  await page.getByRole('radio', { name: 'To a file size' }).check();
  await page.getByRole('radio', { name: 'Custom' }).check();
  await page.getByLabel('Target size (KB)').fill(String(Math.ceil(gradient.length / 1000 / 2)));
  const out = await convert(
    page,
    'compress-image',
    { name: 'sky.png', mimeType: 'image/png', buffer: Buffer.from(gradient) },
    false,
  );
  expect(out.name).toBe('sky-compressed.png');
  expect(out.bytes.length).toBeLessThan(gradient.length);
  expect(out.bytes.length).toBeLessThanOrEqual(Math.ceil(gradient.length / 2));
});

test('compress-image saves smaller PNGs without changing pixels or keeping metadata', async ({
  page,
}) => {
  await page.goto('/compress-image/');
  const flat = await makePng(page, 200, 120);
  const withText = addPngText(new Uint8Array(flat), 'Comment', 'secret-note');
  const out = await convert(
    page,
    'compress-image',
    { name: 'flat.png', mimeType: 'image/png', buffer: Buffer.from(withText) },
    false,
  );
  expect(out.name).toBe('flat-compressed.png');
  expect(out.bytes.length).toBeLessThan(withText.length);
  expect(hasText(out.bytes, 'secret-note')).toBe(false);
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({
    w: 200,
    h: 120,
    px: [200, 30, 30, 255],
  });
});

test('compress-image can write AVIF and limit the longest edge', async ({ page }) => {
  await openTool(page, 'compress-image');
  await page.getByRole('radio', { name: 'AVIF' }).check();
  await page.getByText('Advanced', { exact: true }).click();
  await page.getByLabel('Longest edge (px)').fill('240');
  const out = await convert(page, 'compress-image', 'tests/fixtures/sample.png', false);
  expect(out.name).toBe('sample-compressed.avif');
  expect(await decoded(page, out.bytes, 'image/avif')).toMatchObject({ w: 240, h: 180 });
});

test('compress-image does not enlarge small images when limiting the edge', async ({ page }) => {
  await openTool(page, 'compress-image');
  await page.getByText('Advanced', { exact: true }).click();
  await page.getByLabel('Longest edge (px)').fill('2000');
  const out = await convert(page, 'compress-image', upload('sample.jpg', 'image/jpeg'), false);
  expect(await decoded(page, out.bytes, 'image/jpeg')).toMatchObject({ w: 480, h: 360 });
});

test('compress-image shows the real result and a before/after split for a selected JPG', async ({
  page,
}) => {
  await openTool(page, 'compress-image');
  await addFiles(page, 'tests/fixtures/sample.jpg');
  const slider = page.getByRole('slider', { name: 'Quality' });
  await slider.fill('30');
  const result = page.locator('p[aria-live=polite]').filter({ hasText: '→' });
  await expect(result).toContainText(/KB → .* KB/);
  const low = await result.textContent();
  await slider.fill('95');
  await expect(result).not.toHaveText(low!);
  await expect(page.getByRole('slider', { name: 'Comparison position' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Original version' })).toBeVisible();
  // Zoom controls work.
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByRole('button', { name: 'Fit' })).toBeEnabled();
});

test('compress-image writes the quality that was previewed', async ({ page }) => {
  await openTool(page, 'compress-image');
  await page.getByRole('slider', { name: 'Quality' }).fill('30');
  const out = await convert(page, 'compress-image', 'tests/fixtures/sample.jpg', false);
  expect(out.name).toBe('sample-compressed.jpg');
  expect(out.bytes.length).toBeLessThan(original('sample.jpg'));
  expect(await decoded(page, out.bytes, 'image/jpeg')).toMatchObject({ w: 480, h: 360 });
});

test('compress-image keeps a WebP a WebP, with its transparency', async ({ page }) => {
  await openTool(page, 'compress-image');
  // A WebP with a transparent pixel, made by the browser's own encoder.
  const webp = await page.evaluate(async () => {
    const c = new OffscreenCanvas(40, 30);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgb(0 120 255)';
    ctx.fillRect(0, 0, 20, 30); // the right half stays transparent
    const blob = await c.convertToBlob({ type: 'image/webp' });
    return blob.type === 'image/webp' ? [...new Uint8Array(await blob.arrayBuffer())] : [];
  });
  // Safari cannot write WebP itself, so there is no test picture to make here.
  test.skip(!webp.length, 'this browser cannot write WebP');
  const out = await convert(
    page,
    'compress-image',
    { name: 'clear.webp', mimeType: 'image/webp', buffer: Buffer.from(webp) },
    false,
  );
  expect(out.name).toBe('clear-compressed.webp');
  expect(new TextDecoder().decode(out.bytes.slice(8, 12))).toBe('WEBP');
  expect(await decoded(page, out.bytes, 'image/webp')).toMatchObject({ w: 40, h: 30 });
  expect((await pixelAt(page, out.bytes, 'image/webp', 30, 15))[3]).toBeLessThan(10);
});

test('compress-image can save a size-limited file as WebP', async ({ page }) => {
  await openTool(page, 'compress-image');
  await page.getByRole('radio', { name: 'To a file size' }).check();
  await page.getByRole('radio', { name: '20 KB', exact: true }).check();
  await page.getByRole('radio', { name: 'WebP' }).check();
  const out = await convert(page, 'compress-image', 'tests/fixtures/sample.png', false);
  expect(out.name).toBe('sample-compressed.webp');
  expect(out.bytes.length).toBeLessThanOrEqual(20_000);
});

test('compress-image reduces the number of colors of a PNG and keeps the size', async ({
  page,
}) => {
  await openTool(page, 'compress-image');
  const gradient = await makeGradient(page, 300, 200);
  await page.getByRole('radio', { name: 'Reduced colors' }).check();
  await page.getByRole('radio', { name: '16', exact: true }).check();
  const out = await convert(
    page,
    'compress-image',
    { name: 'sky.png', mimeType: 'image/png', buffer: Buffer.from(gradient) },
    false,
  );
  expect(out.name).toBe('sky-compressed.png');
  expect(out.bytes.length).toBeLessThan(gradient.length);
  const stats = await colorStats(page, out.bytes);
  expect(stats.colors).toBeLessThanOrEqual(16);
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({ w: 300, h: 200 });
});

test('compress-image keeps PNG transparency when reducing colors', async ({ page }) => {
  await openTool(page, 'compress-image');
  const gradient = await makeGradient(page, 200, 160, true);
  await page.getByRole('radio', { name: 'Reduced colors' }).check();
  await page.getByRole('radio', { name: '64', exact: true }).check();
  const out = await convert(
    page,
    'compress-image',
    { name: 'fade.png', mimeType: 'image/png', buffer: Buffer.from(gradient) },
    false,
  );
  const stats = await colorStats(page, out.bytes);
  expect(stats.minAlpha).toBeLessThan(120);
  expect(stats.colors).toBeLessThanOrEqual(64);
});

test('compress-image lossless leaves every pixel of a PNG unchanged', async ({ page }) => {
  await openTool(page, 'compress-image');
  const gradient = await makeGradient(page, 120, 80, true);
  await page.getByRole('radio', { name: 'Lossless' }).check();
  const out = await convert(
    page,
    'compress-image',
    { name: 'same.png', mimeType: 'image/png', buffer: Buffer.from(gradient) },
    false,
  );
  expect(out.name).toBe('same-compressed.png');
  expect(out.bytes.length).toBeLessThanOrEqual(gradient.length);
  const [before, after] = await Promise.all([
    colorStats(page, new Uint8Array(gradient)),
    colorStats(page, out.bytes),
  ]);
  expect(after).toEqual(before);
});

test('image-size-checker reports format, size, ratio and DPI from the contents', async ({
  page,
}) => {
  await openTool(page, 'image-size-checker');
  await addFiles(page, [
    upload('dpi-300.jpg', 'image/jpeg'),
    {
      name: 'actually-a-png.jpg',
      mimeType: 'image/jpeg',
      buffer: readFileSync('tests/fixtures/sample.png'),
    },
    upload('rotated.jpg', 'image/jpeg'),
  ]);
  const rows = page.locator('ul[aria-label="Results"] li');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('JPG');
  await expect(rows.nth(0)).toContainText('120 × 90 (0.01 MP)');
  await expect(rows.nth(0)).toContainText('4:3');
  await expect(rows.nth(0)).toContainText('300');
  // The name says .jpg but the bytes are PNG.
  await expect(rows.nth(1)).toContainText('PNG');
  await expect(rows.nth(1)).toContainText('contents are PNG');
  await expect(rows.nth(1)).toContainText('Not stored in this file');
  // The rotated photo is measured as displayed.
  await expect(rows.nth(2)).toContainText('360 × 480');
  await expect(rows.nth(2)).toContainText('3:4');
  // Remove one, then all.
  await page.getByRole('button', { name: 'Remove actually-a-png.jpg' }).click();
  await expect(rows).toHaveCount(2);
  await page.getByRole('button', { name: 'Remove all' }).click();
  await expect(page.locator('ul.tray')).toHaveCount(0);
});

test('image-size-checker reads formats the browser cannot decode', async ({ page }) => {
  await openTool(page, 'image-size-checker');
  await addFiles(page, [upload('sample.heic', 'image/heic'), upload('sample.tiff', 'image/tiff')]);
  const rows = page.locator('ul[aria-label="Results"] li');
  await expect(rows.nth(0)).toContainText('HEIC');
  await expect(rows.nth(0)).toContainText('120 × 90');
  await expect(rows.nth(1)).toContainText('TIFF');
  await expect(rows.nth(1)).toContainText('120 × 90');
});
