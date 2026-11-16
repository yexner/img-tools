import { describe, expect, it } from 'vitest';
import {
  defaultDesign,
  DIRECTIONS,
  gradientColors,
  GRADIENTS,
  gradientLine,
  normalized,
  parseDesign,
  seeded,
} from './design';

/** Every letter is 0.5 em wide. */
const measure = (t: string, size: number) => t.length * size * 0.5;
const box = {
  maxWidth: 400,
  maxHeight: 300,
  maxSize: 80,
  minSize: 24,
  maxLines: 4,
  lineHeight: 1.2,
  measure,
};

describe('presets', () => {
  it('has at least twelve gradients and eight directions', () => {
    expect(GRADIENTS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(GRADIENTS.map((g) => g.id)).size).toBe(GRADIENTS.length);
    expect(DIRECTIONS).toHaveLength(8);
  });
});

describe('parseDesign', () => {
  it('keeps good values and falls back for bad ones', () => {
    const d = parseDesign({
      title: 'Hi',
      template: 'nope',
      textColor: 'red',
      from: '#AABBCC',
      grain: 'yes',
      grid: true,
      format: 'webp',
      direction: 270,
      extra: '<script>',
    })!;
    expect(d.title).toBe('Hi');
    expect(d.template).toBe(defaultDesign.template);
    expect(d.textColor).toBe(defaultDesign.textColor);
    expect(d.from).toBe('#aabbcc');
    expect(d.grain).toBe(false);
    expect(d.grid).toBe(true);
    expect(d.format).toBe('webp');
    expect(normalized(d).direction).toBe(270);
    expect(d).not.toHaveProperty('extra');
  });

  it('cuts long text, and refuses things that are not objects', () => {
    expect(parseDesign({ title: 'x'.repeat(1000) })!.title.length).toBe(140);
    for (const bad of [null, 5, 'text', [], undefined]) expect(parseDesign(bad)).toBeNull();
  });

  it('turns an empty object into the default design', () => {
    expect(normalized(parseDesign({})!)).toEqual(defaultDesign);
  });
});

describe('gradientColors', () => {
  it('reads a preset or the custom colors', () => {
    expect(gradientColors({ ...defaultDesign, gradient: 'ocean' })).toEqual([
      GRADIENTS[1].from,
      GRADIENTS[1].to,
    ]);
    expect(
      gradientColors({ ...defaultDesign, gradient: 'custom', from: '#111111', to: '#222222' }),
    ).toEqual(['#111111', '#222222']);
  });
});

describe('seeded and gradientLine', () => {
  it('repeats the same numbers for the same seed', () => {
    const a = seeded(7);
    const b = seeded(7);
    const first = [a(), a(), a()];
    expect(first).toEqual([b(), b(), b()]);
    expect(first.every((n) => n >= 0 && n < 1)).toBe(true);
    expect(seeded(8)()).not.toBe(first[0]);
  });

  it('runs the gradient across the whole box in the chosen direction', () => {
    const right = gradientLine(90, 200, 100);
    expect(right.x0).toBeCloseTo(0);
    expect(right.x1).toBeCloseTo(200);
    expect(right.y0).toBeCloseTo(50);
    const down = gradientLine(180, 200, 100);
    expect(down.y0).toBeCloseTo(0);
    expect(down.y1).toBeCloseTo(100);
    const up = gradientLine(0, 200, 100);
    expect(up.y0).toBeCloseTo(100);
    expect(up.y1).toBeCloseTo(0);
  });
});
