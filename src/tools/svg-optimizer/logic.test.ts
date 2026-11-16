import { describe, expect, it } from 'vitest';
import { bytesOf, defaults, optimizeSvg } from './logic';

const editorSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!-- Generator: Some Editor 1.2 -->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="100" height="50" viewBox="0 0 100 50">
  <metadata>made with an editor</metadata>
  <defs id="defs1"></defs>
  <g id="layer1" inkscape:label="Layer 1">
    <rect id="shape" x="10.123456" y="5.987654" width="80.000001" height="40.5" fill="#ff0000" />
    <path d="M 10.00000 10.00000 L 90.123456 10.000000 L 50 40 Z" fill="#00ff00"/>
  </g>
</svg>`;

describe('optimizeSvg', () => {
  it('removes editor leftovers and makes the file smaller', async () => {
    const r = await optimizeSvg(editorSvg, defaults);
    if (!r.ok) throw new Error(r.message);
    expect(bytesOf(r.text)).toBeLessThan(bytesOf(editorSvg) * 0.75);
    expect(r.text).not.toContain('Generator');
    expect(r.text).not.toContain('metadata');
    expect(r.text).not.toContain('inkscape');
    expect(r.text).not.toContain('<?xml');
    expect(r.text).toContain('viewBox="0 0 100 50"');
    expect(r.text).toContain('fill="red"'); // #ff0000 written the short way
  });

  it('respects the number precision', async () => {
    const low = await optimizeSvg(editorSvg, { ...defaults, precision: 1 });
    const high = await optimizeSvg(editorSvg, { ...defaults, precision: 5 });
    if (!low.ok || !high.ok) throw new Error('failed');
    expect(low.text).toContain('10.1');
    expect(low.text).not.toContain('10.12');
    expect(high.text).toContain('10.12346');
  });

  it('keeps ids when asked, and tidies them otherwise', async () => {
    const keep = await optimizeSvg(editorSvg, { ...defaults, keepIds: true });
    const tidy = await optimizeSvg(editorSvg, { ...defaults, keepIds: false });
    if (!keep.ok || !tidy.ok) throw new Error('failed');
    expect(keep.text).toContain('id="shape"');
    expect(tidy.text).not.toContain('id="shape"');
  });

  it('can take width and height off, and keeps the viewBox when it does', async () => {
    const r = await optimizeSvg(editorSvg, { ...defaults, removeSize: true, keepViewBox: false });
    if (!r.ok) throw new Error(r.message);
    expect(r.text).not.toMatch(/<svg[^>]*\swidth=/);
    expect(r.text).toContain('viewBox');
  });

  it('can drop the viewBox when sizes stay', async () => {
    const r = await optimizeSvg(editorSvg, { ...defaults, keepViewBox: false });
    if (!r.ok) throw new Error(r.message);
    expect(r.text).not.toContain('viewBox');
    expect(r.text).toMatch(/width="100"/);
  });

  it('keeps what the picture looks like: the shapes are still there', async () => {
    const r = await optimizeSvg(editorSvg, defaults);
    if (!r.ok) throw new Error(r.message);
    expect(r.text).toMatch(/<path|<rect/);
    expect((r.text.match(/<(rect|path)/g) ?? []).length).toBe(2);
  });

  it('reports markup that is not SVG', async () => {
    const r = await optimizeSvg('<svg><g></svg>', defaults);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/^This is not valid SVG/);
  });
});
