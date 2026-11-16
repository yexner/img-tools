import { mapLinks, type Gps } from '#lib/core/meta';

export interface Row {
  file: string;
  gps: Gps | null;
  /** Capture time as stored (local, no time zone). */
  takenAt?: string;
  /** Capture time in UTC, when it can be worked out. */
  takenUtc?: string;
}

/** A spreadsheet runs a cell that starts with these as a formula, so such text gets a leading quote. */
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | undefined): string {
  let s = value === undefined ? '' : String(value);
  if (FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV of every file, with empty cells where a photo has no location. */
export function toCsv(rows: Row[]): string {
  const lines = [['file', 'latitude', 'longitude', 'altitude_m', 'taken', 'taken_utc', 'map_link']];
  for (const r of rows) {
    lines.push(
      [
        r.file,
        r.gps?.latitude ?? '',
        r.gps?.longitude ?? '',
        r.gps?.altitude ?? '',
        r.takenAt ?? '',
        r.takenUtc ?? '',
        r.gps ? mapLinks(r.gps).openStreetMap : '',
      ].map((v) => csvCell(v)),
    );
  }
  return lines.map((l) => l.join(',')).join('\r\n') + '\r\n';
}

const xml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );

/** GPX 1.1 with one named waypoint per photo that has a location. */
export function toGpx(rows: Row[]): string {
  const points = rows
    .filter((r) => r.gps)
    .map((r) => {
      const g = r.gps!;
      return [
        `  <wpt lat="${g.latitude}" lon="${g.longitude}">`,
        g.altitude !== undefined ? `    <ele>${g.altitude}</ele>` : '',
        r.takenUtc ? `    <time>${r.takenUtc}</time>` : '',
        `    <name>${xml(r.file)}</name>`,
        '  </wpt>',
      ]
        .filter(Boolean)
        .join('\n');
    });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="IMG-TOOLS" xmlns="http://www.topografix.com/GPX/1/1">',
    ...points,
    '</gpx>',
    '',
  ].join('\n');
}
