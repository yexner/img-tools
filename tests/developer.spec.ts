// Checks the Developer tools: what they show and what they write.
import { expect, test } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
import { readIco } from '../src/lib/core/ico';
import { addFiles, decoded, makePng, openTool, pixelAt, runAndDownload } from './helpers/run';

/** Only Chromium has these permissions; Firefox and WebKit allow a copy that follows a click. */
async function allowClipboard(context: import('@playwright/test').BrowserContext) {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
}

// WebKit does not let a test read the clipboard back, so copying is checked in the other two engines.
test.beforeEach(({ browserName }, testInfo) => {
  test.skip(browserName === 'webkit' && /copies/.test(testInfo.title), 'clipboard cannot be read');
});

test.skip(!!process.env.ANALYTICS_BUILD, 'runs against the analytics-off build');

test('blurhash-generator gives a valid hash, CSS and a tiny image, and follows the detail settings', async ({
  page,
}) => {
  await openTool(page, 'blurhash-generator');
  await addFiles(page, 'tests/fixtures/sample.png');
  const hash = page.locator('.field', { hasText: 'BlurHash' }).first().locator('code');
  await expect(hash).toHaveText(/^[0-9A-Za-z#$%*+,\-.:;=?@[\]^_{|}~]{4,}$/);
  // 4 x 3 detail: 4 + 2 * 12 characters.
  await expect(hash).toHaveText(/^.{28}$/);
  await page.getByRole('spinbutton', { name: 'Detail across value' }).fill('2');
  await page.getByRole('spinbutton', { name: 'Detail across value' }).blur();
  await expect(hash).toHaveText(/^.{16}$/); // 2 x 3: 4 + 12
  await expect(page.getByText('background: linear-gradient')).toBeVisible();
  await expect(page.getByText('data:image/png;base64,').first()).toBeVisible();
  await expect(page.getByRole('img', { name: 'The original' })).toBeVisible();
});

test('blurhash-generator copies the hash', async ({ page, context }) => {
  await allowClipboard(context);
  await openTool(page, 'blurhash-generator');
  await addFiles(page, 'tests/fixtures/sample.png');
  const shown = await page
    .locator('.field', { hasText: 'BlurHash' })
    .first()
    .locator('code')
    .textContent();
  await page
    .locator('.field', { hasText: 'BlurHash' })
    .first()
    .getByRole('button', { name: 'Copy' })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shown);
});

/** A picture with stripes of known colors and widths, plus a clear area, made in the browser. */
async function stripes(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const c = new OffscreenCanvas(100, 100);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgb(255 0 0)';
    ctx.fillRect(0, 0, 50, 50); // 25 % red
    ctx.fillStyle = 'rgb(0 0 255)';
    ctx.fillRect(50, 0, 50, 25); // 12.5 % blue
    ctx.fillStyle = 'rgb(0 255 0)';
    ctx.fillRect(50, 25, 50, 25); // 12.5 % green
    // The bottom half stays transparent.
    return [...new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer())];
  });
}

test('color-palette finds the colors, ignores clear areas and shows the shares', async ({
  page,
}) => {
  await openTool(page, 'color-palette');
  const png = await stripes(page);
  await addFiles(page, { name: 'stripes.png', mimeType: 'image/png', buffer: Buffer.from(png) });
  const swatches = page.locator('ul.swatches li');
  await expect(swatches).toHaveCount(3);
  await expect(swatches.nth(0)).toContainText('#ff0000');
  await expect(swatches.nth(0)).toContainText('rgb(255, 0, 0)');
  await expect(swatches.nth(0)).toContainText('hsl(0, 100%, 50%)');
  await expect(swatches.nth(0)).toContainText('50.0%'); // of the opaque pixels
  await expect(swatches.nth(1)).toContainText('25.0%');
  await expect(swatches.nth(2)).toContainText('25.0%');
  await expect(page.getByText('--color-1: #ff0000;')).toBeVisible();
  await expect(page.getByText('"hex": "#ff0000"')).toBeVisible();
  await expect(page.getByText("1: '#ff0000',")).toBeVisible();
});

