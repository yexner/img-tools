// Checks what the Convert tools actually write, not just that a download happens.
import { expect, test, type Page } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
import {
  addFiles,
  convert,
  decoded,
  makeGradient,
  openTool,
  runAndDownload,
  upload,
} from './helpers/run';
import { buildTiff } from './helpers/tiff';

test.skip(!!process.env.ANALYTICS_BUILD, 'runs against the analytics-off build');

const choose = (page: Page, format: 'JPG' | 'PNG' | 'WebP' | 'AVIF') =>
  page.getByRole('radio', { name: format, exact: true }).check();

test('convert-image saves JPG by default, with the format choices and quality shown', async ({
  page,
}) => {
  await openTool(page, 'convert-image');
  for (const f of ['JPG', 'PNG', 'WebP', 'AVIF'])
    await expect(page.getByRole('radio', { name: f, exact: true })).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Quality' })).toBeVisible();
  await choose(page, 'PNG');
  await expect(page.getByRole('slider', { name: 'Quality' })).toHaveCount(0);
  // The old single-purpose tools are gone from the site.
  const tools: { slug: string }[] = await (await page.request.get('/tools.json')).json();
  const slugs = tools.map((t) => t.slug);
  expect(slugs).toContain('convert-image');
  for (const old of ['png-to-jpg', 'heic-to-jpg', 'image-to-webp', 'bmp-tiff-converter'])
    expect(slugs).not.toContain(old);
});

