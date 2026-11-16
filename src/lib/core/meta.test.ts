import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  describe as describeTags,
  formatShutter,
  formatValue,
  mapLinks,
  readMeta,
  summarizeMeta,
  utcTime,
} from './meta';

const file = (name: string) => new Blob([readFileSync(`tests/fixtures/${name}`)]);

describe('formatting', () => {
  it('writes shutter speeds like a camera', () => {
    expect(formatShutter(0.004)).toBe('1/250 s');
    expect(formatShutter(1 / 3)).toBe('1/3 s');
    expect(formatShutter(2)).toBe('2 s');
    expect(formatShutter(0)).toBe('');
  });

  it('turns values into readable text', () => {
    expect(formatValue([48, 51, 30.24])).toBe('48, 51, 30.24');
    expect(formatValue(new Uint8Array([1, 2, 3, 0]))).toBe('1, 2, 3, 0');
    expect(formatValue(new Uint8Array(100))).toBe('100 bytes of data');
    expect(formatValue(2.123456)).toBe('2.1235');
    expect(formatValue(null)).toBe('');
  });
});

describe('describe', () => {
  it('groups the usual photo details', () => {
    const { groups } = describeTags({
      Make: 'A',
      Model: 'B',
      FNumber: 2.8,
      ExposureTime: 0.01,
      ISO: 100,
      FocalLength: 50,
    });
    expect(groups.map((g) => g.title)).toEqual(['Camera', 'Exposure']);
    expect(groups[1].rows).toEqual([
      ['Shutter speed', '1/100 s'],
      ['Aperture', 'f/2.8'],
      ['ISO', '100'],
      ['Focal length', '50 mm'],
    ]);
  });

  it('leaves out groups with nothing in them', () => {
    expect(describeTags({}).groups).toEqual([]);
    expect(describeTags({}).gps).toBeNull();
  });
});

describe('readMeta', () => {
  it('reads camera, exposure, time and location from a photo', async () => {
    const m = await readMeta(file('photo-gps.jpg'));
    expect(m.empty).toBe(false);
    const titles = m.groups.map((g) => g.title);
    expect(titles).toEqual(['Camera', 'Lens', 'Exposure', 'Date and time', 'Software']);
    expect(m.groups[0].rows).toContainEqual(['Model', 'T-1000']);
    expect(m.takenAt).toBe('2024:06:15 14:30:00');
    expect(m.gps?.latitude).toBeCloseTo(48.8584, 4);
    expect(m.gps?.longitude).toBeCloseTo(2.2945, 4);
    expect(m.gps?.altitude).toBe(35);
    expect(m.all.find(([k]) => k === 'Artist')?.[1]).toBe('Test Person');
  });

  it('says so when there is nothing', async () => {
    for (const name of ['sample.jpg', 'sample.webp', 'sample.avif', 'sample.heic']) {
      const m = await readMeta(file(name));
      expect(m.gps, name).toBeNull();
      expect(m.groups, name).toEqual([]);
    }
  });
});

describe('mapLinks', () => {
  it('builds links for two map services', () => {
    const l = mapLinks({ latitude: 48.8584, longitude: 2.2945 });
    expect(l.openStreetMap).toContain('mlat=48.8584&mlon=2.2945');
    expect(l.googleMaps).toBe('https://www.google.com/maps?q=48.8584,2.2945');
  });
});

describe('utcTime', () => {
  it('prefers the GPS clock, which is already UTC', () => {
    expect(utcTime({ GPSDateStamp: '2024:06:15', GPSTimeStamp: [12, 30, 5.9] })).toBe(
      '2024-06-15T12:30:05.000Z',
    );
  });

  it('applies the camera offset to the local time', () => {
    expect(utcTime({ DateTimeOriginal: '2024:06:15 14:30:00', OffsetTimeOriginal: '+02:00' })).toBe(
      '2024-06-15T12:30:00.000Z',
    );
    expect(utcTime({ DateTimeOriginal: '2024:01:01 00:10:00', OffsetTimeOriginal: '-05:30' })).toBe(
      '2024-01-01T05:40:00.000Z',
    );
  });

  it('does not guess when the time zone is unknown', () => {
    expect(utcTime({ DateTimeOriginal: '2024:06:15 14:30:00' })).toBeUndefined();
    expect(utcTime({})).toBeUndefined();
  });

  it('is read from a photo', async () => {
    expect((await readMeta(file('photo-gps.jpg'))).takenUtc).toBe('2024-06-15T12:30:00.000Z');
  });
});

describe('summarizeMeta', () => {
  it('names what a photo carried', async () => {
    expect(await readMeta(file('photo-gps.jpg')).then(summarizeMeta)).toMatch(
      /^GPS location, camera, date and time, software, \d+ other tags$/,
    );
  });

  it('is empty when there was nothing', async () => {
    expect(await readMeta(file('sample.jpg')).then(summarizeMeta)).toBe('');
    expect(await readMeta(file('sample.png')).then(summarizeMeta)).toBe('');
  });

  it('counts a color profile apart from other tags', async () => {
    expect(await readMeta(file('sample.tiff')).then(summarizeMeta)).toBe('color profile');
  });
});
