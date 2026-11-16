// Checks the Creative tools: the live preview and the file that is saved.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  addFiles,
  decoded,
  downloadNow,
  makePng,
  openTool,
  pixelAt as pixelAtOf,
  runAndDownload,
} from './helpers/run';

test.skip(!!process.env.ANALYTICS_BUILD, 'runs against the analytics-off build');

async function gray(page: Page, w = 320, h = 200) {
  return {
    name: 'gray.png',
    mimeType: 'image/png',
    buffer: Buffer.from(await makePng(page, w, h, 'rgb(128 128 128)')),
  };
}

/** Allowed range of each color channel, both ends included. */
type Rule = { r: [number, number]; g: [number, number]; b: [number, number] };

/** Pixels of the preview canvas, or of an image file, as plain numbers. */
async function pixelsOf(page: Page, source: { bytes: Uint8Array } | { canvas: true }) {
  if ('bytes' in source) {
    return page.evaluate(
      async (bytes) => {
        const bm = await createImageBitmap(new Blob([new Uint8Array(bytes)]));
        const c = new OffscreenCanvas(bm.width, bm.height);
        const ctx = c.getContext('2d')!;
        ctx.drawImage(bm, 0, 0);
        return {
          w: bm.width,
          h: bm.height,
          data: [...ctx.getImageData(0, 0, bm.width, bm.height).data],
        };
      },
      [...source.bytes],
    );
  }
  return page.evaluate(() => {
    const c = document.querySelector('canvas')!;
    return {
      w: c.width,
      h: c.height,
      data: [...c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data],
    };
  });
}

/** Count the pixels in a horizontal band (as fractions of the height) whose color is inside the rule. */
async function band(
  page: Page,
  source: { bytes: Uint8Array } | { canvas: true },
  from: number,
  to: number,
  rule: Rule,
) {
  const { w, h, data } = await pixelsOf(page, source);
  let count = 0;
  let x0 = w;
  let x1 = -1;
  for (let y = Math.floor(h * from); y < Math.floor(h * to); y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      if (
        r >= rule.r[0] &&
        r <= rule.r[1] &&
        g >= rule.g[0] &&
        g <= rule.g[1] &&
        b >= rule.b[0] &&
        b <= rule.b[1]
      ) {
        count++;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
      }
    }
  }
  return { count, width: x1 - x0 + 1, w, h };
}

const WHITE: Rule = { r: [241, 255], g: [241, 255], b: [241, 255] };
const BLACK: Rule = { r: [0, 19], g: [0, 19], b: [0, 19] };

test('meme-generator draws white text with a black outline at the top and bottom only where typed', async ({
  page,
}) => {
  await openTool(page, 'meme-generator');
  await addFiles(page, await gray(page));
  await page.getByLabel('Top text').fill('When the tests pass');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForTimeout(150);
  const top = await band(page, { canvas: true }, 0, 0.35, WHITE);
  const topOutline = await band(page, { canvas: true }, 0, 0.35, BLACK);
  const middle = await band(page, { canvas: true }, 0.35, 0.65, WHITE);
  const bottom = await band(page, { canvas: true }, 0.65, 1, WHITE);
  expect(top.count).toBeGreaterThan(200);
  expect(topOutline.count).toBeGreaterThan(200);
  expect(middle.count).toBe(0);
  expect(bottom.count).toBe(0); // no bottom text, so nothing there
  await page.getByLabel('Bottom text').fill('Bottom words');
  await page.waitForTimeout(150);
  expect((await band(page, { canvas: true }, 0.65, 1, WHITE)).count).toBeGreaterThan(200);
});

test('meme-generator: capital letters, colors and the saved file', async ({ page }) => {
  await openTool(page, 'meme-generator');
  await addFiles(page, await gray(page));
  await page.getByLabel('Top text').fill('mmmm');
  await page.waitForTimeout(150);
  const upper = await band(page, { canvas: true }, 0, 0.35, WHITE);
  await page.getByLabel('Capital letters').uncheck();
  await page.waitForTimeout(150);
  const lower = await band(page, { canvas: true }, 0, 0.35, WHITE);
  expect(lower.width).not.toBe(upper.width);
  await page.getByLabel('Capital letters').check();
  await page.getByLabel('Text color', { exact: true }).fill('#ff0000');
  await page.waitForTimeout(150);
  expect(
    (await band(page, { canvas: true }, 0, 0.35, { r: [231, 255], g: [0, 39], b: [0, 39] })).count,
  ).toBeGreaterThan(200);
  expect((await band(page, { canvas: true }, 0, 0.35, WHITE)).count).toBe(0);
  const out = await runAndDownload(page);
  expect(out.name).toBe('gray-meme.jpg');
  expect(await decoded(page, out.bytes, 'image/jpeg')).toMatchObject({ w: 320, h: 200 });
  expect(
    (await band(page, { bytes: out.bytes }, 0, 0.35, { r: [201, 255], g: [0, 79], b: [0, 79] }))
      .count,
  ).toBeGreaterThan(150);
});

