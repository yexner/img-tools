// Shared "Save as + quality" state for the Compress, Convert and Crop families.
import type { OutputFormat } from '#lib/types';

/** Good defaults per format, so switching formats does not carry a poor value over. */
export const FORMAT_QUALITY: Record<OutputFormat, number> = {
  original: 90,
  jpeg: 90,
  png: 90,
  webp: 80,
  avif: 75,
};

/** Only PNG is lossless, so it is the one format without a Quality slider. */
export const showsQuality = (format: OutputFormat) => format !== 'png';

/** The quality to report to analytics: none for PNG. */
export const trackedQuality = (format: OutputFormat, quality: number) =>
  showsQuality(format) ? quality : undefined;

/**
 * Quality state. A number keeps one quality for every format; omit it for a separate default
 * per format (`FORMAT_QUALITY`).
 */
export function formatQuality(single?: number) {
  let shared = $state(single ?? 0);
  const perFormat = $state<Record<OutputFormat, number>>({ ...FORMAT_QUALITY });
  return {
    qualityFor: (format: OutputFormat) => (single === undefined ? perFormat[format] : shared),
    setQuality(format: OutputFormat, value: number) {
      if (single === undefined) perFormat[format] = value;
      else shared = value;
    },
    showsQuality,
    /** Quality for analytics, or undefined when the format has none. */
    tracked: (format: OutputFormat) =>
      trackedQuality(format, single === undefined ? perFormat[format] : shared),
  };
}
