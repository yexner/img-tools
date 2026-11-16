// Reading photo metadata (EXIF, GPS, XMP, ICC, IPTC) with exifr, and turning it into readable text.
import exifr from 'exifr';

export interface Gps {
  latitude: number;
  longitude: number;
  altitude?: number;
}

interface Group {
  title: string;
  rows: [label: string, value: string][];
}

export interface Meta {
  gps: Gps | null;
  /** Capture time as the camera wrote it (it has no time zone). */
  takenAt?: string;
  /** The same moment in UTC (ISO 8601), when the file says enough to work it out. */
  takenUtc?: string;
  groups: Group[];
  /** Every field, readable, in the file's own order. */
  all: [key: string, value: string][];
  /** True when the file holds no metadata worth showing. */
  empty: boolean;
}

type Tags = Record<string, unknown>;

/** `0.004` → `1/250 s`; `2` → `2 s`. */
export function formatShutter(seconds: number): string {
  if (!(seconds > 0)) return '';
  return seconds < 1 ? `1/${Math.round(1 / seconds)} s` : `${+seconds.toFixed(1)} s`;
}

const trimZero = (n: number, digits = 1) => String(+n.toFixed(digits));

/** One tag value as readable text. */
export function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  if (v instanceof Uint8Array || v instanceof ArrayBuffer) {
    const n = v instanceof ArrayBuffer ? v.byteLength : v.length;
    return n <= 8 && v instanceof Uint8Array ? [...v].join(', ') : `${n} bytes of data`;
  }
  if (Array.isArray(v)) return v.map(formatValue).join(', ');
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : trimZero(v, 4);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

const text = (t: Tags, key: string) =>
  typeof t[key] === 'string' ? (t[key] as string).trim() : undefined;
const num = (t: Tags, key: string) => (typeof t[key] === 'number' ? (t[key] as number) : undefined);

function rows(pairs: [string, string | undefined][]): [string, string][] {
  return pairs.filter((p): p is [string, string] => !!p[1]);
}

/** Six decimals is about 10 cm on the ground, and hides floating-point noise. */
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Capture time in UTC. The GPS clock is already UTC; otherwise the local time plus the camera's own offset
 * (`OffsetTimeOriginal`) is used. Without either, the time zone is unknown and nothing is guessed.
 */
export function utcTime(tags: Tags): string | undefined {
  const stamp = tags.GPSTimeStamp;
  const day = text(tags, 'GPSDateStamp');
  if (day && Array.isArray(stamp) && stamp.length === 3) {
    const [y, mo, d] = day.split(':').map(Number);
    const [h, mi, se] = stamp.map(Number);
    const t = Date.UTC(y, mo - 1, d, h, mi, Math.floor(se));
    if (Number.isFinite(t)) return new Date(t).toISOString();
  }
  const local = text(tags, 'DateTimeOriginal') ?? text(tags, 'CreateDate');
  const offset = text(tags, 'OffsetTimeOriginal') ?? text(tags, 'OffsetTime');
  const m =
    local && offset ? /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(local) : null;
  const o = offset ? /^([+-])(\d{2}):(\d{2})$/.exec(offset) : null;
  if (m && o) {
    const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    const shift = (o[1] === '-' ? -1 : 1) * (+o[2] * 60 + +o[3]) * 60_000;
    return new Date(asUtc - shift).toISOString();
  }
  return undefined;
}

export function describe(tags: Tags): { groups: Group[]; takenAt?: string; gps: Gps | null } {
  const groups: Group[] = [];
  const add = (title: string, r: [string, string][]) => r.length && groups.push({ title, rows: r });

  add(
    'Camera',
    rows([
      ['Make', text(tags, 'Make')],
      ['Model', text(tags, 'Model')],
    ]),
  );
  add(
    'Lens',
    rows([
      ['Lens', text(tags, 'LensModel')],
      ['Lens make', text(tags, 'LensMake')],
    ]),
  );
  const shutter = num(tags, 'ExposureTime');
  const fNumber = num(tags, 'FNumber');
  const focal = num(tags, 'FocalLength');
  const bias = num(tags, 'ExposureBiasValue');
  add(
    'Exposure',
    rows([
      ['Shutter speed', shutter ? formatShutter(shutter) : undefined],
      ['Aperture', fNumber ? `f/${trimZero(fNumber)}` : undefined],
      ['ISO', num(tags, 'ISO') ? String(num(tags, 'ISO')) : undefined],
      ['Focal length', focal ? `${trimZero(focal)} mm` : undefined],
      [
        'Exposure bias',
        bias !== undefined ? `${bias > 0 ? '+' : ''}${trimZero(bias, 2)} EV` : undefined,
      ],
    ]),
  );
  const taken = text(tags, 'DateTimeOriginal') ?? text(tags, 'CreateDate');
  add(
    'Date and time',
    rows([
      ['Taken', taken],
      ['Digitized', text(tags, 'DateTimeDigitized') ?? text(tags, 'CreateDate')],
      ['Modified', text(tags, 'ModifyDate')],
    ]),
  );
  add(
    'Software',
    rows([
      ['Software', text(tags, 'Software')],
      ['Processing software', text(tags, 'ProcessingSoftware')],
    ]),
  );

  const lat = num(tags, 'latitude');
  const lon = num(tags, 'longitude');
  const gps: Gps | null =
    lat !== undefined && lon !== undefined && Number.isFinite(lat) && Number.isFinite(lon)
      ? { latitude: round6(lat), longitude: round6(lon), altitude: num(tags, 'GPSAltitude') }
      : null;
  return { groups, takenAt: taken, gps };
}

