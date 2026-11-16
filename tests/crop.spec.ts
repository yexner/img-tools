// Checks the crop tools: the editor, the number fields, the keyboard and the pixels that are written.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
import {
  addFiles,
  convert,
  decoded,
  makePng,
  openTool,
  pixelAt as pixel,
  runAndDownload,
} from './helpers/run';

test.skip(!!process.env.ANALYTICS_BUILD, 'runs against the analytics-off build');

const source = new Uint8Array(readFileSync('tests/fixtures/sample.png'));

const field = (page: Page, name: string) => page.getByRole('spinbutton', { name, exact: true });
const box = (page: Page) => page.getByRole('group', { name: /^Crop box for/ });

async function open(page: Page, slug = 'crop-image', file = 'tests/fixtures/sample.png') {
  await openTool(page, slug);
  await addFiles(page, file);
  await expect(box(page)).toBeVisible();
}

test('crop-image starts with a centered box and crops exactly that part', async ({ page }) => {
  await open(page);
  await expect(field(page, 'Left')).toHaveValue('48');
  await expect(field(page, 'Top')).toHaveValue('36');
  await expect(field(page, 'Width')).toHaveValue('384');
  await expect(field(page, 'Height')).toHaveValue('288');
  const out = await runAndDownload(page);
  expect(out.name).toBe('sample-cropped.png');
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({ w: 384, h: 288 });
  for (const [x, y] of [
    [0, 0],
    [100, 100],
    [383, 287],
  ]) {
    expect(await pixel(page, out.bytes, 'image/png', x, y)).toEqual(
      await pixel(page, source, 'image/png', x + 48, y + 36),
    );
  }
});

test('crop-image follows the number fields exactly', async ({ page }) => {
  await open(page);
  await field(page, 'Left').fill('10');
  await field(page, 'Top').fill('20');
  await field(page, 'Width').fill('100');
  await field(page, 'Height').fill('50');
  await field(page, 'Height').blur();
  const out = await runAndDownload(page);
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({ w: 100, h: 50 });
  expect(await pixel(page, out.bytes, 'image/png', 5, 5)).toEqual(
    await pixel(page, source, 'image/png', 15, 25),
  );
});

test('crop-image can be moved and resized with the keyboard', async ({ page }) => {
  await open(page);
  await box(page).focus();
  await page.keyboard.press('ArrowRight');
  await expect(field(page, 'Left')).toHaveValue('49');
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(field(page, 'Left')).toHaveValue('39');
  await page.keyboard.press('ArrowDown');
  await expect(field(page, 'Top')).toHaveValue('37');
  await page.keyboard.press('Control+ArrowLeft');
  await expect(field(page, 'Width')).toHaveValue('383');
  await page.keyboard.press('Control+Shift+ArrowUp');
  await expect(field(page, 'Height')).toHaveValue('278');
  // It never leaves the picture.
  for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+ArrowLeft');
  await expect(field(page, 'Left')).toHaveValue('0');
});

test('crop-image can be dragged with the mouse', async ({ page }) => {
  await open(page);
  await box(page).scrollIntoViewIfNeeded();
  const b = (await box(page).boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 30, b.y + b.height / 2 + 20, { steps: 4 });
  await page.mouse.up();
  const left = Number(await field(page, 'Left').inputValue());
  const top = Number(await field(page, 'Top').inputValue());
  expect(left).toBeGreaterThan(48);
  expect(top).toBeGreaterThan(36);
  // A corner handle makes the box bigger (the top-left one is on screen in a small window).
  await box(page).scrollIntoViewIfNeeded();
  const nb = (await box(page).boundingBox())!;
  await page.mouse.move(nb.x, nb.y);
  await page.mouse.down();
  await page.mouse.move(nb.x - 20, nb.y - 20, { steps: 4 });
  await page.mouse.up();
  expect(Number(await field(page, 'Width').inputValue())).toBeGreaterThan(384);
});

