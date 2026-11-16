import { describe, expect, it } from 'vitest';
import { csvCell, toCsv, toGpx, type Row } from './logic';

const rows: Row[] = [
  {
    file: 'a.jpg',
    gps: { latitude: 48.8584, longitude: 2.2945, altitude: 35 },
    takenAt: '2024:06:15 14:30:00',
    takenUtc: '2024-06-15T12:30:00.000Z',
  },
  { file: 'no gps, "quoted".jpg', gps: null },
  { file: '=SUM(A1).jpg', gps: { latitude: -33.8568, longitude: 151.2153 } },
];

describe('csv', () => {
  it('escapes commas, quotes and line breaks', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('one\ntwo')).toBe('"one\ntwo"');
    expect(csvCell(12.5)).toBe('12.5');
    expect(csvCell(undefined)).toBe('');
  });

  it('keeps a spreadsheet from running a file name as a formula', () => {
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('@x')).toBe("'@x");
    expect(csvCell('-5,3')).toBe('"\'-5,3"');
  });

  it('lists every file, with empty cells where there is no location', () => {
    const lines = toCsv(rows).trim().split('\r\n');
    expect(lines[0]).toBe('file,latitude,longitude,altitude_m,taken,taken_utc,map_link');
    expect(lines).toHaveLength(4);
    expect(lines[1]).toContain(
      'a.jpg,48.8584,2.2945,35,2024:06:15 14:30:00,2024-06-15T12:30:00.000Z,',
    );
    expect(lines[2]).toBe('"no gps, ""quoted"".jpg",,,,,,');
  });
});

describe('gpx', () => {
  const gpx = toGpx(rows);

  it('is GPX 1.1 with only the photos that have a location', () => {
    expect(gpx).toContain(
      '<gpx version="1.1" creator="IMG-TOOLS" xmlns="http://www.topografix.com/GPX/1/1">',
    );
    expect(gpx.match(/<wpt /g)).toHaveLength(2);
    expect(gpx).not.toContain('no gps');
  });

  it('names each waypoint and adds time and elevation when known', () => {
    expect(gpx).toContain('<wpt lat="48.8584" lon="2.2945">');
    expect(gpx).toContain('<ele>35</ele>');
    expect(gpx).toContain('<time>2024-06-15T12:30:00.000Z</time>');
    expect(gpx).toContain('<name>a.jpg</name>');
    expect(gpx.match(/<time>/g)).toHaveLength(1); // the second waypoint has no time zone to go on
  });

  it('escapes XML characters in names', () => {
    expect(toGpx([{ file: 'a&b<c>.jpg', gps: { latitude: 1, longitude: 2 } }])).toContain(
      '<name>a&amp;b&lt;c&gt;.jpg</name>',
    );
  });
});
