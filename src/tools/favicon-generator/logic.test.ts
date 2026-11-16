import { describe, expect, it } from 'vitest';
import { cropSvg, headSnippet, ICO_SIZES, manifest, PNG_ICONS } from './logic';

const site = { name: 'My "Site" & Co', shortName: 'Site', themeColor: '#336699' };

describe('manifest', () => {
  it('is valid JSON with the names, icons and theme color', () => {
    const m = JSON.parse(manifest(site));
    expect(m.name).toBe('My "Site" & Co');
    expect(m.short_name).toBe('Site');
    expect(m.theme_color).toBe('#336699');
    expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512']);
    expect(
      m.icons.every((i: { src: string }) => PNG_ICONS.some((p) => '/' + p.name === i.src)),
    ).toBe(true);
  });
});

describe('headSnippet', () => {
  it('lists every file that is written, and the SVG only when there is one', () => {
    const html = headSnippet(site, false);
    expect(html).toContain('href="/favicon.ico"');
    expect(html).toContain('sizes="32x32" href="/favicon-32x32.png"');
    expect(html).toContain('rel="apple-touch-icon" href="/apple-touch-icon.png"');
    expect(html).toContain('rel="manifest" href="/site.webmanifest"');
    expect(html).toContain('<meta name="theme-color" content="#336699">');
    expect(html).not.toContain('favicon.svg');
    expect(headSnippet(site, true)).toContain('href="/favicon.svg" type="image/svg+xml"');
  });
});

describe('cropSvg', () => {
  const svg =
    '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><rect width="200" height="100"/></svg>';

  it('limits the view to the chosen part, as text on the root tag only', () => {
    const out = cropSvg(svg, { x: 0.25, y: 0, w: 0.5, h: 1 });
    expect(out).toContain('viewBox="50 0 100 100"');
    expect(out).toContain('width="100" height="100"');
    expect(out).toContain('<rect width="200" height="100"/>'); // the drawing is untouched
    expect(out.startsWith('<?xml')).toBe(true);
  });

  it('works from width and height when there is no viewBox, and offsets an existing origin', () => {
    expect(
      cropSvg('<svg width="40" height="40"><g/></svg>', { x: 0, y: 0.5, w: 0.5, h: 0.5 }),
    ).toContain('viewBox="0 20 20 20"');
    expect(
      cropSvg('<svg viewBox="10 10 100 100"><g/></svg>', { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }),
    ).toContain('viewBox="60 60 50 50"');
  });

  it('adds the SVG namespace when it is missing, and leaves unreadable input alone', () => {
    expect(cropSvg('<svg viewBox="0 0 10 10"><g/></svg>', { x: 0, y: 0, w: 1, h: 1 })).toContain(
      'xmlns="http://www.w3.org/2000/svg"',
    );
    expect(cropSvg('<svg><g/></svg>', { x: 0, y: 0, w: 1, h: 1 })).toBe('<svg><g/></svg>');
    expect(cropSvg('not svg', { x: 0, y: 0, w: 1, h: 1 })).toBe('not svg');
  });
});

describe('sizes', () => {
  it('has the sizes the specification names', () => {
    expect([...ICO_SIZES]).toEqual([16, 32, 48]);
    expect(PNG_ICONS.map((p) => p.size)).toEqual([16, 32, 180, 192, 512]);
  });
});