test('crop-image keeps a chosen shape while resizing and when typing', async ({ page }) => {
  await open(page);
  await page.getByRole('radio', { name: '1:1' }).check();
  const w = Number(await field(page, 'Width').inputValue());
  const h = Number(await field(page, 'Height').inputValue());
  expect(w).toBe(h);
  await field(page, 'Width').fill('100');
  await field(page, 'Width').blur();
  await expect(field(page, 'Height')).toHaveValue('100');
  const out = await runAndDownload(page);
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({ w: 100, h: 100 });
});

test('crop-image can use a custom ratio', async ({ page }) => {
  await open(page);
  await page.getByRole('radio', { name: 'Custom' }).check();
  await page.getByLabel('Ratio width').fill('2');
  await page.getByLabel('Ratio height').fill('1');
  await page.getByRole('radio', { name: '16:9' }).check(); // switch away and back to refresh
  await page.getByRole('radio', { name: 'Custom' }).check();
  const w = Number(await field(page, 'Width').inputValue());
  const h = Number(await field(page, 'Height').inputValue());
  expect(w / h).toBeCloseTo(2, 1);
});

test('crop-image applies one crop to every image as the same relative part', async ({ page }) => {
  await openTool(page, 'crop-image');
  const small = await makePng(page, 200, 100, 'rgb(10 200 10)');
  await addFiles(page, [
    { name: 'a.png', mimeType: 'image/png', buffer: Buffer.from(source) },
    { name: 'b.png', mimeType: 'image/png', buffer: Buffer.from(small) },
  ]);
  await expect(box(page)).toBeVisible();
  // Left half of the first picture (480 x 360): x 0, width 240.
  await field(page, 'Left').fill('0');
  await field(page, 'Left').blur();
  await field(page, 'Width').fill('240');
  await field(page, 'Width').blur();
  await field(page, 'Top').fill('0');
  await field(page, 'Top').blur();
  await field(page, 'Height').fill('360');
  await field(page, 'Height').blur();
  await page.getByRole('button', { name: 'Apply this crop to all images' }).click();
  const out = await runAndDownload(page);
  expect(out.name).toBe('img-tools-crop-image.zip');
  const files = unzipSync(out.bytes);
  expect(Object.keys(files).sort()).toEqual(['a-cropped.png', 'b-cropped.png']);
  expect(await decoded(page, files['a-cropped.png'], 'image/png')).toMatchObject({
    w: 240,
    h: 360,
  });
  expect(await decoded(page, files['b-cropped.png'], 'image/png')).toMatchObject({
    w: 100,
    h: 100,
  });
});

test('crop-image gives each picture its own box until a crop is applied to all', async ({
  page,
}) => {
  await openTool(page, 'crop-image');
  const small = await makePng(page, 200, 100);
  await addFiles(page, [
    { name: 'a.png', mimeType: 'image/png', buffer: Buffer.from(source) },
    { name: 'b.png', mimeType: 'image/png', buffer: Buffer.from(small) },
  ]);
  await expect(box(page)).toBeVisible();
  await field(page, 'Width').fill('100');
  await field(page, 'Width').blur();
  await page.getByRole('button', { name: 'Select b.png' }).click();
  // The other picture still has its own default box, not the edited one.
  await expect(field(page, 'Width')).toHaveValue('160');
  await page.getByRole('button', { name: 'Select a.png' }).click();
  await expect(field(page, 'Width')).toHaveValue('100');
});

test('crop-image keeps photos upright', async ({ page }) => {
  await open(page, 'crop-image', 'tests/fixtures/rotated.jpg');
  // The photo is shown as displayed: 360 wide, 480 tall.
  await expect(page.getByText('Picture: 360 × 480 px')).toBeVisible();
  const out = await runAndDownload(page);
  expect(await decoded(page, out.bytes, 'image/jpeg')).toMatchObject({ w: 288, h: 384 });
});

test('crop-image keeps the format of the original by default', async ({ page }) => {
  const out = await convert(page, 'crop-image', 'tests/fixtures/sample.jpg');
  expect(out.name).toBe('sample-cropped.jpg');
});