test('convert-image turns a mixed batch of PNG, JPG and a multi-page TIFF into PNG', async ({
  page,
}) => {
  await openTool(page, 'convert-image');
  await choose(page, 'PNG');
  const tiff = buildTiff([
    { width: 8, height: 6, rgb: [255, 0, 0] },
    { width: 8, height: 6, rgb: [0, 255, 0] },
  ]);
  await addFiles(page, [
    upload('sample.png', 'image/png'),
    upload('rotated.jpg', 'image/jpeg'),
    { name: 'scan.tif', mimeType: 'image/tiff', buffer: Buffer.from(tiff) },
  ]);
  const out = await runAndDownload(page);
  expect(out.name).toBe('img-tools-convert-image.zip');
  const files = unzipSync(out.bytes);
  expect(Object.keys(files).sort()).toEqual([
    'rotated.png',
    'sample.png',
    'scan-page-1.png',
    'scan-page-2.png',
  ]);
  expect(await decoded(page, files['sample.png'], 'image/png')).toMatchObject({ w: 480, h: 360 });
  // The rotated photo is written upright.
  expect(await decoded(page, files['rotated.png'], 'image/png')).toMatchObject({ w: 360, h: 480 });
  const second = await decoded(page, files['scan-page-2.png'], 'image/png');
  expect(second).toMatchObject({ w: 8, h: 6 });
  expect(second.px[1]).toBeGreaterThan(200); // the green page
  for (const name of Object.keys(files))
    expect([...files[name].slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
});

test('convert-image reads WebP, AVIF, BMP and TIFF and writes JPG', async ({ page }) => {
  await openTool(page, 'convert-image');
  const file = (name: string, mimeType: string, fixture: string) => ({
    name,
    mimeType,
    buffer: readFileSync(`tests/fixtures/${fixture}`),
  });
  await addFiles(page, [
    file('a.webp', 'image/webp', 'sample.webp'),
    file('b.avif', 'image/avif', 'sample.avif'),
    file('c.bmp', 'image/bmp', 'sample.bmp'),
    file('d.tiff', 'image/tiff', 'sample.tiff'),
  ]);
  const out = await runAndDownload(page);
  const files = unzipSync(out.bytes);
  expect(Object.keys(files).sort()).toEqual(['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg']);
  for (const bytes of Object.values(files))
    expect([...bytes.slice(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
});

test('convert-image decodes HEIC with the fallback decoder', async ({ page }) => {
  const out = await convert(page, 'convert-image', 'tests/fixtures/sample.heic');
  expect(out.name).toBe('sample.jpg');
  expect(out.bytes.slice(0, 3)).toEqual(new Uint8Array([0xff, 0xd8, 0xff]));
  expect(await decoded(page, out.bytes, 'image/jpeg')).toMatchObject({ w: 120, h: 90 });
});

test('convert-image writes HEIC as PNG', async ({ page }) => {
  await openTool(page, 'convert-image');
  await choose(page, 'PNG');
  const out = await convert(page, 'convert-image', 'tests/fixtures/sample.heic', false);
  expect(out.name).toBe('sample.png');
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({ w: 120, h: 90 });
});

test('convert-image quality changes the JPG size', async ({ page }) => {
  await openTool(page, 'convert-image');
  await page.getByRole('slider', { name: 'Quality' }).fill('95');
  const high = await convert(page, 'convert-image', 'tests/fixtures/sample.png', false);
  await page.reload();
  await page.locator('body[data-ready]').waitFor();
  await page.getByRole('slider', { name: 'Quality' }).fill('20');
  const low = await convert(page, 'convert-image', 'tests/fixtures/sample.png', false);
  expect(low.bytes.length).toBeLessThan(high.bytes.length);
  expect(await decoded(page, low.bytes, 'image/jpeg')).toMatchObject({ w: 480, h: 360 });
});

test('convert-image turns transparent areas white for JPG and keeps them for PNG and WebP', async ({
  page,
}) => {
  // A 2x2 PNG with a fully transparent pixel at (1, 1).
  const png = await page.evaluate(async () => {
    const c = new OffscreenCanvas(2, 2);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgb(255 0 0)';
    ctx.fillRect(0, 0, 1, 1);
    const blob = await c.convertToBlob({ type: 'image/png' });
    return [...new Uint8Array(await blob.arrayBuffer())];
  });
  const clear = { name: 'clear.png', mimeType: 'image/png', buffer: Buffer.from(png) };
  const jpg = await convert(page, 'convert-image', clear);
  const px = await decoded(page, jpg.bytes, 'image/jpeg');
  // JPEG blurs the neighboring red pixel a little into this 2x2 picture.
  for (const v of px.px.slice(0, 3)) expect(v).toBeGreaterThan(220);
  await page.reload();
  await page.locator('body[data-ready]').waitFor();
  await choose(page, 'PNG');
  const kept = await convert(page, 'convert-image', clear, false);
  expect((await decoded(page, kept.bytes, 'image/png')).px[3]).toBeLessThan(10);
});

test('convert-image writes a real AVIF at full size and keeps transparency', async ({ page }) => {
  await openTool(page, 'convert-image');
  await choose(page, 'AVIF');
  const out = await convert(page, 'convert-image', 'tests/fixtures/sample.png', false);
  expect(out.name).toBe('sample.avif');
  expect(new TextDecoder().decode(out.bytes.slice(4, 12))).toBe('ftypavif');
  expect(await decoded(page, out.bytes, 'image/avif')).toMatchObject({ w: 480, h: 360 });

  const png = await page.evaluate(async () => {
    const c = new OffscreenCanvas(2, 2);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgb(255 0 0)';
    ctx.fillRect(0, 0, 1, 1);
    const blob = await c.convertToBlob({ type: 'image/png' });
    return [...new Uint8Array(await blob.arrayBuffer())];
  });
  await page.reload();
  await page.locator('body[data-ready]').waitFor();
  await choose(page, 'AVIF');
  const clear = await convert(
    page,
    'convert-image',
    { name: 'clear.png', mimeType: 'image/png', buffer: Buffer.from(png) },
    false,
  );
  expect((await decoded(page, clear.bytes, 'image/avif')).px[3]).toBeLessThan(10);
});

test('a broken TIFF is reported for that file only', async ({ page }) => {
  await openTool(page, 'convert-image');
  await addFiles(page, [
    {
      name: 'broken.tif',
      mimeType: 'image/tiff',
      buffer: Buffer.from('II*\0\x08\0\0\0garbagegarbage'),
    },
    {
      name: 'sample.bmp',
      mimeType: 'image/bmp',
      buffer: readFileSync('tests/fixtures/sample.bmp'),
    },
  ]);
  await page.locator('button.primary').first().click();
  await expect(page.getByText(/cannot be read|could not be read/i).first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Download( all \(ZIP\))?$/ }).first(),
  ).toBeVisible();
});

test('after canceling, a respawned worker still encodes AVIF offline', async ({
  page,
  context,
}) => {
  await openTool(page, 'convert-image');
  await choose(page, 'AVIF');
  // Warm the encoder with one small file while online, as a visitor's first run would.
  await addFiles(page, 'tests/fixtures/sample.png');
  await runAndDownload(page);
  await page.getByRole('button', { name: /^Remove all/ }).click();
  await context.setOffline(true);
  // Big enough that the first encode is still running when Cancel is pressed, even on a fast machine.
  const big = await makeGradient(page, 1400, 1400);
  await addFiles(page, { name: 'big.png', mimeType: 'image/png', buffer: Buffer.from(big) });
  const run = page.locator('button.primary').first();
  await run.click();
  await page.getByRole('button', { name: 'Cancel' }).dispatchEvent('click');
  await expect(run).toBeEnabled();
  await run.click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page
      .getByRole('button', { name: /^Download( all \(ZIP\))?$/ })
      .first()
      .click(),
  ]);
  expect(download.suggestedFilename()).toBe('big.avif');
});

test('image-to-base64 shows the three snippets and the size increase', async ({ page }) => {
  await openTool(page, 'image-to-base64');
  await addFiles(page, 'tests/fixtures/sample.png');
  await expect(page.getByText('data:image/png;base64,').first()).toBeVisible();
  await expect(page.getByText(/becomes .* as text \(\+3\d%\)/)).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download .txt' }).nth(1).click(),
  ]);
  expect(download.suggestedFilename()).toBe('sample-img-tag.txt');
  const text = readFileSync((await download.path())!, 'utf8');
  expect(text).toMatch(/^<img src="data:image\/png;base64,[A-Za-z0-9+/=]+" alt="">$/);
});

