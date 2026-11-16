import { describe, expect, it } from 'vitest';
import { JobError } from '#lib/core';
import {
  countLabel,
  displayable,
  isFieldTarget,
  normalize,
  reason,
  shorten,
  sizeOut,
  summarize,
  toResults,
} from './batch';

describe('batch helpers', () => {
  it('normalizes run results to an array of outputs', () => {
    const blob = new Blob(['a']);
    expect(normalize(blob)).toEqual([{ blob }]);
    expect(normalize({ text: 't', label: 'L' })).toEqual([{ text: 't', label: 'L' }]);
    const list = [{ blob }, { blob }];
    expect(normalize(list)).toBe(list);
  });

  it('maps errors to a reason code and message', () => {
    expect(reason({ reason: 'cancelled', message: 'x' })).toEqual({
      code: 'cancelled',
      message: 'x',
    });
    expect(reason(new Error('boom')).code).toBe('decode-failed');
    expect(reason(null).message).toBe('This file could not be processed.');
    expect(reason(new JobError('oom', 'Too big')).code).toBe('oom');
  });

  it('builds unique names across a batch', () => {
    const taken = new Set<string>();
    const png = new Blob(['x'], { type: 'image/png' });
    const make = () => 'blob:x';
    const a = toResults([{ blob: png }], 'holiday.jpg', 'compressed', taken, make);
    const b = toResults([{ blob: png }], 'holiday.jpg', 'compressed', taken, make);
    expect(a[0]).toMatchObject({ type: 'file', name: 'holiday-compressed.png', url: 'blob:x' });
    expect(b[0]).toMatchObject({ name: 'holiday-compressed-2.png' });
  });

  it('keeps text and data results', () => {
    const r = toResults(
      [{ text: 'hi', label: 'Hash' }, { data: { a: 1 } }],
      'f.png',
      '',
      new Set(),
      () => '',
    );
    expect(r[0]).toMatchObject({ type: 'text', text: 'hi', filename: 'f-text.txt' });
    expect(r[1]).toEqual({ type: 'data', data: { a: 1 } });
  });

  it('sums file sizes only', () => {
    const rs = toResults(
      [{ blob: new Blob(['abc'], { type: 'image/png' }) }, { text: 'zzzz', label: 'L' }],
      'f.png',
      '',
      new Set(),
      () => '',
    );
    expect(sizeOut(rs)).toBe(3);
  });

  it('summarizes and shortens', () => {
    expect(summarize(2, 0, 0, 0)).toBe('2 files processed');
    expect(summarize(1, 0, 0, 0)).toBe('1 file processed');
    expect(summarize(1, 2000, 1000, 1)).toContain('→');
    expect(shorten('a'.repeat(130))).toHaveLength(121);
    expect(shorten('abc')).toBe('abc');
  });
});

describe('intake helpers', () => {
  it('knows which kinds have a thumbnail', () => {
    expect(displayable('png')).toBe(true);
    expect(displayable('pdf')).toBe(false);
    expect(displayable(null)).toBe(false);
  });

  it('builds the run button label', () => {
    expect(countLabel('Compress', 'image', 0)).toBe('Compress');
    expect(countLabel('Compress', 'image', 1)).toBe('Compress 1 image');
    expect(countLabel('Compress', 'image', 3)).toBe('Compress 3 images');
  });

  it('ignores paste events aimed at form fields', () => {
    expect(isFieldTarget({ tagName: 'INPUT' } as unknown as EventTarget)).toBe(true);
    expect(isFieldTarget({ tagName: 'textarea' } as unknown as EventTarget)).toBe(true);
    expect(isFieldTarget({ tagName: 'DIV' } as unknown as EventTarget)).toBe(false);
    expect(isFieldTarget(null)).toBe(false);
  });
});