test('bulk-crop applies one box to every picture and shows it on each', async ({ page }) => {
  await openTool(page, 'bulk-crop');
  const wide = await makePng(page, 400, 100, 'rgb(10 200 10)');
  const tall = await makePng(page, 100, 300, 'rgb(200 10 10)');
  await addFiles(page, [
    { name: 'a.png', mimeType: 'image/png', buffer: Buffer.from(source) },
    { name: 'wide.png', mimeType: 'image/png', buffer: Buffer.from(wide) },
    { name: 'tall.png', mimeType: 'image/png', buffer: Buffer.from(tall) },
  ]);
  await expect(box(page)).toBeVisible();
  // One thumbnail per picture shows the crop.
  await expect(page.getByRole('button', { name: /^Select (a|wide|tall)\.png$/ })).toHaveCount(6); // tray + grid
  // Select the left half of the whole height on the first picture (480 x 360).
  for (const [name, value] of [
    ['Left', '0'],
    ['Top', '0'],
    ['Width', '240'],
    ['Height', '360'],
  ] as const) {
    await field(page, name).fill(value);
    await field(page, name).blur();
  }
  const out = await runAndDownload(page);
  const files = unzipSync(out.bytes);
  expect(await decoded(page, files['a-cropped.png'], 'image/png')).toMatchObject({
    w: 240,
    h: 360,
  });
  expect(await decoded(page, files['wide-cropped.png'], 'image/png')).toMatchObject({
    w: 200,
    h: 100,
  });
  expect(await decoded(page, files['tall-cropped.png'], 'image/png')).toMatchObject({
    w: 50,
    h: 300,
  });
});

test('bulk-crop keeps a fixed shape on pictures of any shape', async ({ page }) => {
  await openTool(page, 'bulk-crop');
  const wide = await makePng(page, 400, 100);
  const tall = await makePng(page, 100, 300);
  await addFiles(page, [
    { name: 'a.png', mimeType: 'image/png', buffer: Buffer.from(source) },
    { name: 'wide.png', mimeType: 'image/png', buffer: Buffer.from(wide) },
    { name: 'tall.png', mimeType: 'image/png', buffer: Buffer.from(tall) },
  ]);
  await expect(box(page)).toBeVisible();
  await page.getByRole('radio', { name: '1:1' }).check();
  const out = await runAndDownload(page);
  const files = unzipSync(out.bytes);
  for (const name of ['a-cropped.png', 'wide-cropped.png', 'tall-cropped.png']) {
    const r = await decoded(page, files[name], 'image/png');
    expect(r.w, name).toBe(r.h);
  }
});

test('bulk-crop: picking a thumbnail makes it the picture being edited', async ({ page }) => {
  await openTool(page, 'bulk-crop');
  const small = await makePng(page, 200, 100);
  await addFiles(page, [
    { name: 'a.png', mimeType: 'image/png', buffer: Buffer.from(source) },
    { name: 'b.png', mimeType: 'image/png', buffer: Buffer.from(small) },
  ]);
  await expect(page.getByText('Picture: 480 × 360 px')).toBeVisible();
  await page.getByRole('button', { name: 'Select b.png' }).last().click();
  await expect(page.getByText('Picture: 200 × 100 px')).toBeVisible();
});

test('crop-image shape Circle starts as a circle, Oval allows any size, Circle snaps back', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('radio', { name: 'Circle' }).check();
  // A centered circle: as wide as it is tall.
  const w0 = Number(await field(page, 'Width').inputValue());
  expect(Number(await field(page, 'Height').inputValue())).toBe(w0);
  await page.getByRole('radio', { name: 'Oval' }).check();
  await field(page, 'Width').fill('300');
  await field(page, 'Width').blur();
  expect(Number(await field(page, 'Height').inputValue())).not.toBe(300);
  await page.getByRole('radio', { name: 'Circle' }).check();
  const w = Number(await field(page, 'Width').inputValue());
  const h = Number(await field(page, 'Height').inputValue());
  expect(Math.abs(w - h)).toBeLessThanOrEqual(1);
});