/** Runs a local tool if it is installed; returns null when it is not. */
function tool(cmd: string, args: string[]): string | null {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  return r.error ? null : r.stdout + r.stderr;
}

test('image-to-pdf writes one valid page per image, in order, with real sizes', async ({
  page,
}, info) => {
  const transparent = await page.evaluate(async () => {
    const c = new OffscreenCanvas(40, 30);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgb(0 0 255)';
    ctx.fillRect(0, 0, 20, 30); // the right half stays transparent
    return [...new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer())];
  });
  const out = await convert(page, 'image-to-pdf', [
    upload('sample.jpg', 'image/jpeg'),
    upload('rotated.jpg', 'image/jpeg'),
    { name: 'clear.png', mimeType: 'image/png', buffer: Buffer.from(transparent) },
    upload('sample.webp', 'image/webp'),
  ]);
  expect(out.name).toBe('images.pdf');
  const file = info.outputPath('out.pdf');
  writeFileSync(file, out.bytes);
  const text = new TextDecoder('latin1').decode(out.bytes);
  expect(text.startsWith('%PDF-1.4')).toBe(true);
  const boxes = [...text.matchAll(/\/MediaBox \[0 0 (\d+) (\d+)\]/g)].map((m) => [+m[1], +m[2]]);
  // The rotated photo is shown upright, so its page is portrait.
  expect(boxes).toEqual([
    [480, 360],
    [360, 480],
    [40, 30],
    [240, 180],
  ]);
  expect(text).toContain('/DCTDecode');
  expect(text).toContain('/SMask');
  const check = tool('qpdf', ['--check', file]);
  if (check) expect(check).toContain('No syntax or stream encoding errors found');
  const pages = tool('qpdf', ['--show-npages', file]);
  if (pages) expect(pages.trim()).toBe('4');
});