test('color-palette copies a swatch when clicked and respects the number of colors', async ({
  page,
  context,
}) => {
  await allowClipboard(context);
  await openTool(page, 'color-palette');
  await addFiles(page, 'tests/fixtures/sample.png');
  await page.getByRole('radio', { name: '4', exact: true }).check();
  await expect(page.locator('ul.swatches li')).toHaveCount(4);
  await page.getByRole('radio', { name: '10', exact: true }).check();
  expect(await page.locator('ul.swatches li').count()).toBeLessThanOrEqual(10);
  expect(await page.locator('ul.swatches li').count()).toBeGreaterThan(5);
  await page.locator('ul.swatches li').first().getByRole('button').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^#[0-9a-f]{6}$/);
});

test('color-palette says so for a fully transparent picture', async ({ page }) => {
  await openTool(page, 'color-palette');
  const clear = await page.evaluate(async () => {
    const c = new OffscreenCanvas(20, 20);
    c.getContext('2d')!.clearRect(0, 0, 20, 20);
    return [...new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer())];
  });
  await addFiles(page, { name: 'clear.png', mimeType: 'image/png', buffer: Buffer.from(clear) });
  await expect(page.getByText('fully transparent')).toBeVisible();
});

async function twoColors(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const c = new OffscreenCanvas(100, 50);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgb(255 0 0)';
    ctx.fillRect(0, 0, 50, 50);
    ctx.fillStyle = 'rgb(18 52 86)';
    ctx.fillRect(50, 0, 50, 50);
    return [...new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer())];
  });
}

test('color-picker reads the exact color under the pointer and copies it on click', async ({
  page,
  context,
}) => {
  await allowClipboard(context);
  await openTool(page, 'color-picker');
  await addFiles(page, {
    name: 'two.png',
    mimeType: 'image/png',
    buffer: Buffer.from(await twoColors(page)),
  });
  const frame = page.getByRole('group', { name: /^Picture\. Arrow keys/ });
  const box = (await frame.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5);
  await expect(page.getByText('#123456', { exact: true })).toBeVisible();
  await expect(page.getByText('rgb(18, 52, 86)')).toBeVisible();
  await expect(page.getByText('hsl(210, 65%, 20%)')).toBeVisible();
  await page.mouse.down();
  await page.mouse.up();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('#123456');
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.up();
  const samples = page.locator('ul.samples li');
  await expect(samples).toHaveCount(2);
  await expect(samples.nth(0)).toContainText('#ff0000'); // newest first
  // A sample copies again.
  await samples.nth(1).getByRole('button').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('#123456');
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(samples).toHaveCount(0);
});

test('color-picker works with the keyboard and keeps the last 24 samples', async ({ page }) => {
  await openTool(page, 'color-picker');
  await addFiles(page, {
    name: 'two.png',
    mimeType: 'image/png',
    buffer: Buffer.from(await twoColors(page)),
  });
  const frame = page.getByRole('group', { name: /^Picture\. Arrow keys/ });
  await frame.focus();
  await page.keyboard.press('ArrowLeft'); // starts in the middle (x 50) and moves to x 49: still red
  await expect(page.getByText('x 49, y 25', { exact: true })).toBeVisible();
  await expect(page.getByText('#ff0000', { exact: true }).first()).toBeVisible();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('#123456', { exact: true }).first()).toBeVisible();
  for (let i = 0; i < 30; i++) await page.keyboard.press('Enter');
  await expect(page.locator('ul.samples li')).toHaveCount(24);
  await page.keyboard.press('Shift+ArrowRight');
  await expect(page.getByText('x 61, y 25', { exact: true })).toBeVisible();
});

const pixelOf = (page: import('@playwright/test').Page, bytes: Uint8Array, x: number, y: number) =>
  pixelAt(page, bytes, 'image/png', x, y);

