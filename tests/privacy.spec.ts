// Checks the Privacy tools: what they show and what they really write.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
import {
  addFiles,
  addPngText,
  convert,
  decoded,
  exiftool,
  hasText,
  makePng,
  openTool,
  runAndDownload,
} from './helpers/run';

test.skip(!!process.env.ANALYTICS_BUILD, 'runs against the analytics-off build');

test('exif-viewer shows groups, location with map links, and all tags', async ({ page }) => {
  await openTool(page, 'exif-viewer');
  await addFiles(page, 'tests/fixtures/photo-gps.jpg');
  const row = page.locator('ul[aria-label="Results"] li');
  await expect(row).toContainText('Testcam');
  await expect(row).toContainText('T-1000');
  await expect(row).toContainText('1/250 s');
  await expect(row).toContainText('f/2.8');
  await expect(row).toContainText('35 mm');
  await expect(row).toContainText('2024:06:15 14:30:00');
  await expect(row).toContainText('48.858400');
  await expect(row).toContainText('2.294500');
  await expect(row).toContainText('35 m');
  const osm = row.getByRole('link', { name: 'Open in OpenStreetMap' });
  await expect(osm).toHaveAttribute('href', /openstreetmap\.org\/\?mlat=48\.8584&mlon=2\.2945/);
  await expect(osm).toHaveAttribute('rel', /noopener/);
  await expect(row.getByRole('link', { name: 'Open in Google Maps' })).toHaveAttribute(
    'href',
    /google\.com\/maps/,
  );
  await row.getByText(/^All tags/).click();
  await expect(row).toContainText('Artist');
  await expect(row).toContainText('Test Person');
});

test('exif-viewer has a clear empty state', async ({ page }) => {
  await openTool(page, 'exif-viewer');
  await addFiles(page, 'tests/fixtures/sample.png');
  await expect(page.getByText('This picture has no metadata.')).toBeVisible();
});

test('gps-extractor lists locations and exports CSV and GPX', async ({ page }) => {
  await openTool(page, 'gps-extractor');
  await addFiles(page, [
    'tests/fixtures/photo-gps.jpg',
    'tests/fixtures/sample.png',
    'tests/fixtures/photo-gps2.jpg',
  ]);
  const rows = page.locator('ul[aria-label="Results"] li');
  await expect(rows.nth(0)).toContainText('48.858400');
  await expect(rows.nth(1)).toContainText('No GPS data');
  await expect(rows.nth(2)).toContainText('-0.124600');
  await expect(page.getByText('3 photos, 2 with a location')).toBeVisible();

  const [csvDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download CSV' }).click(),
  ]);
  expect(csvDownload.suggestedFilename()).toBe('photo-locations.csv');
  const csv = readFileSync((await csvDownload.path())!, 'utf8')
    .trim()
    .split('\r\n');
  expect(csv).toHaveLength(4);
  expect(csv[1]).toMatch(
    /^photo-gps\.jpg,48\.8584,2\.2945,35,2024:06:15 14:30:00,2024-06-15T12:30:00\.000Z,https:\/\/www\.openstreetmap\.org/,
  );
  expect(csv[2]).toBe('sample.png,,,,,,');

  const [gpxDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download GPX' }).click(),
  ]);
  const gpx = readFileSync((await gpxDownload.path())!, 'utf8');
  expect(gpx.match(/<wpt /g)).toHaveLength(2);
  expect(gpx).toContain('<name>photo-gps2.jpg</name>');
  expect(gpx).toContain('<time>2024-07-01T08:00:00.000Z</time>');
  expect(gpx).not.toContain('sample.png');
});

test('gps-extractor only exports the photos that are still listed', async ({ page }) => {
  await openTool(page, 'gps-extractor');
  await addFiles(page, ['tests/fixtures/photo-gps.jpg', 'tests/fixtures/photo-gps2.jpg']);
  await expect(page.getByText('2 photos, 2 with a location')).toBeVisible();
  await page.getByRole('button', { name: 'Remove photo-gps.jpg' }).click();
  await expect(page.getByText('1 photo, 1 with a location')).toBeVisible();
});