test('image-to-pdf lets you reorder and remove pages', async ({ page }) => {
  await openTool(page, 'image-to-pdf');
  await addFiles(page, [
    'tests/fixtures/sample.jpg',
    'tests/fixtures/sample.png',
    'tests/fixtures/sample.webp',
  ]);
  await page.getByRole('button', { name: 'Move sample.webp up' }).click();
  await page.getByRole('button', { name: 'Remove sample.jpg' }).click();
  await expect(
    page.getByRole('list', { name: 'Files, in order' }).getByRole('listitem'),
  ).toHaveText([/1.*sample\.webp/s, /2.*sample\.png/s]);
  await page.getByRole('button', { name: /^Create PDF from 2 images/ }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  const text = new TextDecoder('latin1').decode(readFileSync((await download.path())!));
  expect([...text.matchAll(/\/MediaBox \[0 0 (\d+) (\d+)\]/g)].map((m) => m[1])).toEqual([
    '240',
    '480',
  ]);
});

test('pdf-to-image renders every page at the chosen resolution', async ({ page }) => {
  const out = await convert(page, 'pdf-to-image', 'tests/fixtures/sample.pdf');
  expect(out.name).toBe('img-tools-pdf-to-image.zip');
  const files = unzipSync(out.bytes);
  expect(Object.keys(files).sort()).toEqual(['sample-page-1.jpg', 'sample-page-2.jpg']);
  // 480 x 360 points at 150 DPI; the second page is the portrait photo.
  expect(await decoded(page, files['sample-page-1.jpg'], 'image/jpeg')).toMatchObject({
    w: 1000,
    h: 750,
  });
  expect(await decoded(page, files['sample-page-2.jpg'], 'image/jpeg')).toMatchObject({
    w: 750,
    h: 1000,
  });
});

test('pdf-to-image draws real text with the shipped fonts', async ({ page }) => {
  await openTool(page, 'pdf-to-image');
  await page.getByRole('radio', { name: 'PNG' }).check();
  await page.getByRole('radio', { name: '72 DPI' }).check();
  await addFiles(page, 'tests/fixtures/text.pdf');
  await page.locator('button.primary').first().click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('text.png');
  const bytes = new Uint8Array(readFileSync((await download.path())!));
  const result = await page.evaluate(
    async (data) => {
      const bitmap = await createImageBitmap(
        new Blob([new Uint8Array(data)], { type: 'image/png' }),
      );
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      const px = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
      let dark = 0;
      for (let i = 0; i < px.length; i += 4) if (px[i] < 100) dark++;
      return { w: bitmap.width, h: bitmap.height, dark };
    },
    [...bytes],
  );
  expect(result).toMatchObject({ w: 300, h: 200 });
  expect(result.dark).toBeGreaterThan(200);
});

test('pdf-to-image asks for the password and rejects a wrong one', async ({ page }) => {
  await openTool(page, 'pdf-to-image');
  await addFiles(page, 'tests/fixtures/locked.pdf');
  await page.locator('button.primary').first().click();
  await page.getByRole('textbox', { name: 'Password for locked.pdf' }).fill('nope');
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'That password is not correct. Try again.' })
    .fill('secret');
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page
      .getByRole('button', { name: /^Download/ })
      .first()
      .click(),
  ]);
  expect(download.suggestedFilename()).toMatch(
    /^locked-page-\d\.jpg$|^img-tools-pdf-to-image\.zip$/,
  );
});

test('pdf-to-image shows a clear message after wrong passwords', async ({ page }) => {
  await openTool(page, 'pdf-to-image');
  await addFiles(page, 'tests/fixtures/locked.pdf');
  await page.locator('button.primary').first().click();
  await page.getByRole('textbox', { name: 'Password for locked.pdf' }).fill('a');
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  for (let i = 0; i < 2; i++) {
    await page.getByRole('textbox', { name: 'That password is not correct. Try again.' }).fill('b');
    await page.getByRole('button', { name: 'OK', exact: true }).click();
  }
  await expect(
    page.getByRole('alert').filter({ hasText: 'That password is not correct.' }),
  ).toBeVisible();
});

/** A blank one-page PDF of the given size in points. */
function blankPdf(size: number): Buffer {
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${size} ${size}] >>`,
  ];
  let out = '%PDF-1.4\n';
  const offsets = objs.map((o, i) => {
    const at = out.length;
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
    return at;
  });
  const xref = out.length;
  out += `xref\n0 4\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out);
}

test('pdf-to-image warns about very large pages before rendering, and can be canceled', async ({
  page,
}) => {
  await openTool(page, 'pdf-to-image');
  await page.getByRole('radio', { name: '300 DPI' }).check();
  await addFiles(page, { name: 'poster.pdf', mimeType: 'application/pdf', buffer: blankPdf(5000) });
  await page.locator('button.primary').first().click();
  const dialog = page.locator('form.dialog');
  await expect(dialog).toContainText('very large pages');
  await expect(dialog).toContainText(/rendered at \d+ DPI instead/);
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Canceled.')).toBeVisible();
});
