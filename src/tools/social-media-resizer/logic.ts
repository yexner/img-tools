import { cropAround, toPixels, type Bounds } from '#lib/core/rect';
import type { SocialSize } from '#lib/data/social-sizes';

/** The part of a picture to cut for one size, around the focal point, in whole pixels. */
export function cutFor(size: SocialSize, bounds: Bounds, focal: { x: number; y: number }) {
  return toPixels(cropAround(bounds, size.width / size.height, focal), bounds);
}
