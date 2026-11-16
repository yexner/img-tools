// Checks what the Resize & crop tools really write.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { readDpi } from '../src/lib/core/dims';
import { addFiles, convert, decoded, openTool, pixelAt, runAndDownload } from './helpers/run';

test.skip(!!process.env.ANALYTICS_BUILD, 'runs against the analytics-off build');

test('resize-image shrinks to the longest edge and shows the result size', async ({ page }) => {
  await openTool(page, 'resize-image');
  await page.getByRole('radio', { name: '1080 px' }).check();
  await addFiles(page, 'tests/fixtures/sample.png');
  // 480 x 360 is already below 1080, so nothing changes.
  await expect(page.getByText('480 × 360 → 480 × 360 px')).toBeVisible();
  await page.getByRole('radio', { name: 'Custom' }).check();
  await page.getByLabel('Custom longest edge').fill('240');
  await expect(page.getByText('480 × 360 → 240 × 180 px')).toBeVisible();
  const out = await runAndDownload(page);
  expect(out.name).toBe('sample-resized.png');
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({ w: 240, h: 180 });
});

test('resize-image never enlarges with the longest edge mode', async ({ page }) => {
  await openTool(page, 'resize-image');
  const out = await convert(page, 'resize-image', 'tests/fixtures/sample.jpg', false);
  expect(await decoded(page, out.bytes, 'image/jpeg')).toMatchObject({ w: 480, h: 360 });
});

test('resize-image exact size keeps proportions from the side typed last', async ({ page }) => {
  await openTool(page, 'resize-image');
  await page.getByRole('radio', { name: 'Exact size' }).check();
  await page.getByLabel('Width').fill('300');
  const out = await convert(page, 'resize-image', 'tests/fixtures/sample.png', false);
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({ w: 300, h: 225 });
});

test('resize-image exact size can stretch when proportions are not kept', async ({ page }) => {
  await openTool(page, 'resize-image');
  await page.getByRole('radio', { name: 'Exact size' }).check();
  await page.getByLabel('Keep proportions').uncheck();
  await page.getByLabel('Width').fill('100');
  await page.getByLabel('Height').fill('100');
  const out = await convert(page, 'resize-image', 'tests/fixtures/sample.png', false);
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({ w: 100, h: 100 });
});

test('resize-image by percent can enlarge', async ({ page }) => {
  await openTool(page, 'resize-image');
  await page.getByRole('radio', { name: 'Percent' }).check();
  await page.getByRole('spinbutton', { name: /Percent of the original size/ }).fill('150');
  const out = await convert(page, 'resize-image', 'tests/fixtures/sample.png', false);
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({ w: 720, h: 540 });
});

test('resize-image averages pixels when it shrinks a lot, instead of skipping them', async ({
  page,
}) => {
  await openTool(page, 'resize-image');
  // A one-pixel black and white checkerboard: any honest downscale is mid-gray.
  const png = await page.evaluate(async () => {
    const c = new OffscreenCanvas(1600, 1600);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 1600, 1600);
    ctx.fillStyle = '#000';
    for (let y = 0; y < 1600; y++) for (let x = y % 2; x < 1600; x += 2) ctx.fillRect(x, y, 1, 1);
    return [...new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer())];
  });
  await page.getByRole('radio', { name: 'Custom' }).check();
  await page.getByLabel('Custom longest edge').fill('100');
  const out = await convert(
    page,
    'resize-image',
    { name: 'checker.png', mimeType: 'image/png', buffer: Buffer.from(png) },
    false,
  );
  const result = await decoded(page, out.bytes, 'image/png');
  expect(result).toMatchObject({ w: 100, h: 100 });
  expect(Math.abs(result.px[0] - 128)).toBeLessThan(40);
});

test('rotate-image turns pictures and flips them after the turn', async ({ page }) => {
  await openTool(page, 'rotate-image');
  await addFiles(page, 'tests/fixtures/sample.png');
  await page.getByRole('button', { name: 'Right' }).click();
  await expect(page.locator('output')).toHaveText('90°');
  await page.getByRole('button', { name: 'Right' }).click();
  await page.getByRole('button', { name: 'Right' }).click();
  await expect(page.locator('output')).toHaveText('270°');
  await page.getByRole('button', { name: 'Left' }).click();
  await expect(page.locator('output')).toHaveText('180°');
  const out = await runAndDownload(page);
  expect(out.name).toBe('sample-rotated.png');
  const upright = await decoded(page, out.bytes, 'image/png');
  expect(upright).toMatchObject({ w: 480, h: 360 });
});