test('meme-generator shrinks long text to fit and wraps it to two lines', async ({ page }) => {
  await openTool(page, 'meme-generator');
  await addFiles(page, await gray(page));
  await page.getByLabel('Top text').fill('short');
  await page.waitForTimeout(150);
  const short = await band(page, { canvas: true }, 0, 0.5, WHITE);
  await page
    .getByLabel('Top text')
    .fill('a really quite long sentence that cannot possibly fit on one line');
  await page.waitForTimeout(150);
  const long = await band(page, { canvas: true }, 0, 0.5, WHITE);
  expect(long.width).toBeLessThanOrEqual(long.w * 0.96);
  expect(long.width).toBeGreaterThan(short.width);
  expect(long.count).toBeGreaterThan(short.count);
});

import { layoutFor } from '../src/tools/screenshot-beautifier/logic';

const sample = new Uint8Array(readFileSync('tests/fixtures/sample.png'));

const pixelAt = (page: Page, bytes: Uint8Array, x: number, y: number) =>
  pixelAtOf(page, bytes, 'image/png', x, y);

test('screenshot-beautifier puts the screenshot in a window, unscaled, on a background', async ({
  page,
}) => {
  await openTool(page, 'screenshot-beautifier');
  await addFiles(page, 'tests/fixtures/sample.png');
  await page.getByLabel('Shadow', { exact: true }).uncheck();
  await page.getByLabel('Window title bar').uncheck();
  await page.getByRole('spinbutton', { name: 'Corner radius value' }).fill('0');
  await page.getByRole('spinbutton', { name: 'Corner radius value' }).blur();
  const out = await runAndDownload(page);
  expect(out.name).toBe('sample-framed.png');
  const l = layoutFor(480, 360, {
    padding: 80,
    radius: 0,
    titleBar: false,
    shadow: false,
    shadowStrength: 50,
    shape: 'auto',
  });
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({ w: l.width, h: l.height });
  // The screenshot's own pixels sit in the middle, exactly as they were.
  for (const [x, y] of [
    [0, 0],
    [200, 100],
    [479, 359],
  ]) {
    expect(await pixelAt(page, out.bytes, l.win.x + x, l.win.y + y)).toEqual(
      await pixelAt(page, sample, x, y),
    );
  }
  // The corner shows the background gradient (not the screenshot).
  const corner = await pixelAt(page, out.bytes, 2, 2);
  expect(corner).not.toEqual(await pixelAt(page, sample, 2, 2));
});

test('screenshot-beautifier makes the picture exactly the chosen shape', async ({ page }) => {
  await openTool(page, 'screenshot-beautifier');
  await addFiles(page, 'tests/fixtures/sample.png');
  for (const [label, ratio] of [
    ['1:1', 1],
    ['16:9', 16 / 9],
    ['4:5', 0.8],
  ] as const) {
    await page.getByRole('radio', { name: label, exact: true }).check();
    const out = await runAndDownload(page);
    const r = await decoded(page, out.bytes, 'image/png');
    expect(Math.abs(r.w / r.h - ratio)).toBeLessThan(0.01);
  }
});

test('screenshot-beautifier draws a title bar and a shadow, and takes a solid color', async ({
  page,
}) => {
  await openTool(page, 'screenshot-beautifier');
  await addFiles(page, 'tests/fixtures/sample.png');
  await page.getByRole('radio', { name: 'Solid color' }).check();
  await page.getByLabel('Background color', { exact: true }).fill('#102030');
  const out = await runAndDownload(page);
  const l = layoutFor(480, 360, {
    padding: 80,
    radius: 18,
    titleBar: true,
    shadow: true,
    shadowStrength: 50,
    shape: 'auto',
  });
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({ w: l.width, h: l.height });
  expect(await pixelAt(page, out.bytes, 1, 1)).toEqual([0x10, 0x20, 0x30, 255]);
  // The title bar is light gray.
  const bar = await pixelAt(page, out.bytes, l.win.x + 300, l.win.y + 5);
  expect(bar.slice(0, 3)).toEqual([0xec, 0xee, 0xf2]);
  // Under the window the shadow darkens the solid color's neighborhood only a little.
  const below = await pixelAt(page, out.bytes, l.win.x + 240, l.win.y + l.win.h + 8);
  expect(below[0]).toBeLessThanOrEqual(0x10);
});

