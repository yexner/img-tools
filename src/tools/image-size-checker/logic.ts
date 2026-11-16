import { formats, formatBytes, labelOf, sniff } from '#lib/core';
import { readDpi, readSize, type Dpi } from '#lib/core/dims';
import { nearestRatio, simplify } from '#lib/core/ratio';

export interface Report {
  format: string;
  /** What the file name suggests, when it differs from what the content says. */
  extensionNote?: string;
  size: { width: number; height: number } | null;
  megapixels?: string;
  fileSize: string;
  ratio?: string;
  nearest?: string;
  dpi?: Dpi | null;
}

export async function inspect(file: File): Promise<Report> {
  const kind = await sniff(file);
  if (!kind)
    throw Object.assign(new Error('This file is not a picture format this tool knows.'), {
      reason: 'unsupported-format',
    });
  // Headers sit at the start of a file, but a JPEG's can be long; 128 KB covers all but exotic files.
  const bytes = new Uint8Array(await file.slice(0, 131072).arrayBuffer());
  const size = readSize(bytes, kind);
  const report: Report = {
    format: labelOf(kind),
    size,
    fileSize: formatBytes(file.size),
    dpi: readDpi(bytes, kind),
  };
  const ext = file.name.split('.').pop()?.toLowerCase();
  const expected = formats[kind as keyof typeof formats];
  if (ext && expected && ext !== expected.ext && !expected.alias?.includes(ext)) {
    report.extensionNote = `The name ends in .${ext}, but the contents are ${expected.label}.`;
  }
  if (size) {
    report.megapixels = ((size.width * size.height) / 1e6).toFixed(2);
    report.ratio = simplify(size.width, size.height);
    const near = nearestRatio(size.width, size.height);
    report.nearest =
      near.offByPercent === 0
        ? `Exactly ${near.label}`
        : `Closest common ratio ${near.label} (off by ${near.offByPercent}%)`;
  }
  return report;
}