/** Links that show a place on a map. They only open when the visitor clicks them. */
export const mapLinks = (g: Gps) => ({
  openStreetMap: `https://www.openstreetmap.org/?mlat=${g.latitude}&mlon=${g.longitude}#map=16/${g.latitude}/${g.longitude}`,
  googleMaps: `https://www.google.com/maps?q=${g.latitude},${g.longitude}`,
});

/** Fields that only describe how the picture is stored, not who made it or where. */
const STRUCTURAL = new Set([
  'ImageWidth',
  'ImageHeight',
  'ExifImageWidth',
  'ExifImageHeight',
  'BitDepth',
  'BitsPerSample',
  'ColorType',
  'Compression',
  'Filter',
  'Interlace',
  'PhotometricInterpretation',
  'FillOrder',
  'StripOffsets',
  'StripByteCounts',
  'RowsPerStrip',
  'SamplesPerPixel',
  'PlanarConfiguration',
  'SampleFormat',
  'Orientation',
  'ResolutionUnit',
  'XResolution',
  'YResolution',
  'ColorSpace',
]);

export async function readMeta(file: Blob): Promise<Meta> {
  let tags: Tags = {};
  try {
    // Browsers let exifr read just the parts it needs; elsewhere (tests) it gets the bytes.
    const input =
      typeof FileReader === 'undefined' ? new Uint8Array(await file.arrayBuffer()) : file;
    // Dates stay as the camera wrote them: they carry no time zone, so converting would shift them.
    tags =
      ((await exifr.parse(input, {
        mergeOutput: true,
        xmp: true,
        icc: true,
        iptc: true,
        interop: true,
        multiSegment: true,
        reviveValues: false,
      })) as Tags | undefined) ?? {};
  } catch {
    tags = {}; // a format without metadata, or damaged data
  }
  const { groups, takenAt, gps } = describe(tags);
  const all = Object.entries(tags).map(([k, v]): [string, string] => [k, formatValue(v)]);
  return {
    gps,
    takenAt,
    takenUtc: utcTime(tags),
    groups,
    all,
    empty: !all.some(([key]) => !STRUCTURAL.has(key)),
  };
}

const GPS_KEY = /^(GPS|latitude$|longitude$)/;
const CAMERA_KEY =
  /^(Make|Model|LensModel|LensMake|LensInfo|LensSerialNumber|BodySerialNumber|SerialNumber|CameraOwnerName)$/;
const TIME_KEY = /^(DateTime|CreateDate|ModifyDate|OffsetTime|SubSecTime)/;
const SOFTWARE_KEY = /^(Software|ProcessingSoftware|HostComputer)$/;
const ICC_KEY =
  /^(Profile|Red|Green|Blue)|TRC$|WhitePoint$|BlackPoint$|MatrixColumn$|^Device(Mfg|Model|Manufacturer)|^ViewingCond|^Luminance$|^Measurement$|^Technology$|^PrimaryPlatform$|^RenderingIntent$|^ColorSpaceData$|^ProfileConnectionSpace$/;

/**
 * What a file carried, in a short readable phrase: "GPS location, camera, date and time, 14 other tags".
 * Empty when there was nothing to remove.
 */
export function summarizeMeta(m: Meta): string {
  const keys = m.all.map(([k]) => k).filter((k) => !STRUCTURAL.has(k));
  const has = (re: RegExp) => keys.some((k) => re.test(k));
  const named = keys.filter((k) =>
    [GPS_KEY, CAMERA_KEY, TIME_KEY, SOFTWARE_KEY, ICC_KEY].some((re) => re.test(k)),
  );
  const other = keys.length - named.length;
  const parts = [
    has(GPS_KEY) && 'GPS location',
    has(CAMERA_KEY) && 'camera',
    has(TIME_KEY) && 'date and time',
    has(SOFTWARE_KEY) && 'software',
    has(ICC_KEY) && 'color profile',
    other > 0 && `${other} other ${other === 1 ? 'tag' : 'tags'}`,
  ].filter(Boolean);
  return parts.join(', ');
}