test('sprite-sheet packs pictures of any size and writes CSS that points at the right places', async ({
  page,
}) => {
  await openTool(page, 'sprite-sheet');
  const make = async (name: string, w: number, h: number, fill: string) => ({
    name,
    mimeType: 'image/png',
    buffer: Buffer.from(await makePng(page, w, h, fill)),
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="rgb(0,0,255)"/></svg>`;
  await addFiles(page, [
    await make('Red Box.png', 40, 30, 'rgb(255 0 0)'),
    await make('green.png', 16, 16, 'rgb(0 255 0)'),
    { name: 'blue.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) },
  ]);
  await expect(page.getByText('3 images · sheet')).toBeVisible();
  await expect(page.getByText('.icon-red-box {')).toBeVisible();
  const out = await runAndDownload(page);
  expect(out.name).toBe('sprite-sheet.zip');
  const files = unzipSync(out.bytes);
  expect(Object.keys(files).sort()).toEqual(['sprite.css', 'sprite.png']);
  const css = new TextDecoder().decode(files['sprite.css']);
  const sheet = files['sprite.png'];
  const colors: Record<string, number[]> = {
    'icon-red-box': [255, 0, 0, 255],
    'icon-green': [0, 255, 0, 255],
    'icon-blue': [0, 0, 255, 255],
  };
  const sizes: Record<string, [number, number]> = {
    'icon-red-box': [40, 30],
    'icon-green': [16, 16],
    'icon-blue': [20, 10],
  };
  for (const [cls, want] of Object.entries(colors)) {
    const block = new RegExp(
      `\\.${cls} \\{\\s*width: (\\d+)px;\\s*height: (\\d+)px;\\s*background-position: (-?\\d+)(?:px)? (-?\\d+)(?:px)?;`,
    ).exec(css)!;
    expect([+block[1], +block[2]]).toEqual(sizes[cls]);
    const x = Math.abs(+block[3]);
    const y = Math.abs(+block[4]);
    expect(await pixelOf(page, sheet, x + 2, y + 2)).toEqual(want);
    expect(await pixelOf(page, sheet, x + sizes[cls][0] - 1, y + sizes[cls][1] - 1)).toEqual(want);
  }
});

test('sprite-sheet can add a 2x version with the media query', async ({ page }) => {
  await openTool(page, 'sprite-sheet');
  const png = await makePng(page, 24, 24);
  await page.getByLabel('Also make a 2× version').check();
  await page.getByRole('spinbutton', { name: 'Gap between images' }).fill('4');
  await addFiles(page, [
    { name: 'a.png', mimeType: 'image/png', buffer: Buffer.from(png) },
    { name: 'b.png', mimeType: 'image/png', buffer: Buffer.from(png) },
  ]);
  await expect(page.getByText('@media (min-resolution: 2dppx)')).toBeVisible();
  const out = await runAndDownload(page);
  const files = unzipSync(out.bytes);
  expect(Object.keys(files).sort()).toEqual(['sprite.css', 'sprite.png', 'sprite@2x.png']);
  const one = await decoded(page, files['sprite.png'], 'image/png');
  const two = await decoded(page, files['sprite@2x.png'], 'image/png');
  expect([two.w, two.h]).toEqual([one.w * 2, one.h * 2]);
  expect(new TextDecoder().decode(files['sprite.css'])).toContain(
    `background-size: ${one.w}px ${one.h}px;`,
  );
});

test('svg-optimizer makes an editor file smaller, shows both pictures and downloads the result', async ({
  page,
}) => {
  await openTool(page, 'svg-optimizer');
  await addFiles(page, 'tests/fixtures/sample.svg');
  await expect(page.getByRole('img', { name: 'The optimized SVG' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'The original SVG' })).toBeVisible();
  const sizes = await page.locator('strong.mono').filter({ hasText: '→' }).textContent();
  expect(sizes).toMatch(/[−-]\d+%/);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('sample.min.svg');
  const text = readFileSync((await download.path())!, 'utf8');
  expect(text).not.toContain('inkscape');
  expect(text).not.toContain('metadata');
  expect(text).toContain('viewBox="0 0 120 80"');
  expect(text.length).toBeLessThan(readFileSync('tests/fixtures/sample.svg', 'utf8').length * 0.7);
});

test('svg-optimizer accepts pasted markup and reports invalid markup', async ({ page }) => {
  await openTool(page, 'svg-optimizer');
  await page
    .getByLabel('Paste SVG markup here')
    .fill(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><!-- c --><rect width="10.00000" height="10" fill="#ff0000"/></svg>',
    );
  await expect(page.getByRole('img', { name: 'The optimized SVG' })).toBeVisible();
  await expect(page.getByText('<svg xmlns="http://www.w3.org/2000/svg"').first()).toBeVisible();
  await page.getByLabel('Paste SVG markup here').fill('<svg><g></svg>');
  await expect(page.getByRole('alert')).toContainText('This is not valid SVG');
});

test('svg-optimizer options change the result, and scripts in an SVG never run', async ({
  page,
}) => {
  await openTool(page, 'svg-optimizer');
  const evil =
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" onload="window.__pwned=1"><script>window.__pwned=2</script><rect width="40" height="40" fill="green"/></svg>';
  await page.getByLabel('Paste SVG markup here').fill(evil);
  await expect(page.getByRole('img', { name: 'The optimized SVG' })).toBeVisible();
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned),
  ).toBeUndefined();

  await page
    .getByLabel('Paste SVG markup here')
    .fill(
      '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect id="r" width="40" height="40" fill="green"/></svg>',
    );
  const out = page.locator('pre').first();
  await expect(out).toContainText('id="r"'); // IDs are kept by default
  await page.getByLabel('Keep IDs').uncheck();
  await expect(out).not.toContainText('id="r"');
  await page.getByLabel('Remove width and height').check();
  await expect(out).not.toContainText('width="40" height="40"');
  await expect(page.getByLabel('Keep the viewBox')).toBeChecked();
});

async function transparentPng(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const c = new OffscreenCanvas(200, 200);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgb(200 30 30)';
    ctx.beginPath();
    ctx.arc(100, 100, 60, 0, Math.PI * 2);
    ctx.fill(); // the corners stay transparent
    return [...new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer())];
  });
}

test('favicon-generator writes every file, with the right sizes, and a head snippet', async ({
  page,
}) => {
  await openTool(page, 'favicon-generator');
  await addFiles(page, {
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(await transparentPng(page)),
  });
  await page.getByLabel('Site name').fill('Test Shop');
  await page.getByLabel('Short name').fill('Shop');
  await page.getByLabel('Theme color', { exact: true }).fill('#336699');
  await page.getByRole('button', { name: 'Create icons' }).click();
  await expect(page.getByText('Your icons are ready.')).toBeVisible();
  await expect(page.getByText('<link rel="icon" href="/favicon.ico" sizes="48x48">')).toBeVisible();
  await expect(page.getByText('<meta name="theme-color" content="#336699">')).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download ZIP' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('logo-favicons.zip');
  const files = unzipSync(new Uint8Array(readFileSync((await download.path())!)));
  expect(Object.keys(files).sort()).toEqual([
    'apple-touch-icon.png',
    'favicon-16x16.png',
    'favicon-32x32.png',
    'favicon.ico',
    'icon-192.png',
    'icon-512.png',
    'site.webmanifest',
  ]);
  for (const [file, size] of [
    ['favicon-16x16.png', 16],
    ['favicon-32x32.png', 32],
    ['apple-touch-icon.png', 180],
    ['icon-192.png', 192],
    ['icon-512.png', 512],
  ] as const) {
    expect(await decoded(page, files[file], 'image/png')).toMatchObject({ w: size, h: size });
  }
  // The icon file holds 16, 32 and 48 pixel PNGs.
  const ico = readIco(files['favicon.ico']);
  expect(ico.map((e) => e.size)).toEqual([16, 32, 48]);
  for (const e of ico)
    expect(await decoded(page, e.png, 'image/png')).toMatchObject({ w: e.size, h: e.size });
  // Transparent corners stay transparent, except in the Apple icon, which is put on white.
  expect((await decoded(page, files['icon-192.png'], 'image/png')).px[3]).toBe(0);
  expect((await decoded(page, files['apple-touch-icon.png'], 'image/png')).px).toEqual([
    255, 255, 255, 255,
  ]);
  const m = JSON.parse(new TextDecoder().decode(files['site.webmanifest']));
  expect(m).toMatchObject({ name: 'Test Shop', short_name: 'Shop', theme_color: '#336699' });
});

test('favicon-generator uses the square you choose, and includes an SVG when that is the input', async ({
  page,
}) => {
  await openTool(page, 'favicon-generator');
  await addFiles(page, 'tests/fixtures/sample.png');
  await expect(page.getByRole('group', { name: /^Crop box for/ })).toBeVisible();
  // The default square is the middle 360 x 360 of the 480 x 360 picture.
  await expect(page.getByRole('spinbutton', { name: 'Left', exact: true })).toHaveValue('60');
  await page.getByRole('spinbutton', { name: 'Left', exact: true }).fill('0');
  await page.getByRole('spinbutton', { name: 'Left', exact: true }).blur();
  await page.getByRole('button', { name: 'Create icons' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download ZIP' }).click(),
  ]);
  const files = unzipSync(new Uint8Array(readFileSync((await download.path())!)));
  expect(files['favicon.svg']).toBeUndefined();
  const left = await decoded(page, files['icon-512.png'], 'image/png');
  // Starting at the left edge, the top-left corner shows the violet clock background (not the red bar the
  // default centered square would start on).
  expect(Math.abs(left.px[0] - 128)).toBeLessThan(40);
  expect(left.px[2]).toBeGreaterThan(200);

  await openTool(page, 'favicon-generator');
  await addFiles(page, 'tests/fixtures/sample.svg');
  await page.getByRole('button', { name: 'Create icons' }).click();
  await expect(
    page.getByText('<link rel="icon" href="/favicon.svg" type="image/svg+xml">'),
  ).toBeVisible();
  const [svgDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download ZIP' }).click(),
  ]);
  const svgFiles = unzipSync(new Uint8Array(readFileSync((await svgDownload.path())!)));
  const svg = new TextDecoder().decode(svgFiles['favicon.svg']);
  expect(svg).toContain('<svg');
  expect(svg).toMatch(/viewBox="[\d. ]+"/);
  expect(await decoded(page, svgFiles['icon-512.png'], 'image/png')).toMatchObject({
    w: 512,
    h: 512,
  });
});

test('favicon-generator needs a name, a short name and a valid color', async ({ page }) => {
  await openTool(page, 'favicon-generator');
  await addFiles(page, 'tests/fixtures/sample.png');
  const button = page.getByRole('button', { name: 'Create icons' });
  await expect(button).toBeEnabled();
  await page.getByLabel('Short name').fill('');
  await expect(button).toBeDisabled();
  await page.getByLabel('Short name').fill('Ok');
  await page.getByLabel('Theme color', { exact: true }).fill('#12');
  await expect(button).toBeDisabled();
});

test('app-icon-generator writes the iOS and Android sets with the right sizes and opaque iOS icons', async ({
  page,
}) => {
  await openTool(page, 'app-icon-generator');
  await addFiles(page, {
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(await transparentPng(page)),
  });
  await expect(page.getByRole('alert').first()).toContainText('transparent areas');
  await page.getByLabel('Background fill color for iOS', { exact: true }).fill('#336699');
  await page.getByRole('button', { name: 'Create icons' }).click();
  await expect(page.getByText(/files are ready/)).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download ZIP' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('logo-app-icons.zip');
  const files = unzipSync(new Uint8Array(readFileSync((await download.path())!)));
  const names = Object.keys(files);
  expect(names).toContain('ios/AppIcon.appiconset/Contents.json');
  expect(names).toContain('ios/AppIcon.appiconset/icon-1024.png');
  expect(names).toContain('ios-classic/AppIcon.appiconset/icon-167.png');
  expect(names).toContain('store/google-play-icon-512.png');
  const sizes: Record<string, number> = {
    'ios/AppIcon.appiconset/icon-1024.png': 1024,
    'ios-classic/AppIcon.appiconset/icon-180.png': 180,
    'ios-classic/AppIcon.appiconset/icon-167.png': 167,
    'ios-classic/AppIcon.appiconset/icon-40.png': 40,
    'android/mipmap-mdpi/ic_launcher.png': 48,
    'android/mipmap-hdpi/ic_launcher.png': 72,
    'android/mipmap-xhdpi/ic_launcher.png': 96,
    'android/mipmap-xxhdpi/ic_launcher.png': 144,
    'android/mipmap-xxxhdpi/ic_launcher.png': 192,
    'store/google-play-icon-512.png': 512,
  };
  for (const [path, px] of Object.entries(sizes)) {
    expect(await decoded(page, files[path], 'image/png'), path).toMatchObject({ w: px, h: px });
  }
  // iOS icons are opaque and filled with the chosen color; Android icons keep their transparent corners.
  expect(
    (await decoded(page, files['ios/AppIcon.appiconset/icon-1024.png'], 'image/png')).px,
  ).toEqual([0x33, 0x66, 0x99, 255]);
  expect(
    (await decoded(page, files['android/mipmap-xxxhdpi/ic_launcher.png'], 'image/png')).px[3],
  ).toBe(0);
  const single = JSON.parse(
    new TextDecoder().decode(files['ios/AppIcon.appiconset/Contents.json']),
  );
  expect(single.images[0]).toMatchObject({
    idiom: 'universal',
    platform: 'ios',
    size: '1024x1024',
  });
  const classic = JSON.parse(
    new TextDecoder().decode(files['ios-classic/AppIcon.appiconset/Contents.json']),
  );
  expect(classic.images.length).toBe(18);
  for (const img of classic.images)
    expect(names).toContain(`ios-classic/AppIcon.appiconset/${img.filename}`);
});

test('app-icon-generator shows no warning for an opaque picture and lists its sources', async ({
  page,
}) => {
  await openTool(page, 'app-icon-generator');
  await addFiles(page, 'tests/fixtures/sample.png');
  await expect(page.getByRole('button', { name: 'Create icons' })).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
  const links = page.getByRole('link', { name: /iOS|Android|Google Play/ });
  expect(await links.count()).toBeGreaterThanOrEqual(4);
  await expect(links.first()).toHaveAttribute('href', /^https:\/\/developer\.apple\.com/);
});

/** Pixels of the preview canvas, as a small grid of samples plus the box around the bright text. */
async function preview(page: import('@playwright/test').Page) {
  await page.waitForTimeout(250); // the preview redraws on the next frame, after its fonts are ready
  return page.evaluate(() => {
    const c = document.querySelector('canvas')!;
    const ctx = c.getContext('2d')!;
    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
    const at = (x: number, y: number) => [
      ...data.slice((y * width + x) * 4, (y * width + x) * 4 + 4),
    ];
    let x0 = width,
      y0 = height,
      x1 = -1,
      y1 = -1,
      sumX = 0,
      count = 0;
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4;
        if (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
          sumX += x;
          count++;
        }
      }
    }
    return {
      w: width,
      h: height,
      at: { tl: at(2, 2), tr: at(width - 3, 2), br: at(width - 3, height - 3), top: at(600, 2) },
      box: { x0, y0, x1, y1 },
      cx: count ? sumX / count : 0,
      count,
    };
  });
}

test('og-image-generator draws the text on a gradient, and shrinks long titles to fit', async ({
  page,
}) => {
  await openTool(page, 'og-image-generator');
  const first = await preview(page);
  expect([first.w, first.h]).toEqual([1200, 630]);
  // The default gradient "Dusk" starts dark blue at the top left and ends magenta at the bottom right.
  expect(first.at.tl[2]).toBeGreaterThan(first.at.tl[1]);
  expect(first.at.br[0]).toBeGreaterThan(first.at.tl[0]);
  expect(first.count).toBeGreaterThan(300); // white text is there
  await page.getByLabel('Title', { exact: true }).fill('word '.repeat(60));
  const long = await preview(page);
  expect(long.box.x0).toBeGreaterThanOrEqual(60);
  expect(long.box.x1).toBeLessThanOrEqual(1140);
  expect(long.box.y0).toBeGreaterThanOrEqual(40);
  expect(long.box.y1).toBeLessThanOrEqual(590);
});

test('og-image-generator templates move things but keep the words', async ({ page }) => {
  await openTool(page, 'og-image-generator');
  await page.getByLabel('Title', { exact: true }).fill('Same words');
  await page.getByRole('radio', { name: 'Classic' }).check();
  const classic = await preview(page);
  await page.getByRole('radio', { name: 'Centerd' }).check();
  const centered = await preview(page);
  expect(classic.cx).toBeLessThan(450); // left aligned
  expect(Math.abs(centered.cx - 600)).toBeLessThan(80); // centered
  await page.getByRole('radio', { name: 'Bottom' }).check();
  const bottom = await preview(page);
  expect(bottom.box.y0).toBeGreaterThan(classic.box.y0);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Same words');
});

test('og-image-generator backgrounds: solid color, darkened picture, grid and grain', async ({
  page,
}) => {
  await openTool(page, 'og-image-generator');
  await page.getByRole('radio', { name: 'Solid color' }).check();
  await page.getByLabel('Background color', { exact: true }).fill('#00aa00');
  const solid = await preview(page);
  expect(solid.at.top).toEqual([0, 170, 0, 255]);
  await page.getByRole('radio', { name: 'Picture' }).check();
  const red = await page.evaluate(async () => {
    const c = new OffscreenCanvas(40, 40);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgb(200 0 0)';
    ctx.fillRect(0, 0, 40, 40);
    return [...new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer())];
  });
  await page
    .getByLabel('Background picture')
    .setInputFiles({ name: 'red.png', mimeType: 'image/png', buffer: Buffer.from(red) });
  await expect(page.getByText('red.png.')).toBeVisible();
  const dark = await preview(page);
  expect(dark.at.top[0]).toBeGreaterThan(70);
  expect(dark.at.top[0]).toBeLessThan(120); // 200 darkened to about 90
  await page.getByRole('radio', { name: 'Solid color' }).check();
  await page.getByLabel('Grain').check();
  const grain = await preview(page);
  expect(grain.at.top).not.toEqual([0, 170, 0, 255]); // noise changes the pixels
  expect(Math.abs(grain.at.top[1] - 170)).toBeLessThan(40); // but only a little
  await page.getByLabel('Grain').uncheck();
  await page.getByLabel('Grid').check();
  const grid = await preview(page);
  expect(grid.w).toBe(1200);
});

test('og-image-generator shows a logo and a feature picture', async ({ page }) => {
  await openTool(page, 'og-image-generator');
  const make = (rgb: string) =>
    page.evaluate(async (fill) => {
      const c = new OffscreenCanvas(100, 100);
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, 100, 100);
      return [
        ...new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer()),
      ];
    }, rgb);
  await page.getByLabel('Feature picture', { exact: false }).setInputFiles({
    name: 'feature.png',
    mimeType: 'image/png',
    buffer: Buffer.from(await make('rgb(255 0 255)')),
  });
  await page.getByLabel('Logo (optional)').setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(await make('rgb(0 255 0)')),
  });
  await page.waitForTimeout(400);
  const pixels = await page.evaluate(() => {
    const c = document.querySelector('canvas')!;
    const ctx = c.getContext('2d')!;
    const px = (x: number, y: number) => [...ctx.getImageData(x, y, 1, 1).data];
    return { card: px(950, 315), logo: px(100, 80) };
  });
  expect(pixels.card).toEqual([255, 0, 255, 255]); // the feature picture sits on the right
  expect(pixels.logo[1]).toBeGreaterThan(200); // the green logo is at the top left
});

test('og-image-generator downloads PNG, JPG and WebP at 1200 x 630', async ({ page }) => {
  await openTool(page, 'og-image-generator');
  const expectations = [
    ['PNG', (b: Uint8Array) => b[1] === 0x50 && b[2] === 0x4e, 'png'],
    ['JPG', (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8, 'jpg'],
    ['WebP', (b: Uint8Array) => new TextDecoder().decode(b.slice(8, 12)) === 'WEBP', 'webp'],
  ] as const;
  for (const [label, check, ext] of expectations) {
    await page.getByRole('radio', { name: label, exact: true }).check();
    await page.waitForTimeout(200);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download', exact: true }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(new RegExp(`-og\\.${ext}$`));
    const bytes = new Uint8Array(readFileSync((await download.path())!));
    expect(check(bytes), label).toBe(true);
    expect(await decoded(page, bytes, `image/${ext === 'jpg' ? 'jpeg' : ext}`)).toMatchObject({
      w: 1200,
      h: 630,
    });
  }
});

test('og-image-generator saves designs on the device, and exports and imports them as files', async ({
  page,
}, testInfo) => {
  await openTool(page, 'og-image-generator');
  await page.getByLabel('Title', { exact: true }).fill('My saved title');
  await page.getByRole('radio', { name: 'Mono' }).check();
  await page.getByLabel('Name', { exact: true }).fill('Launch');
  await page.getByRole('button', { name: 'Save on this device' }).click();
  await expect(page.getByText('Launch', { exact: true })).toBeVisible();
  // It is still there after a reload, and can be opened again.
  await page.reload();
  await page.locator('body[data-ready]').waitFor();
  await expect(page.getByText('Launch', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open Launch' }).click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('My saved title');
  await expect(page.getByRole('radio', { name: 'Mono' })).toBeChecked();
  // Export, change, import.
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export as file' }).click(),
  ]);
  const json = JSON.parse(readFileSync((await file.path())!, 'utf8'));
  expect(json).toMatchObject({ title: 'My saved title', font: 'mono' });
  await page.getByLabel('Title', { exact: true }).fill('Something else');
  await page.getByLabel('Import a design file').setInputFiles(await file.path());
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('My saved title');
  // A file that is not a design is refused with a message.
  const bad = testInfo.outputPath('bad.json');
  writeFileSync(bad, '[1, 2, 3]');
  await page.getByLabel('Import a design file').setInputFiles(bad);
  await expect(page.getByRole('alert')).toContainText('not a design');
  await page.getByRole('button', { name: 'Delete Launch' }).click();
  await expect(page.getByText('Launch', { exact: true })).toHaveCount(0);
});

test('color-palette takes any number of colors from the custom field', async ({ page }) => {
  await openTool(page, 'color-palette');
  await addFiles(page, 'tests/fixtures/sample.jpg');
  await page.getByRole('radio', { name: 'Custom' }).check();
  const field = page.getByLabel('How many colors (1 to 64)');
  await field.fill('3');
  await expect(page.locator('ul.swatches li')).toHaveCount(3);
  await field.fill('20');
  const n = await page.locator('ul.swatches li').count();
  expect(n).toBeGreaterThan(10);
  expect(n).toBeLessThanOrEqual(20);
  await field.fill('500'); // too many: the largest allowed number is used
  expect(await page.locator('ul.swatches li').count()).toBeLessThanOrEqual(64);
});