test('remove-exif cleans a photo without touching its pixels and says what was removed', async ({
  page,
}) => {
  await openTool(page, 'remove-exif');
  const source = new Uint8Array(readFileSync('tests/fixtures/photo-gps.jpg'));
  const out = await convert(page, 'remove-exif', 'tests/fixtures/photo-gps.jpg', false);
  expect(out.name).toBe('photo-gps-clean.jpg');
  expect(out.bytes.length).toBeLessThan(source.length);
  await expect(
    page.getByText(/Removed: GPS location, camera, date and time, software, \d+ other tags/),
  ).toBeVisible();
  const left = exiftool(out.bytes, 'a.jpg', [
    '-s',
    '-G1',
    '-EXIF:all',
    '-GPS:all',
    '-XMP:all',
    '-IPTC:all',
  ]);
  if (left) expect(left).toEqual([]);
  // The picture data is the same bytes as before.
  const sos = (b: Uint8Array) => b.findIndex((v, i) => v === 0xff && b[i + 1] === 0xda);
  expect(out.bytes.subarray(sos(out.bytes))).toEqual(source.subarray(sos(source)));
  expect(await decoded(page, out.bytes, 'image/jpeg')).toMatchObject({ w: 120, h: 90 });
});

/** The photo with extra bytes in front of its Exif segment, or after its last byte. */
function crafted(kind: 'fill' | 'tail'): Uint8Array {
  const src = new Uint8Array(readFileSync('tests/fixtures/photo-gps.jpg'));
  if (kind === 'tail') return new Uint8Array([...src, ...new TextEncoder().encode('TAIL-MARKER')]);
  let at = 2;
  while (src[at + 1] !== 0xe1) at += 2 + ((src[at + 2] << 8) | src[at + 3]);
  return new Uint8Array([...src.subarray(0, at), 0xff, ...src.subarray(at)]);
}

for (const kind of ['fill', 'tail'] as const) {
  test(`remove-exif leaves no location in a photo with ${kind === 'fill' ? 'fill bytes before a segment' : 'data after the image'}`, async ({
    page,
  }) => {
    const input = crafted(kind);
    const args = ['-s', '-G1', '-EXIF:all', '-GPS:all', '-XMP:all', '-IPTC:all'];
    const before = exiftool(input, 'in.jpg', args);
    if (before) expect(before.join('\n')).toContain('GPSLatitude');
    const out = await convert(
      page,
      'remove-exif',
      { name: 'crafted.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(input) },
      true,
    );
    const left = exiftool(out.bytes, 'a.jpg', args);
    if (left) expect(left).toEqual([]);
    expect(hasText(out.bytes, 'Testcam')).toBe(false);
    expect(hasText(out.bytes, 'TAIL-MARKER')).toBe(false);
  });
}

test('remove-exif turns a photo that is only marked as turned, so it stays upright', async ({
  page,
}) => {
  await openTool(page, 'remove-exif');
  const out = await convert(page, 'remove-exif', 'tests/fixtures/rotated.jpg', false);
  await expect(page.getByText(/saved upright/)).toBeVisible();
  expect(await decoded(page, out.bytes, 'image/jpeg')).toMatchObject({ w: 360, h: 480 });
  const left = exiftool(out.bytes, 'a.jpg', ['-s3', '-Orientation']);
  if (left) expect(left).toEqual([]);
});

test('remove-exif drops PNG text chunks and keeps the pixels', async ({ page }) => {
  await openTool(page, 'remove-exif');
  const png = addPngText(new Uint8Array(await makePng(page, 50, 40)), 'Author', 'secret-name');
  const out = await convert(
    page,
    'remove-exif',
    { name: 'tagged.png', mimeType: 'image/png', buffer: Buffer.from(png) },
    false,
  );
  expect(hasText(out.bytes, 'secret-name')).toBe(false);
  expect(await decoded(page, out.bytes, 'image/png')).toMatchObject({
    w: 50,
    h: 40,
    px: [200, 30, 30, 255],
  });
  await expect(page.getByText(/Removed: 1 other tag\./)).toBeVisible();
});

test('remove-exif saves HEIC as a JPG and says so', async ({ page }) => {
  const out = await convert(page, 'remove-exif', 'tests/fixtures/sample.heic');
  expect(out.name).toBe('sample-clean.jpg');
  await expect(page.getByText(/Saved as JPG/)).toBeVisible();
});

test('remove-exif can save as WebP', async ({ page }) => {
  await openTool(page, 'remove-exif');
  await page.getByRole('radio', { name: 'WebP' }).check();
  const out = await convert(page, 'remove-exif', 'tests/fixtures/photo-gps.jpg', false);
  expect(out.name).toBe('photo-gps-clean.webp');
  expect(new TextDecoder().decode(out.bytes.slice(8, 12))).toBe('WEBP');
  const left = exiftool(out.bytes, 'a.webp', ['-s', '-GPS:all', '-EXIF:Make']);
  if (left) expect(left).toEqual([]);
});

const source = new Uint8Array(readFileSync('tests/fixtures/sample.png'));

async function pixels(page: import('@playwright/test').Page, bytes: Uint8Array, type: string) {
  return page.evaluate(
    async ({ data, type }) => {
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(data)], { type }));
      const c = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = c.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      return {
        w: bitmap.width,
        h: bitmap.height,
        data: [...ctx.getImageData(0, 0, bitmap.width, bitmap.height).data],
      };
    },
    { data: [...bytes], type },
  );
}

