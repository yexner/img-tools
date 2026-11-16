// A small PDF writer: one page per image, page size equal to the image size, no margins.
// JPEG data is embedded as it is (no recompression); everything else is stored as lossless Flate pixels.

type PdfImage =
  | { kind: 'jpeg'; data: Uint8Array; components: 1 | 3 }
  /** `rgb` and `alpha` are zlib-compressed (see `deflate`); `alpha` is left out for opaque images. */
  | { kind: 'raw'; rgb: Uint8Array; alpha?: Uint8Array };

export interface PdfPage {
  /** Stored pixel size. */
  width: number;
  height: number;
  /** EXIF orientation 1 to 8. JPEGs keep their bytes, so the page rotates them instead. */
  orientation?: number;
  image: PdfImage;
}

/** PDF viewers refuse pages larger than this many units. */
const MAX_UNITS = 14400;

/** zlib compression with the browser's own stream; PDF's FlateDecode reads exactly this format. */
export async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Split RGBA into RGB samples and an alpha plane; `alpha` is undefined when every pixel is opaque. */
export function splitRgba(rgba: Uint8ClampedArray | Uint8Array): {
  rgb: Uint8Array;
  alpha?: Uint8Array;
} {
  const n = rgba.length / 4;
  const rgb = new Uint8Array(n * 3);
  const alpha = new Uint8Array(n);
  let opaque = true;
  for (let i = 0; i < n; i++) {
    rgb[i * 3] = rgba[i * 4];
    rgb[i * 3 + 1] = rgba[i * 4 + 1];
    rgb[i * 3 + 2] = rgba[i * 4 + 2];
    alpha[i] = rgba[i * 4 + 3];
    if (alpha[i] !== 255) opaque = false;
  }
  return { rgb, alpha: opaque ? undefined : alpha };
}

/**
 * Where the image's unit square lands on the page, as a PDF matrix `[a b c d e f]`, for a stored image of
 * `w` by `h` pixels with the given EXIF orientation. Also returns the displayed page size.
 */
export function placement(w: number, h: number, orientation = 1) {
  const swap = orientation >= 5;
  const pw = swap ? h : w;
  const ph = swap ? w : h;
  // Stored pixel (x right, y down) to displayed pixel (X right, Y down).
  const show = (x: number, y: number): [number, number] => {
    switch (orientation) {
      case 2:
        return [w - x, y];
      case 3:
        return [w - x, h - y];
      case 4:
        return [x, h - y];
      case 5:
        return [y, x];
      case 6:
        return [h - y, x];
      case 7:
        return [h - y, w - x];
      case 8:
        return [y, w - x];
      default:
        return [x, y];
    }
  };
  // Image space has v = 1 at the top row; PDF page space has y up.
  const at = (u: number, v: number): [number, number] => {
    const [X, Y] = show(u * w, (1 - v) * h);
    return [X, ph - Y];
  };
  const [e, f] = at(0, 0);
  const [x1, y1] = at(1, 0);
  const [x2, y2] = at(0, 1);
  return { matrix: [x1 - e, y1 - f, x2 - e, y2 - f, e, f], width: pw, height: ph };
}

const num = (n: number) => String(Math.round(n * 10000) / 10000);

export function buildPdf(pages: PdfPage[]): Uint8Array {
  const text = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (chunk: Uint8Array | string) => {
    const bytes = typeof chunk === 'string' ? text.encode(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, dict: string, stream?: Uint8Array) => {
    offsets[id] = length;
    push(`${id} 0 obj\n<< ${dict}${stream ? ` /Length ${stream.length}` : ''} >>\n`);
    if (stream) {
      push('stream\n');
      push(stream);
      push('\nendstream\n');
    }
    push('endobj\n');
  };

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  // Object numbers are handed out in order, so the cross-reference table has no gaps.
  let next = 3;
  const ids = pages.map((page) => {
    const has = page.image.kind === 'raw' && !!page.image.alpha;
    return { page: next++, content: next++, image: next++, mask: has ? next++ : 0 };
  });
  object(1, '/Type /Catalog /Pages 2 0 R');
  object(
    2,
    `/Type /Pages /Count ${pages.length} /Kids [${ids.map((p) => `${p.page} 0 R`).join(' ')}]`,
  );

  pages.forEach((page, i) => {
    const id = ids[i];
    const { matrix, width, height } = placement(page.width, page.height, page.orientation);
    const k = Math.min(1, MAX_UNITS / Math.max(width, height));
    object(
      id.page,
      `/Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(width * k)} ${num(height * k)}] ` +
        `/Resources << /XObject << /Im0 ${id.image} 0 R >> >> /Contents ${id.content} 0 R`,
    );
    object(
      id.content,
      '',
      text.encode(`q ${matrix.map((m) => num(m * k)).join(' ')} cm /Im0 Do Q`),
    );
    const base = `/Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /BitsPerComponent 8`;
    const img = page.image;
    if (img.kind === 'jpeg') {
      const space = img.components === 1 ? '/DeviceGray' : '/DeviceRGB';
      object(id.image, `${base} /ColorSpace ${space} /Filter /DCTDecode`, img.data);
    } else {
      object(
        id.image,
        `${base} /ColorSpace /DeviceRGB /Filter /FlateDecode${id.mask ? ` /SMask ${id.mask} 0 R` : ''}`,
        img.rgb,
      );
      if (img.alpha) {
        object(id.mask, `${base} /ColorSpace /DeviceGray /Filter /FlateDecode`, img.alpha);
      }
    }
  });

  const size = next;
  const xref = length;
  push(`xref\n0 ${size}\n0000000000 65535 f \n`);
  for (let id = 1; id < size; id++) {
    push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