test('crop-image with the circle shape writes a PNG that is transparent outside the circle', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('radio', { name: 'Circle' }).check();
  await expect(page.getByText(/The outside of the circle is transparent/)).toBeVisible();
  const out = await runAndDownload(page);
  expect(out.name).toBe('sample-cropped.png');
  const r = await decoded(page, out.bytes, 'image/png');
  expect(r.w).toBe(r.h);
  // The corner is outside the circle; the middle is inside.
  expect((await pixel(page, out.bytes, 'image/png', 0, 0))[3]).toBe(0);
  expect((await pixel(page, out.bytes, 'image/png', r.w - 1, r.h - 1))[3]).toBe(0);
  expect((await pixel(page, out.bytes, 'image/png', r.w >> 1, r.h >> 1))[3]).toBe(255);
});

test('crop-image with the oval shape keeps a non-square size and transparent corners', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('radio', { name: 'Oval' }).check();
  await field(page, 'Width').fill('300');
  await field(page, 'Height').fill('150');
  await field(page, 'Height').blur();
  const out = await runAndDownload(page);
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({ w: 300, h: 150 });
  expect((await pixel(page, out.bytes, 'image/png', 0, 0))[3]).toBe(0);
  expect((await pixel(page, out.bytes, 'image/png', 150, 75))[3]).toBe(255);
});

test('crop-image circle can scale the result and offers PNG and WebP only', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('radio', { name: 'JPG' })).toBeVisible();
  await page.getByRole('radio', { name: 'Circle' }).check();
  await expect(page.getByRole('radio', { name: 'JPG' })).toHaveCount(0);
  await page.getByRole('radio', { name: '256 px' }).check();
  await page.getByRole('radio', { name: 'WebP' }).check();
  const out = await runAndDownload(page);
  expect(out.name).toBe('sample-cropped.webp');
  expect(await decoded(page, out.bytes, 'image/webp')).toMatchObject({ w: 256, h: 256 });
  expect((await pixel(page, out.bytes, 'image/webp', 0, 0))[3]).toBe(0);
});

test('social-media-resizer crops each size around the focal point without stretching', async ({
  page,
}) => {
  await openTool(page, 'social-media-resizer');
  // 400 x 200: red on the left half, blue on the right half.
  const png = await page.evaluate(async () => {
    const c = new OffscreenCanvas(400, 200);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgb(255 0 0)';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = 'rgb(0 0 255)';
    ctx.fillRect(200, 0, 200, 200);
    return [...new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer())];
  });
  await addFiles(page, { name: 'two.png', mimeType: 'image/png', buffer: Buffer.from(png) });
  // Only two sizes: Instagram square and X header.
  for (const none of await page.getByRole('button', { name: 'None' }).all()) await none.click();
  await page.getByRole('checkbox', { name: /Square post/ }).check();
  await page.getByRole('checkbox', { name: /Header image/ }).check();
  // The focal point goes to the far right: the square must be blue.
  const dot = page.getByRole('group', { name: /^Focal point/ });
  await dot.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+ArrowRight');
  for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+ArrowRight');
  const out = await runAndDownload(page);
  const files = unzipSync(out.bytes);
  expect(Object.keys(files).sort()).toEqual([
    'instagram-square-1080x1080.jpg',
    'x-header-1500x500.jpg',
  ]);
  const square = await decoded(page, files['instagram-square-1080x1080.jpg'], 'image/jpeg');
  expect(square).toMatchObject({ w: 1080, h: 1080 });
  expect(square.px[2]).toBeGreaterThan(200); // blue
  expect(square.px[0]).toBeLessThan(60);
  const header = await decoded(page, files['x-header-1500x500.jpg'], 'image/jpeg');
  expect(header).toMatchObject({ w: 1500, h: 500 });
});

test('social-media-resizer lists every size with its source and check date', async ({ page }) => {
  await page.goto('/social-media-resizer/');
  for (const p of ['Instagram', 'X', 'LinkedIn', 'YouTube', 'Facebook']) {
    await expect(page.getByRole('group', { name: p })).toBeVisible();
  }
  const links = page.getByRole('link', { name: /source, checked 2026-10-25/ });
  expect(await links.count()).toBeGreaterThanOrEqual(14);
  await expect(links.first()).toHaveAttribute('href', /^https:\/\//);
});