/** Draw a region by dragging over a fraction of the picture (relative to its top-left corner). */
async function drawRegion(
  page: import('@playwright/test').Page,
  from: [number, number],
  to: [number, number],
) {
  const editor = page.locator('.editor').first();
  await editor.scrollIntoViewIfNeeded();
  const b = (await editor.boundingBox())!;
  await page.mouse.move(b.x + b.width * from[0], b.y + b.height * from[1]);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * to[0], b.y + b.height * to[1], { steps: 6 });
  await page.mouse.up();
}

test('redact-image paints a solid box and leaves everything else untouched', async ({ page }) => {
  await openTool(page, 'redact-image');
  await page.getByRole('radio', { name: 'PNG' }).check();
  await addFiles(page, 'tests/fixtures/sample.png');
  await expect(page.locator('.editor img')).toBeVisible();
  await drawRegion(page, [0.2, 0.2], [0.5, 0.6]);
  await expect(page.getByText('1 region', { exact: true })).toBeVisible();
  const left = Number(
    await page.getByRole('spinbutton', { name: 'Left', exact: true }).inputValue(),
  );
  const top = Number(await page.getByRole('spinbutton', { name: 'Top', exact: true }).inputValue());
  const w = Number(await page.getByRole('spinbutton', { name: 'Width', exact: true }).inputValue());
  const h = Number(
    await page.getByRole('spinbutton', { name: 'Height', exact: true }).inputValue(),
  );
  expect(w).toBeGreaterThan(100);
  const out = await runAndDownload(page);
  expect(out.name).toBe('sample-redacted.png');
  const [before, after] = await Promise.all([
    pixels(page, source, 'image/png'),
    pixels(page, out.bytes, 'image/png'),
  ]);
  expect([after.w, after.h]).toEqual([480, 360]);
  let inside = 0;
  let changedOutside = 0;
  for (let y = 0; y < after.h; y++) {
    for (let x = 0; x < after.w; x++) {
      const i = (y * after.w + x) * 4;
      const px = after.data.slice(i, i + 4);
      const was = before.data.slice(i, i + 4);
      if (x >= left && x < left + w && y >= top && y < top + h) {
        expect(px).toEqual([0, 0, 0, 255]); // every pixel, exactly
        inside++;
      } else if (px.some((v, k) => v !== was[k])) changedOutside++;
    }
  }
  expect(inside).toBe(w * h);
  expect(changedOutside).toBe(0);
});

test('redact-image can use white or a custom color and several regions', async ({ page }) => {
  await openTool(page, 'redact-image');
  await page.getByRole('radio', { name: 'PNG' }).check();
  await page.getByRole('radio', { name: 'Custom' }).last().check();
  await page.getByLabel('Color', { exact: true }).fill('#00aa55');
  await addFiles(page, 'tests/fixtures/sample.png');
  await expect(page.locator('.editor img')).toBeVisible();
  await drawRegion(page, [0.05, 0.05], [0.25, 0.25]);
  await drawRegion(page, [0.6, 0.6], [0.9, 0.9]);
  await expect(page.getByText('2 regions', { exact: true })).toBeVisible();
  const out = await runAndDownload(page);
  const after = await pixels(page, out.bytes, 'image/png');
  const at = (x: number, y: number) =>
    after.data.slice((y * after.w + x) * 4, (y * after.w + x) * 4 + 4);
  expect(at(80, 60)).toEqual([0, 170, 85, 255]);
  expect(at(360, 270)).toEqual([0, 170, 85, 255]);
});