test('screenshot-beautifier defaults to a Mac window and can look like Windows or Ubuntu', async ({
  page,
}) => {
  await openTool(page, 'screenshot-beautifier');
  await expect(page.getByRole('radio', { name: 'Mac (OS X)' })).toBeChecked();
  await addFiles(page, 'tests/fixtures/sample.png');
  await page.getByRole('radio', { name: 'Solid color' }).check();
  const l = layoutFor(480, 360, {
    padding: 80,
    radius: 18,
    titleBar: true,
    shadow: true,
    shadowStrength: 50,
    shape: 'auto',
  });
  const barAt = async (name: string) => {
    await page.getByRole('radio', { name }).check();
    const out = await runAndDownload(page);
    // Left of the bar's middle: past the Mac dots, clear of the buttons on the right.
    return (await pixelAt(page, out.bytes, l.win.x + 240, l.win.y + 5)).slice(0, 3);
  };
  expect(await barAt('Mac (OS X)')).toEqual([0xec, 0xee, 0xf2]);
  expect(await barAt('Windows')).toEqual([0xf3, 0xf3, 0xf3]);
  expect(await barAt('Ubuntu / Linux')).toEqual([0x2d, 0x2d, 0x2d]);
});

async function setup(page: Page, w = 320, h = 200) {
  await openTool(page, 'text-on-image');
  await addFiles(page, await gray(page, w, h));
  await expect(page.locator('canvas')).toBeVisible();
}

test('text-on-image adds a layer, shows it in the preview and saves the same picture', async ({
  page,
}) => {
  await setup(page);
  expect((await band(page, { canvas: true }, 0, 1, WHITE)).count).toBe(0);
  await page.getByRole('button', { name: 'Add text' }).click();
  await page.getByLabel('Text', { exact: true }).fill('WORD');
  await page.waitForTimeout(200);
  const shown = await band(page, { canvas: true }, 0, 1, WHITE);
  expect(shown.count).toBeGreaterThan(200);
  const out = await downloadNow(page);
  expect(out.name).toBe('gray-text.png');
  const file = await band(page, { bytes: out.bytes }, 0, 1, WHITE);
  expect(file.w).toBe(320);
  // Same drawing: the white area covers the same share of the picture in the preview and the file.
  expect(Math.abs(file.count / (file.w * file.h) - shown.count / (shown.w * shown.h))).toBeLessThan(
    0.01,
  );
});

test('text-on-image moves a layer by dragging and with the arrow keys', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Add text' }).click();
  await page.getByLabel('Text', { exact: true }).fill('WORD');
  await page.waitForTimeout(200);
  const centerOf = async () => {
    const { w, h, data } = await pixelsOf(page, { canvas: true });
    let sx = 0,
      sy = 0,
      n = 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
          sx += x;
          sy += y;
          n++;
        }
      }
    return { x: sx / n / w, y: sy / n / h };
  };
  const before = await centerOf();
  const frame = page.getByRole('group', { name: /^Preview\. Drag a text layer/ });
  const box = (await frame.boundingBox())!;
  await page.mouse.move(box.x + box.width * before.x, box.y + box.height * before.y);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width * (before.x - 0.2),
    box.y + box.height * (before.y + 0.2),
    { steps: 5 },
  );
  await page.mouse.up();
  await page.waitForTimeout(200);
  const dragged = await centerOf();
  expect(dragged.x).toBeLessThan(before.x - 0.1);
  expect(dragged.y).toBeGreaterThan(before.y + 0.1);
  await frame.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowRight');
  await page.waitForTimeout(200);
  const keyed = await centerOf();
  expect(keyed.x).toBeGreaterThan(dragged.x + 0.1);
});

test('text-on-image has several layers that can be reordered and deleted', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Add text' }).click();
  await page.getByLabel('Text', { exact: true }).fill('ONE');
  await page.getByRole('button', { name: 'Add text' }).click();
  await page.getByLabel('Text', { exact: true }).fill('TWO');
  const items = page.locator('ul.layers li');
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText('ONE');
  await page.getByRole('button', { name: 'Move layer 2 up the list' }).click();
  await expect(items.nth(0)).toContainText('TWO');
  await expect(items.nth(1)).toContainText('ONE');
  await page.getByRole('button', { name: 'Delete layer 1' }).click();
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText('ONE');
});