test('rotate-image: a quarter turn swaps the sides and PNG pixels move exactly', async ({
  page,
}) => {
  await openTool(page, 'rotate-image');
  // 4 x 2 picture: red on the left half, blue on the right half.
  const png = await page.evaluate(async () => {
    const c = new OffscreenCanvas(4, 2);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgb(255 0 0)';
    ctx.fillRect(0, 0, 2, 2);
    ctx.fillStyle = 'rgb(0 0 255)';
    ctx.fillRect(2, 0, 2, 2);
    return [...new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer())];
  });
  await addFiles(page, { name: 'two.png', mimeType: 'image/png', buffer: Buffer.from(png) });
  await page.getByRole('button', { name: 'Right' }).click();
  const out = await runAndDownload(page);
  const pixels = await page.evaluate(
    async (data) => {
      const bitmap = await createImageBitmap(
        new Blob([new Uint8Array(data)], { type: 'image/png' }),
      );
      const c = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = c.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      const at = (x: number, y: number) => [...ctx.getImageData(x, y, 1, 1).data];
      return { w: bitmap.width, h: bitmap.height, top: at(0, 0), bottom: at(0, 3) };
    },
    [...out.bytes],
  );
  // Turned clockwise: the red left half is now on top.
  expect(pixels).toEqual({ w: 2, h: 4, top: [255, 0, 0, 255], bottom: [0, 0, 255, 255] });
});

test('rotate-image can flip horizontally and vertically together', async ({ page }) => {
  await openTool(page, 'rotate-image');
  const png = await page.evaluate(async () => {
    const c = new OffscreenCanvas(2, 2);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgb(255 0 0)';
    ctx.fillRect(0, 0, 1, 1); // only the top-left pixel is red
    ctx.fillStyle = 'rgb(255 255 255)';
    ctx.fillRect(1, 0, 1, 2);
    ctx.fillRect(0, 1, 1, 1);
    return [...new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer())];
  });
  await addFiles(page, { name: 'dot.png', mimeType: 'image/png', buffer: Buffer.from(png) });
  await page.getByLabel('Flip horizontally').check();
  await page.getByLabel('Flip vertically').check();
  const out = await runAndDownload(page);
  const red = await page.evaluate(
    async (data) => {
      const bitmap = await createImageBitmap(
        new Blob([new Uint8Array(data)], { type: 'image/png' }),
      );
      const c = new OffscreenCanvas(2, 2);
      const ctx = c.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      return [...ctx.getImageData(1, 1, 1, 1).data];
    },
    [...out.bytes],
  );
  expect(red).toEqual([255, 0, 0, 255]); // the red pixel moved to the bottom right
});

test('add-border grows the picture and keeps the original in the middle', async ({ page }) => {
  await openTool(page, 'add-border');
  await addFiles(page, 'tests/fixtures/sample.png');
  await expect(page.getByText('480 × 360 → 520 × 400 px')).toBeVisible();
  const out = await runAndDownload(page);
  expect(out.name).toBe('sample-border.png');
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({ w: 520, h: 400 });
  expect(await pixelAt(page, out.bytes, 'image/png', 3, 3)).toEqual([255, 255, 255, 255]);
  // The picture itself sits 20 px in from each edge, unchanged.
  const source = new Uint8Array(readFileSync('tests/fixtures/sample.png'));
  for (const [x, y] of [
    [100, 100],
    [300, 200],
    [470, 350],
  ]) {
    expect(await pixelAt(page, out.bytes, 'image/png', x + 20, y + 20)).toEqual(
      await pixelAt(page, source, 'image/png', x, y),
    );
  }
});

test('add-border can set each side separately', async ({ page }) => {
  await openTool(page, 'add-border');
  await page.getByLabel('Set each side separately').check();
  await page.getByLabel('Top').fill('10');
  await page.getByLabel('Right').fill('0');
  await page.getByLabel('Bottom').fill('30');
  await page.getByLabel('Left').fill('5');
  await page.getByRole('radio', { name: 'Black' }).check();
  const out = await convert(page, 'add-border', 'tests/fixtures/sample.png', false);
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({ w: 485, h: 400 });
  expect(await pixelAt(page, out.bytes, 'image/png', 100, 395)).toEqual([0, 0, 0, 255]);
});