test('blur-face blurs inside the region only, and the preview shows the result', async ({
  page,
}) => {
  await openTool(page, 'blur-face');
  await page.getByRole('radio', { name: 'PNG' }).check();
  await addFiles(page, 'tests/fixtures/sample.png');
  await expect(page.locator('.editor img')).toBeVisible();
  await drawRegion(page, [0.1, 0.1], [0.9, 0.9]);
  await expect(page.getByRole('img', { name: 'Result with the regions applied' })).toBeVisible();
  const left = Number(
    await page.getByRole('spinbutton', { name: 'Left', exact: true }).inputValue(),
  );
  const top = Number(await page.getByRole('spinbutton', { name: 'Top', exact: true }).inputValue());
  const out = await runAndDownload(page);
  const [before, after] = await Promise.all([
    pixels(page, source, 'image/png'),
    pixels(page, out.bytes, 'image/png'),
  ]);
  const idx = (x: number, y: number) => (y * after.w + x) * 4;
  // Outside the region nothing changed; inside the sharp color bars are softened.
  expect(after.data.slice(idx(2, 2), idx(2, 2) + 4)).toEqual(
    before.data.slice(idx(2, 2), idx(2, 2) + 4),
  );
  const x = left + 5;
  const y = top + 40;
  let edge = 0;
  let edgeBefore = 0;
  for (let k = 0; k < 150; k++) {
    edge += Math.abs(after.data[idx(x + k, y)] - after.data[idx(x + k + 1, y)]);
    edgeBefore += Math.abs(before.data[idx(x + k, y)] - before.data[idx(x + k + 1, y)]);
  }
  expect(edge).toBeLessThan(edgeBefore);
  expect(
    JSON.stringify(after.data.slice(idx(left + 50, top + 50), idx(left + 50, top + 50) + 4)),
  ).not.toBe(
    JSON.stringify(before.data.slice(idx(left + 50, top + 50), idx(left + 50, top + 50) + 4)),
  );
});

// Draws one big region, applies the effect and compares a small window in a corner and in the middle
// of the region box with the original picture.
async function cornerAndCenterChanged(page: Page, slug: string, oval: boolean) {
  await openTool(page, slug);
  await page.getByRole('radio', { name: 'PNG' }).check();
  if (slug === 'blur-face') await page.getByRole('radio', { name: 'Pixelate' }).check();
  if (oval) await page.getByRole('radio', { name: 'Oval' }).check();
  await addFiles(page, 'tests/fixtures/sample.png');
  await expect(page.locator('.editor img')).toBeVisible();
  await drawRegion(page, [0.1, 0.1], [0.9, 0.9]);
  await expect(page.getByText('1 region', { exact: true })).toBeVisible();
  const value = async (name: string) =>
    Number(await page.getByRole('spinbutton', { name, exact: true }).inputValue());
  const [left, top, w, h] = [
    await value('Left'),
    await value('Top'),
    await value('Width'),
    await value('Height'),
  ];
  const out = await runAndDownload(page);
  const [before, after] = await Promise.all([
    pixels(page, source, 'image/png'),
    pixels(page, out.bytes, 'image/png'),
  ]);
  const changed = (x0: number, y0: number) => {
    let n = 0;
    for (let y = y0; y < y0 + 6; y++) {
      for (let x = x0; x < x0 + 6; x++) {
        const i = (y * after.w + x) * 4;
        for (let k = 0; k < 4; k++) if (after.data[i + k] !== before.data[i + k]) n++;
      }
    }
    return n;
  };
  return {
    corners: [
      changed(left, top),
      changed(left + w - 6, top),
      changed(left, top + h - 6),
      changed(left + w - 6, top + h - 6),
    ],
    center: changed(left + (w >> 1) - 3, top + (h >> 1) - 3),
  };
}