test('text-on-image: color, background box, alignment and several lines', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Add text' }).click();
  await page.getByLabel('Text', { exact: true }).fill('line one\nline two');
  await page.getByLabel('Text color', { exact: true }).fill('#ff0000');
  await page.waitForTimeout(200);
  expect(
    (await band(page, { canvas: true }, 0, 1, { r: [231, 255], g: [0, 39], b: [0, 39] })).count,
  ).toBeGreaterThan(100);
  expect((await band(page, { canvas: true }, 0, 1, WHITE)).count).toBe(0);
  await page.getByLabel('Background box').check();
  await page.getByLabel('Box color', { exact: true }).fill('#00ff00');
  await page.waitForTimeout(200);
  expect(
    (await band(page, { canvas: true }, 0, 1, { r: [0, 20], g: [235, 255], b: [0, 20] })).count,
  ).toBeGreaterThan(500);
  const small = await band(page, { canvas: true }, 0, 1, { r: [231, 255], g: [0, 39], b: [0, 39] });
  await page.getByRole('radio', { name: 'Left' }).check();
  await page.waitForTimeout(200);
  const left = await band(page, { canvas: true }, 0, 1, { r: [231, 255], g: [0, 39], b: [0, 39] });
  expect(Math.abs(left.count - small.count) / small.count).toBeLessThan(0.1); // the same letters, aligned differently
});

async function colorPhoto(page: Page, w = 200, h = 120) {
  return {
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(await makePng(page, w, h, 'rgb(200 80 20)')),
  };
}

test('photo-filters: black and white gives gray pixels, at the full resolution of the photo', async ({
  page,
}) => {
  await openTool(page, 'photo-filters');
  await addFiles(page, await colorPhoto(page, 1600, 1200));
  await page.getByRole('radio', { name: 'B&W' }).check();
  await page.getByRole('radio', { name: 'PNG' }).check();
  const out = await downloadNow(page);
  expect(out.name).toBe('photo-filtered.png');
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({ w: 1600, h: 1200 });
  const px = await pixelAt(page, out.bytes, 800, 600);
  expect(px[0]).toBe(px[1]);
  expect(px[1]).toBe(px[2]);
  expect(Math.abs(px[0] - (0.2126 * 200 + 0.7152 * 80 + 0.0722 * 20))).toBeLessThan(3);
});

test('photo-filters: the preview follows the settings and Reset puts them back', async ({
  page,
}) => {
  await openTool(page, 'photo-filters');
  await addFiles(page, await colorPhoto(page));
  const filtered = page.getByRole('img', { name: 'Filtered version' });
  await expect(filtered).toBeVisible();
  const read = () =>
    page.evaluate(async () => {
      const img = document.querySelector<HTMLImageElement>('img[alt="Filtered version"]')!;
      await img.decode();
      const c = new OffscreenCanvas(img.naturalWidth, img.naturalHeight);
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      return [...ctx.getImageData(10, 10, 1, 1).data];
    });
  await page.waitForTimeout(400);
  expect((await read()).slice(0, 3)).toEqual([200, 80, 20]);
  await page.getByRole('radio', { name: 'B&W' }).check();
  await expect
    .poll(async () => (await read())[0] === (await read())[1], { timeout: 5000 })
    .toBe(true);
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect
    .poll(async () => (await read()).slice(0, 3).join(), { timeout: 5000 })
    .toBe('200,80,20');
});

test('photo-filters: fade lifts black, brightness and saturation combine, grain is repeatable', async ({
  page,
}) => {
  await openTool(page, 'photo-filters');
  const black = {
    name: 'black.png',
    mimeType: 'image/png',
    buffer: Buffer.from(await makePng(page, 120, 80, 'rgb(0 0 0)')),
  };
  await addFiles(page, black);
  await page.getByRole('radio', { name: 'PNG' }).check();
  await page.getByRole('spinbutton', { name: 'Fade value' }).fill('100');
  await page.getByRole('spinbutton', { name: 'Fade value' }).blur();
  const faded = await downloadNow(page);
  expect((await pixelAt(page, faded.bytes, 10, 10))[0]).toBeGreaterThan(25);
  await page.getByRole('button', { name: 'Reset' }).click();
  await page.getByRole('spinbutton', { name: 'Grain value' }).fill('60');
  await page.getByRole('spinbutton', { name: 'Grain value' }).blur();
  const a = await downloadNow(page);
  const b = await downloadNow(page);
  expect(Buffer.from(a.bytes).equals(Buffer.from(b.bytes))).toBe(true);
  const samples = await Promise.all([10, 20, 30, 40, 50].map((x) => pixelAt(page, a.bytes, x, 10)));
  expect(new Set(samples.map((s) => s[0])).size).toBeGreaterThan(1);
});