test('add-border with a transparent border saves PNG and hides JPG', async ({ page }) => {
  await openTool(page, 'add-border');
  await page.getByRole('radio', { name: 'Transparent' }).check();
  await expect(page.getByRole('radio', { name: 'JPG' })).toHaveCount(0);
  await expect(
    page.getByText(/JPG is hidden because this result needs transparency/),
  ).toBeVisible();
  const out = await convert(page, 'add-border', 'tests/fixtures/sample.jpg', false);
  expect(out.name).toBe('sample-border.png');
  expect((await pixelAt(page, out.bytes, 'image/png', 2, 2))[3]).toBe(0);
});

test('add-border accepts a typed custom color', async ({ page }) => {
  await openTool(page, 'add-border');
  await page.getByRole('radio', { name: 'Custom' }).last().check();
  await page.getByLabel('Border color', { exact: true }).fill('#ff0000');
  const out = await convert(page, 'add-border', 'tests/fixtures/sample.png', false);
  expect(await pixelAt(page, out.bytes, 'image/png', 1, 1)).toEqual([255, 0, 0, 255]);
});

test('resize-to-cm sizes a photo for print and stores the DPI in the file', async ({ page }) => {
  await openTool(page, 'resize-to-cm');
  await addFiles(page, 'tests/fixtures/sample.png');
  // A 4:3 landscape photo fits a 6 x 4 in box (1800 x 1200 px) by height.
  await expect(page.getByText('480 × 360 → 1600 × 1200 px at 300 DPI')).toBeVisible();
  const out = await runAndDownload(page);
  expect(out.name).toBe('sample-print.jpg');
  expect(await decoded(page, out.bytes, 'image/jpeg')).toMatchObject({ w: 1600, h: 1200 });
  expect(readDpi(out.bytes, 'jpeg')).toEqual({ x: 300, y: 300 });
});

test('resize-to-cm fills the box when cropping or stretching', async ({ page }) => {
  await openTool(page, 'resize-to-cm');
  await page.getByRole('radio', { name: 'Crop to fill' }).check();
  const out = await convert(page, 'resize-to-cm', 'tests/fixtures/sample.png', false);
  expect(await decoded(page, out.bytes, 'image/jpeg')).toMatchObject({ w: 1800, h: 1200 });
});

test('resize-to-cm writes a PNG with its resolution', async ({ page }) => {
  await openTool(page, 'resize-to-cm');
  await page.getByRole('radio', { name: 'PNG' }).check();
  await page.getByRole('radio', { name: '150 DPI' }).check();
  await page.getByRole('radio', { name: 'Stretch to fill' }).check();
  const out = await convert(page, 'resize-to-cm', 'tests/fixtures/sample.png', false);
  expect(out.name).toBe('sample-print.png');
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({ w: 900, h: 600 });
  expect(readDpi(out.bytes, 'png')?.x).toBeCloseTo(150, 0);
});

test('resize-to-cm turns the box for each photo and converts units', async ({ page }) => {
  await openTool(page, 'resize-to-cm');
  await page.getByRole('radio', { name: 'cm', exact: true }).check();
  await expect(page.getByLabel('Width')).toHaveValue('10.16');
  await expect(page.getByLabel('Height')).toHaveValue('15.24');
  await page.getByRole('radio', { name: 'A4' }).check();
  await expect(page.getByLabel('Width')).toHaveValue('210');
  await addFiles(page, 'tests/fixtures/rotated.jpg');
  // The portrait photo (360 x 480) uses the box as it is: 2480 x 3508 px at 300 DPI, fitted by width.
  await expect(page.getByText(/360 × 480 → 2480 × 3307 px at 300 DPI/)).toBeVisible();
});

test('resize-to-cm offers JPG and PNG only', async ({ page }) => {
  await page.goto('/resize-to-cm/');
  await expect(page.getByRole('radio', { name: 'WebP' })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'AVIF' })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'JPG' })).toBeVisible();
});