test('blur-face with the oval shape leaves the corners of the region box unchanged', async ({
  page,
}) => {
  const r = await cornerAndCenterChanged(page, 'blur-face', true);
  expect(r.corners).toEqual([0, 0, 0, 0]);
  expect(r.center).toBeGreaterThan(0);
});

test('blur-face with the rectangle shape changes the corners of the region box', async ({
  page,
}) => {
  const r = await cornerAndCenterChanged(page, 'blur-face', false);
  for (const c of r.corners) expect(c).toBeGreaterThan(0);
  expect(r.center).toBeGreaterThan(0);
});

test('redact-image with the oval shape paints the ellipse only', async ({ page }) => {
  const r = await cornerAndCenterChanged(page, 'redact-image', true);
  expect(r.corners).toEqual([0, 0, 0, 0]);
  expect(r.center).toBeGreaterThan(0);
});

test('regions can be added, moved with the keyboard and removed', async ({ page }) => {
  await openTool(page, 'redact-image');
  await addFiles(page, 'tests/fixtures/sample.png');
  await expect(page.locator('.editor img')).toBeVisible();
  await page.getByRole('button', { name: 'Add region' }).click();
  await expect(page.getByText('1 region', { exact: true })).toBeVisible();
  const box = page.getByRole('group', { name: /^Region 1:/ });
  await box.focus();
  const left0 = Number(
    await page.getByRole('spinbutton', { name: 'Left', exact: true }).inputValue(),
  );
  await page.keyboard.press('Shift+ArrowRight');
  await expect(page.getByRole('spinbutton', { name: 'Left', exact: true })).toHaveValue(
    String(left0 + 10),
  );
  await page.keyboard.press('Delete');
  await expect(page.getByText('0 regions', { exact: true })).toBeVisible();
});

test('a picture without regions gets a clear message, and regions can be copied to the others', async ({
  page,
}) => {
  await openTool(page, 'redact-image');
  const small = await makePng(page, 200, 100, 'rgb(250 250 250)');
  await page.getByRole('radio', { name: 'PNG' }).check();
  await addFiles(page, [
    { name: 'a.png', mimeType: 'image/png', buffer: Buffer.from(source) },
    { name: 'b.png', mimeType: 'image/png', buffer: Buffer.from(small) },
  ]);
  await expect(page.locator('.editor img')).toBeVisible();
  await page.locator('button.primary').first().click();
  await expect(page.getByText(/has no regions/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Add region' }).click();
  await page.getByRole('button', { name: 'Copy these regions to all other pictures' }).click();
  const out = await runAndDownload(page);
  expect(Object.keys(unzipSync(out.bytes)).sort()).toEqual(['a-redacted.png', 'b-redacted.png']);
  const b = await pixels(page, unzipSync(out.bytes)['b-redacted.png'], 'image/png');
  // The copied region sits in the middle (centered box of a quarter of the picture): black there.
  expect(b.data.slice((50 * b.w + 100) * 4, (50 * b.w + 100) * 4 + 4)).toEqual([0, 0, 0, 255]);
});

test('remove-exif removes everything by default and lets the visitor keep chosen details', async ({
  page,
}) => {
  await openTool(page, 'remove-exif');
  for (const name of [
    'Location (GPS)',
    'Camera, lens and exposure settings',
    'Date and time',
    'Author, copyright, software and description',
    'Other Exif tags, maker notes and the thumbnail',
    'XMP, IPTC and comments',
    'Color profile',
  ]) {
    await expect(page.getByRole('checkbox', { name })).toBeChecked();
  }
  // Keep the camera and the date; remove the rest.
  await page.getByRole('checkbox', { name: 'Camera, lens and exposure settings' }).uncheck();
  await page.getByRole('checkbox', { name: 'Date and time' }).uncheck();
  const out = await convert(page, 'remove-exif', 'tests/fixtures/photo-gps.jpg', false);
  const left = exiftool(out.bytes, 'a.jpg', ['-s', '-EXIF:all', '-GPS:all']);
  if (left) {
    expect(left.some((l) => l.startsWith('Model '))).toBe(true);
    expect(left.some((l) => l.startsWith('DateTimeOriginal '))).toBe(true);
    expect(left.some((l) => l.startsWith('GPS'))).toBe(false);
    expect(left.some((l) => l.startsWith('Artist '))).toBe(false);
  }
});
