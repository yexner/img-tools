import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bucketFiles,
  bucketMs,
  canSend,
  sanitizeProps,
  trackingSignal,
  type GuardContext,
} from './analytics';
import { bandText, signalSentence } from './band';

const base: GuardContext = {
  configured: true,
  hostname: 'example.org',
  domains: ['example.org'],
  doNotTrack: false,
  globalPrivacyControl: false,
  mode: 'opt-out',
  stored: null,
};

describe('buckets', () => {
  it('buckets file counts', () => {
    expect([1, 2, 5, 6, 20, 21, 100, 101].map(bucketFiles)).toEqual([
      '1',
      '2-5',
      '2-5',
      '6-20',
      '6-20',
      '21-100',
      '21-100',
      '100+',
    ]);
  });
  it('buckets durations', () => {
    expect([0, 999, 1000, 4999, 5000, 29999, 30000].map(bucketMs)).toEqual([
      '<1s',
      '<1s',
      '1-5s',
      '1-5s',
      '5-30s',
      '5-30s',
      '30s+',
    ]);
  });
});

describe('sanitizeProps', () => {
  it('keeps only allowed properties with allowed values', () => {
    const out = sanitizeProps({
      files: 3,
      input: 'heic',
      output: 'jpeg',
      quality: 87,
      ms: 2500,
      reason: 'decode-failed',
      filename: 'holiday.jpg', // not allowed
      width: 4000, // not allowed
      note: 'typed by user', // not allowed
    });
    expect(out).toEqual({
      files: '2-5',
      input: 'heic',
      output: 'jpeg',
      quality: 85,
      ms: '1-5s',
      reason: 'decode-failed',
    });
  });
  it('drops values outside the enums', () => {
    expect(
      sanitizeProps({ input: 'secret.jpg', output: 'tiff', reason: 'my password was x' }),
    ).toEqual({});
    expect(sanitizeProps({ preset: 'Has Spaces And Caps' })).toEqual({});
    expect(sanitizeProps({ browser: ['native-heic', 'user-agent-string'] })).toEqual({
      browser: 'native-heic',
    });
  });
});

describe('canSend guard', () => {
  it('sends by default in opt-out mode on an allowed host', () => {
    expect(canSend(base)).toBe(true);
  });
  it('does not send when unconfigured or on another host', () => {
    expect(canSend({ ...base, configured: false })).toBe(false);
    expect(canSend({ ...base, hostname: 'localhost' })).toBe(false);
    expect(canSend({ ...base, domains: [] })).toBe(false);
  });
  it('honors Do Not Track and Global Privacy Control in both modes', () => {
    for (const mode of ['opt-in', 'opt-out'] as const) {
      expect(canSend({ ...base, mode, stored: 'on', doNotTrack: true })).toBe(false);
      expect(canSend({ ...base, mode, stored: 'on', globalPrivacyControl: true })).toBe(false);
    }
  });
  it('opt-out: sends without any stored choice (there is no switch)', () => {
    expect(canSend({ ...base, stored: null })).toBe(true);
    expect(canSend({ ...base, stored: 'off' })).toBe(true);
  });
  it('opt-in: sends only after switching on', () => {
    expect(canSend({ ...base, mode: 'opt-in', stored: null })).toBe(false);
    expect(canSend({ ...base, mode: 'opt-in', stored: 'off' })).toBe(false);
    expect(canSend({ ...base, mode: 'opt-in', stored: 'on' })).toBe(true);
  });
});

describe('trackingSignal', () => {
  const set = (dnt: string | null, gpc?: boolean) =>
    vi.stubGlobal('navigator', { doNotTrack: dnt, globalPrivacyControl: gpc });
  afterEach(() => vi.unstubAllGlobals());
  it('names the signal the browser sends', () => {
    set(null);
    expect(trackingSignal()).toBeNull();
    set('0', false);
    expect(trackingSignal()).toBeNull();
    set('1');
    expect(trackingSignal()).toBe('Do Not Track');
    set(null, true);
    expect(trackingSignal()).toBe('Global Privacy Control');
    set('1', true);
    expect(trackingSignal()).toBe('both');
  });
  it('is null outside a browser', () => {
    vi.stubGlobal('navigator', undefined);
    expect(trackingSignal()).toBeNull();
  });
});

describe('bandText', () => {
  it('matches the build configuration', () => {
    expect(bandText(false, 'opt-out').rest).toContain('No accounts, no cookies, no analytics.');
    const out = bandText(true, 'opt-out').rest;
    expect(out).toContain('No images, file contents or metadata are stored or sent');
    expect(out).toContain('anonymous usage (which tool is used)');
    expect(out).not.toMatch(/switch/i);
    expect(bandText(true, 'opt-in').rest).toContain('off unless you switch them on');
    for (const [on, mode] of [
      [false, 'opt-out'],
      [true, 'opt-out'],
      [true, 'opt-in'],
    ] as const) {
      expect(bandText(on, mode).lead).toBe('Your images never leave your device.');
      expect(bandText(on, mode, 'Do Not Track').lead).toBe('Your images never leave your device.');
    }
  });
  it('names the browser signal instead of offering a switch', () => {
    expect(signalSentence('Do Not Track')).toBe(
      'Your browser has Do Not Track enabled, so usage counting is switched off for you.',
    );
    expect(bandText(true, 'opt-out', 'Global Privacy Control').rest).toContain(
      'Global Privacy Control enabled, so usage counting is switched off for you.',
    );
    expect(bandText(true, 'opt-in', 'both').rest).toContain(
      'Do Not Track and Global Privacy Control enabled',
    );
    expect(bandText(true, 'opt-out', 'both').rest).not.toMatch(/switch (them|it) (on|off)/);
    // Without analytics there is nothing to switch off, so the signal changes nothing.
    expect(bandText(false, 'opt-out', 'Do Not Track').rest).toContain('no analytics');
  });
});
