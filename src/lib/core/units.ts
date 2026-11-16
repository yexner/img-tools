// Print sizes: lengths in cm, mm or inches, turned into pixels at a given resolution.

export type Unit = 'cm' | 'mm' | 'in';

export const INCH_IN_MM = 25.4;

/** A length in the given unit, in inches. */
export function toInches(value: number, unit: Unit): number {
  return unit === 'in' ? value : unit === 'cm' ? (value * 10) / INCH_IN_MM : value / INCH_IN_MM;
}

export function fromInches(inches: number, unit: Unit): number {
  return unit === 'in' ? inches : unit === 'cm' ? (inches * INCH_IN_MM) / 10 : inches * INCH_IN_MM;
}

/** Pixels needed for a length at `dpi` (at least 1). */
export function toPx(value: number, unit: Unit, dpi: number): number {
  return Math.max(1, Math.round(toInches(value, unit) * dpi));
}

/** Round for display: 10.16 stays 10.16, 21.000000001 becomes 21. */
export function tidy(n: number, digits = 2): number {
  const k = 10 ** digits;
  return Math.round(n * k) / k;
}

/** A length for display in both systems: `3.5 cm (1.38 in)`. The input is in millimeters. */
export function formatLength(mm: number): string {
  return `${tidy(mm / 10, 1)} cm (${tidy(mm / INCH_IN_MM, 2)} in)`;
}

/** A size for display in both systems: `3.5 cm × 4.5 cm (1.38 in × 1.77 in)`. The inputs are millimeters. */
export function formatSize(widthMm: number, heightMm: number): string {
  return (
    `${tidy(widthMm / 10, 1)} cm × ${tidy(heightMm / 10, 1)} cm ` +
    `(${tidy(widthMm / INCH_IN_MM, 2)} in × ${tidy(heightMm / INCH_IN_MM, 2)} in)`
  );
}

/** A range of lengths in both systems: `2.5–3.5 cm (0.98–1.38 in)`. The inputs are millimeters. */
export function formatRange(minMm: number, maxMm: number): string {
  return `${tidy(minMm / 10, 1)}–${tidy(maxMm / 10, 1)} cm (${tidy(minMm / INCH_IN_MM, 2)}–${tidy(maxMm / INCH_IN_MM, 2)} in)`;
}
