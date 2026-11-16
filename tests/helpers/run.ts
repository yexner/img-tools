// Shared helpers for the e2e specs that check what a tool really writes.
import { expect, type Page } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32 } from '../../src/lib/core/png';

/** Opens a tool page and waits until it has hydrated (files added or clicks made earlier are lost). */
export async function openTool(page: Page, slug: string) {
  await page.goto(`/${slug}/`);
  await page.locator('body[data-ready]').waitFor();
}

/** Adds files to the page's file input once the page is ready. */
export async function addFiles(page: Page, files: Parameters<Page['setInputFiles']>[1]) {
  await page.locator('body[data-ready]').waitFor();
  await page.locator('input[type=file]').setInputFiles(files);
}

/** Opens a tool, adds the files, runs it and returns the downloaded file. */
export async function convert(
  page: Page,
  slug: string,
  files: Parameters<Page['setInputFiles']>[1],
  /** Set to false when the test already opened the page and changed settings. */
  open = true,
) {
  if (open) {
    await openTool(page, slug);
  }
  await addFiles(page, files);
  return runAndDownload(page);
}

/** Presses the tool's run button and returns the downloaded file (the files are already added). */
export async function runAndDownload(page: Page) {
  await page.locator('button.primary').first().click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page
      .getByRole('button', { name: /^Download( all \(ZIP\))?$/ })
      .first()
      .click(),
  ]);
  const path = await download.path();
  return { name: download.suggestedFilename(), bytes: new Uint8Array(readFileSync(path)) };
}

/** Width, height and first pixel of an image, read back through the browser's own decoder. */
export async function decoded(page: Page, bytes: Uint8Array, type: string) {
  return page.evaluate(
    async ({ data, type }) => {
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(data)], { type }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      return { w: bitmap.width, h: bitmap.height, px: [...ctx.getImageData(1, 1, 1, 1).data] };
    },
    { data: [...bytes], type },
  );
}

/** RGBA of one pixel of an image, read back through the browser's own decoder. */
export async function pixelAt(page: Page, bytes: Uint8Array, type: string, x: number, y: number) {
  return page.evaluate(
    async ({ data, type, x, y }) => {
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(data)], { type }));
      const c = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = c.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      return [...ctx.getImageData(x, y, 1, 1).data];
    },
    { data: [...bytes], type, x, y },
  );
}

/** A fixture as an in-memory upload, for mixing with generated files. */
export const upload = (name: string, mimeType: string) => ({
  name,
  mimeType,
  buffer: readFileSync(`tests/fixtures/${name}`),
});

/** A PNG of the given size and color made in the browser, so tests need no binary fixture. */
export async function makePng(page: Page, width: number, height: number, fill = 'rgb(200 30 30)') {
  return page.evaluate(
    async ({ width, height, fill }) => {
      const c = new OffscreenCanvas(width, height);
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, width, height);
      return [
        ...new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer()),
      ];
    },
    { width, height, fill },
  );
}

export { expect };

/** Inserts a `tEXt` chunk (a metadata comment) before IEND, to check that tools drop it. */
export function addPngText(png: Uint8Array, keyword: string, text: string): Uint8Array {
  const body = new TextEncoder().encode(`${keyword}\0${text}`);
  const type = new TextEncoder().encode('tEXt');
  const chunk = new Uint8Array(12 + body.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, body.length);
  chunk.set(type, 4);
  chunk.set(body, 8);
  const crcInput = new Uint8Array(4 + body.length);
  crcInput.set(type);
  crcInput.set(body, 4);
  view.setUint32(8 + body.length, crc32(crcInput));
  const end = png.length - 12; // IEND is the last 12 bytes
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, end));
  out.set(chunk, end);
  out.set(png.subarray(end), end + chunk.length);
  return out;
}

export const hasText = (bytes: Uint8Array, text: string) =>
  new TextDecoder('latin1').decode(bytes).includes(text);

/** A smooth gradient with many colors, optionally with transparency, made in the browser. */
export async function makeGradient(page: Page, width: number, height: number, alpha = false) {
  return page.evaluate(
    async ({ width, height, alpha }) => {
      const c = new OffscreenCanvas(width, height);
      const ctx = c.getContext('2d')!;
      const g = ctx.createLinearGradient(0, 0, width, height);
      g.addColorStop(0, 'rgb(255 40 40)');
      g.addColorStop(0.5, 'rgb(40 220 90)');
      g.addColorStop(1, 'rgb(40 60 255)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      if (alpha) {
        ctx.globalCompositeOperation = 'destination-in';
        const m = ctx.createLinearGradient(0, 0, 0, height);
        m.addColorStop(0, 'rgba(0,0,0,1)');
        m.addColorStop(1, 'rgba(0,0,0,0.2)');
        ctx.fillStyle = m;
        ctx.fillRect(0, 0, width, height);
      }
      return [
        ...new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer()),
      ];
    },
    { width, height, alpha },
  );
}

/** How many different colors (RGBA) an image holds, and its smallest alpha. */
export async function colorStats(page: Page, bytes: Uint8Array) {
  return page.evaluate(
    async (data) => {
      const bitmap = await createImageBitmap(
        new Blob([new Uint8Array(data)], { type: 'image/png' }),
      );
      const c = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = c.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      const px = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
      const seen = new Set<number>();
      let minAlpha = 255;
      for (let i = 0; i < px.length; i += 4) {
        seen.add(((px[i] << 24) | (px[i + 1] << 16) | (px[i + 2] << 8) | px[i + 3]) >>> 0);
        minAlpha = Math.min(minAlpha, px[i + 3]);
      }
      return { colors: seen.size, minAlpha };
    },
    [...bytes],
  );
}

/** Runs exiftool on some bytes and returns its output lines; null when exiftool is not installed. */
export function exiftool(bytes: Uint8Array, name: string, args: string[]): string[] | null {
  const path = join(mkdtempSync(join(tmpdir(), 'exif-')), name);
  writeFileSync(path, bytes);
  const r = spawnSync('exiftool', [...args, path], { encoding: 'utf8' });
  return r.error ? null : r.stdout.trim().split('\n').filter(Boolean);
}

/** Presses the Download button of a tool that has no run button, and returns the file. */
export async function downloadNow(page: Page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  return {
    name: download.suggestedFilename(),
    bytes: new Uint8Array(readFileSync((await download.path())!)),
  };
}
