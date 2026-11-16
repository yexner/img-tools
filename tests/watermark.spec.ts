import { expect, test, type Page } from '@playwright/test';
import { addFiles, makePng, openTool, runAndDownload } from './helpers/run';

test.skip(!!process.env.ANALYTICS_BUILD, 'runs against the analytics-off build');

/** Pixels of an image, plus the box that holds every pixel that differs clearly from the background. */
async function analyze(page: Page, bytes: Uint8Array, background: [number, number, number]) {
  return page.evaluate(
    async ({ data, bg }) => {
      const bitmap = await createImageBitmap(
        new Blob([new Uint8Array(data)], { type: 'image/png' }),
      );
      const c = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = c.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      const px = ctx.getImageData(0, 0, c.width, c.height).data;
      let x0 = c.width,
        y0 = c.height,
        x1 = -1,
        y1 = -1;
      const quadrants = [0, 0, 0, 0];
      let brightest = 0;
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          const i = (y * c.width + x) * 4;
          const diff =
            Math.abs(px[i] - bg[0]) + Math.abs(px[i + 1] - bg[1]) + Math.abs(px[i + 2] - bg[2]);
          if (diff > 60) {
            x0 = Math.min(x0, x);
            y0 = Math.min(y0, y);
            x1 = Math.max(x1, x);
            y1 = Math.max(y1, y);
            quadrants[(y < c.height / 2 ? 0 : 2) + (x < c.width / 2 ? 0 : 1)]++;
            brightest = Math.max(brightest, px[i] + px[i + 1] + px[i + 2]);
          }
        }
      }
      return { w: c.width, h: c.height, box: { x0, y0, x1, y1 }, quadrants, brightest };
    },
    { data: [...bytes], bg: background },
  );
}

const NAVY = 'rgb(10 20 60)';
const NAVY_RGB: [number, number, number] = [10, 20, 60];

async function open(page: Page, slug: string, w = 480, h = 360) {
  await openTool(page, slug);
  const png = await makePng(page, w, h, NAVY);
  await page.getByRole('radio', { name: 'PNG' }).check();
  await addFiles(page, { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(png) });
}

test('add-watermark puts the mark in the chosen place at the chosen share of the width', async ({
  page,
}) => {
  await open(page, 'add-watermark');
  await expect(page.getByRole('img', { name: /with the watermark/ })).toBeVisible();
  await page
    .getByLabel("Size (percent of the picture's width)", { exact: false })
    .first()
    .fill('20');
  const out = await runAndDownload(page);
  expect(out.name).toBe('photo-watermarked.png');
  const a = await analyze(page, out.bytes, NAVY_RGB);
  const { box } = a;
  const width = box.x1 - box.x0 + 1;
  // The mark sits bottom right, and is about a fifth of the picture wide (the letters fill most of it).
  expect(box.x0).toBeGreaterThan(a.w / 2);
  expect(box.y0).toBeGreaterThan(a.h / 2);
  expect(width).toBeGreaterThan(a.w * 0.12);
  expect(width).toBeLessThan(a.w * 0.21);
  expect(a.quadrants[0]).toBe(0);
  expect(a.quadrants[3]).toBeGreaterThan(50);
});

test('add-watermark looks the same on small and large pictures', async ({ page }) => {
  const widths: number[] = [];
  for (const [w, h] of [
    [400, 300],
    [1600, 1200],
  ]) {
    await open(page, 'add-watermark', w, h);
    const out = await runAndDownload(page);
    const a = await analyze(page, out.bytes, NAVY_RGB);
    widths.push((a.box.x1 - a.box.x0 + 1) / a.w);
  }
  expect(Math.abs(widths[0] - widths[1])).toBeLessThan(0.02);
  expect(widths[0]).toBeGreaterThan(0.03);
});

test('add-watermark honors the position grid and the opacity', async ({ page }) => {
  await open(page, 'add-watermark');
  await page.getByRole('radio', { name: 'Top left' }).check({ force: true });
  const full = await analyze(page, (await runAndDownload(page)).bytes, NAVY_RGB);
  expect(full.box.x1).toBeLessThan(full.w / 2);
  expect(full.box.y1).toBeLessThan(full.h / 2);
  expect(full.quadrants[3]).toBe(0);
  await open(page, 'add-watermark');
  await page.getByRole('radio', { name: 'Top left' }).check({ force: true });
  await page.getByLabel('Opacity', { exact: true }).first().fill('30');
  const faint = await analyze(page, (await runAndDownload(page)).bytes, NAVY_RGB);
  expect(faint.brightest).toBeLessThan(full.brightest);
});

test('add-watermark can use a logo', async ({ page }) => {
  await open(page, 'add-watermark');
  const logo = await makePng(page, 60, 60, 'rgb(255 0 0)');
  await page.getByRole('radio', { name: 'Logo' }).check();
  await page
    .getByLabel('Logo image')
    .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(logo) });
  await page.getByLabel('Opacity', { exact: true }).first().fill('100');
  await page.getByLabel('Size (percent', { exact: false }).first().fill('20');
  await expect(page.getByRole('img', { name: /with the watermark/ })).toBeVisible();
  const out = await runAndDownload(page);
  const a = await analyze(page, out.bytes, NAVY_RGB);
  const { box } = a;
  expect(box.x1 - box.x0 + 1).toBeGreaterThan(a.w * 0.18);
  expect(box.x1 - box.x0 + 1).toBeLessThan(a.w * 0.21);
});

test('tiled-watermark leaves no clean corner', async ({ page }) => {
  await open(page, 'tiled-watermark', 600, 400);
  await page.getByLabel('Opacity', { exact: true }).first().fill('80');
  const out = await runAndDownload(page);
  const a = await analyze(page, out.bytes, NAVY_RGB);
  for (const q of a.quadrants) expect(q).toBeGreaterThan(200);
  // And it reaches the edges.
  expect(a.box.x0).toBeLessThan(a.w * 0.1);
  expect(a.box.x1).toBeGreaterThan(a.w * 0.9);
  expect(a.box.y0).toBeLessThan(a.h * 0.1);
  expect(a.box.y1).toBeGreaterThan(a.h * 0.9);
});
