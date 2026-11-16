import { describe, expect, it } from 'vitest';
import { documentById } from '#lib/data/passport-documents';
import { aspectOf, cropBox, customDocument, guides, maxCrownFraction } from './logic';

const uk = documentById('uk')!;

describe('guides', () => {
  it('puts the chin lines the allowed head height below the crown line', () => {
    // 350 × 450 px box for a 35 × 45 mm photo: 10 px per mm.
    const g = guides({ x: 100, y: 200, w: 350, h: 450 }, uk, 0.2)!;
    expect(g.crown).toBe(290);
    expect(g.chinMin - g.crown).toBeCloseTo(290);
    expect(g.chinMax - g.crown).toBeCloseTo(340);
  });

  it('has none when the document states no head height', () => {
    expect(guides({ x: 0, y: 0, w: 35, h: 45 }, documentById('india')!, 0.1)).toBeNull();
  });

  it('keeps the longest head inside the photo at the highest crown position', () => {
    const f = maxCrownFraction(uk);
    const g = guides({ x: 0, y: 0, w: 350, h: 450 }, uk, f)!;
    expect(g.chinMax).toBeCloseTo(450);
  });
});

describe('crop', () => {
  it('keeps the ratio of the printed photo', () => {
    expect(aspectOf(uk)).toBeCloseTo(35 / 45);
    expect(aspectOf(documentById('us')!)).toBe(1);
  });

  it('rounds to whole pixels inside the picture', () => {
    expect(cropBox({ x: -3, y: 10.6, w: 99.7, h: 120.2 }, { w: 100, h: 130 })).toEqual({
      x: 0,
      y: 10,
      w: 100,
      h: 120,
    });
  });
});

describe('customDocument', () => {
  it('turns centimeters into millimeters and keeps a sensible head range', () => {
    expect(
      customDocument({ width: 4, height: 5, headMin: 3.2, headMax: 3.6, background: ' white ' }),
    ).toEqual({
      id: 'custom',
      label: 'Custom',
      width: 40,
      height: 50,
      head: { min: 32, max: 36 },
      background: 'white',
    });
  });

  it('leaves out a head range that makes no sense, and an empty background', () => {
    const d = customDocument({ width: 4, height: 5, headMin: 4, headMax: 3, background: '' })!;
    expect(d.head).toBeNull();
    expect(d.background).toBeNull();
    expect(
      customDocument({ width: 4, height: 5, headMin: 3, headMax: 6, background: '' })!.head,
    ).toBeNull();
  });

  it('is null until the size is usable', () => {
    expect(customDocument({ width: undefined, height: 5, background: '' })).toBeNull();
    expect(customDocument({ width: 0.5, height: 5, background: '' })).toBeNull();
    expect(customDocument({ width: 41, height: 5, background: '' })).toBeNull();
  });
});
