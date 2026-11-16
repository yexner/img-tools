import type { RelRect } from '#lib/core/rect';

/** A region of a picture, as fractions of its size, with its own strength. */
export type RelRegion = RelRect & { strength: number };
