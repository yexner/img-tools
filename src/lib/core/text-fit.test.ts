import { describe, expect, it } from 'vitest';
import { fitText, wrap } from './text-fit';

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

describe('wrap', () => {
  it('breaks lines at spaces so no line is too wide', () => {
    const lines = wrap('one two three four five six seven', 40, box);
    for (const l of lines) expect(measure(l, 40)).toBeLessThanOrEqual(400);
    expect(lines.join(' ')).toBe('one two three four five six seven');
  });

  it('breaks a word that is wider than the box', () => {
    const lines = wrap('Supercalifragilisticexpialidocious', 40, box);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(measure(l, 40)).toBeLessThanOrEqual(400);
    expect(lines.join('')).toBe('Supercalifragilisticexpialidocious');
  });
});

describe('fitText', () => {
  it('uses the biggest size when the text is short', () => {
    expect(fitText('Hello', box).size).toBe(80);
  });

  it('shrinks long text until it fits the box', () => {
    const long =
      'A rather long title that needs to shrink so that it fits in the space it is given';
    const fit = fitText(long, box);
    expect(fit.size).toBeLessThan(80);
    expect(fit.size).toBeGreaterThanOrEqual(24);
    expect(fit.lines.length).toBeLessThanOrEqual(4);
    expect(fit.lines.length * fit.size * 1.2).toBeLessThanOrEqual(300);
    expect(fit.cut).toBe(false);
    // One size bigger would not have fitted.
    const bigger = wrap(long, fit.size + 2, box);
    expect(bigger.length > 4 || bigger.length * (fit.size + 2) * 1.2 > 300).toBe(true);
  });

  it('shortens the text with an ellipsis only when it cannot fit at the smallest size', () => {
    const huge = 'word '.repeat(200);
    const fit = fitText(huge, box);
    expect(fit.size).toBe(24);
    expect(fit.cut).toBe(true);
    expect(fit.lines.at(-1)!.endsWith('…')).toBe(true);
    expect(fit.lines.length).toBeLessThanOrEqual(4);
  });

  it('gives nothing for empty text', () => {
    expect(fitText('   ', box).lines).toEqual([]);
  });
});
