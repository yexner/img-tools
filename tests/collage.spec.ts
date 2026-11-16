import { expect, test } from '@playwright/test';
import {
  addFiles,
  decoded,
  makePng,
  openTool,
  pixelAt as pixel,
  runAndDownload,
} from './helpers/run';

test.skip(!!process.env.ANALYTICS_BUILD, 'runs against the analytics-off build');

const near = (px: number[], want: number[]) =>
  px.slice(0, 3).every((v, i) => Math.abs(v - want[i]) < 12);

async function addFour(page: import('@playwright/test').Page) {
  const colors: [string, string][] = [
    ['red', 'rgb(255 0 0)'],
    ['green', 'rgb(0 255 0)'],
    ['blue', 'rgb(0 0 255)'],
    ['yellow', 'rgb(255 255 0)'],
  ];
  const files = [];
  for (const [name, fill] of colors) {
    files.push({
      name: `${name}.png`,
      mimeType: 'image/png',
      buffer: Buffer.from(await makePng(page, 100, 50, fill)),
    });
  }
  await addFiles(page, files);
}

test('photo-collage lays photos out in square cells, row by row', async ({ page }) => {
  await openTool(page, 'photo-collage');
  await addFour(page);
  await page.getByRole('radio', { name: '2' }).check();
  await page.getByLabel('Gap').fill('0');
  await page.getByLabel('Margin').fill('0');
  await page.getByLabel('Output width').fill('400');
  await page.getByRole('radio', { name: 'PNG' }).check();
  await expect(page.getByRole('img', { name: 'Preview of the collage' })).toBeVisible();
  const out = await runAndDownload(page);
  expect(out.name).toBe('collage.png');
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({ w: 400, h: 400 });
  expect(near(await pixel(page, out.bytes, 'image/png', 100, 100), [255, 0, 0])).toBe(true);
  expect(near(await pixel(page, out.bytes, 'image/png', 300, 100), [0, 255, 0])).toBe(true);
  expect(near(await pixel(page, out.bytes, 'image/png', 100, 300), [0, 0, 255])).toBe(true);
  expect(near(await pixel(page, out.bytes, 'image/png', 300, 300), [255, 255, 0])).toBe(true);
});

test('photo-collage uses the order, gap, margin and background color', async ({ page }) => {
  await openTool(page, 'photo-collage');
  await addFour(page);
  await page.getByRole('radio', { name: '2' }).check();
  await page.getByLabel('Gap').fill('20');
  await page.getByLabel('Margin').fill('10');
  await page.getByLabel('Output width').fill('420');
  await page.getByRole('radio', { name: 'PNG' }).check();
  await page.getByLabel('Background color', { exact: true }).fill('#336699');
  // Yellow first.
  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: 'Move yellow.png up' }).click();
  const out = await runAndDownload(page);
  // cell = (420 - 20 - 20) / 2 = 190: height = 10 + 190 + 20 + 190 + 10 = 420
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({ w: 420, h: 420 });
  expect(near(await pixel(page, out.bytes, 'image/png', 105, 105), [255, 255, 0])).toBe(true);
  expect(near(await pixel(page, out.bytes, 'image/png', 315, 105), [255, 0, 0])).toBe(true);
  expect(near(await pixel(page, out.bytes, 'image/png', 5, 5), [0x33, 0x66, 0x99])).toBe(true);
  expect(near(await pixel(page, out.bytes, 'image/png', 205, 105), [0x33, 0x66, 0x99])).toBe(true); // the gap
});

test('photo-collage cuts each photo from the center', async ({ page }) => {
  await openTool(page, 'photo-collage');
  // 300 x 100: red | green | blue thirds. The center square is the green third.
  const png = await page.evaluate(async () => {
    const c = new OffscreenCanvas(300, 100);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgb(255 0 0)';
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = 'rgb(0 255 0)';
    ctx.fillRect(100, 0, 100, 100);
    ctx.fillStyle = 'rgb(0 0 255)';
    ctx.fillRect(200, 0, 100, 100);
    return [...new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer())];
  });
  await addFiles(page, { name: 'wide.png', mimeType: 'image/png', buffer: Buffer.from(png) });
  await page.getByRole('radio', { name: '1' }).check();
  await page.getByLabel('Gap').fill('0');
  await page.getByLabel('Margin').fill('0');
  await page.getByLabel('Output width').fill('200');
  await page.getByRole('radio', { name: 'PNG' }).check();
  const out = await runAndDownload(page);
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({ w: 200, h: 200 });
  for (const [x, y] of [
    [5, 5],
    [195, 5],
    [100, 100],
    [5, 195],
  ]) {
    expect(near(await pixel(page, out.bytes, 'image/png', x, y), [0, 255, 0])).toBe(true);
  }
});

test('photo-collage refuses a collage too tall to draw', async ({ page }) => {
  await openTool(page, 'photo-collage');
  const png = await makePng(page, 10, 10);
  const files = Array.from({ length: 12 }, (_, i) => ({
    name: `p${i}.png`,
    mimeType: 'image/png',
    buffer: Buffer.from(png),
  }));
  await addFiles(page, files);
  await page.getByRole('radio', { name: '1' }).check();
  await page.getByLabel('Output width').fill('4000');
  await page.locator('button.primary').first().click();
  await expect(page.getByRole('alert')).toContainText('px tall');
});
