// Rectangle maths for the crop box and the region editor: move, resize with handles, keep an aspect
// ratio, stay inside the picture, and carry a region from one picture to another.
// All numbers are picture pixels. Kept free of the DOM so it can be tested thoroughly.

import { clamp } from './math';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Bounds {
  w: number;
  h: number;
}

/** A rectangle as fractions of the picture, so it can be applied to pictures of other sizes. */
export type RelRect = Rect;

export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const MIN_SIZE = 1;

/** A box centered in the picture, covering `fraction` of the shorter side. */
export function centeredRect(b: Bounds, fraction = 0.8, aspect: number | null = null): Rect {
  let w = b.w * fraction;
  let h = b.h * fraction;
  if (aspect) {
    if (w / h > aspect) w = h * aspect;
    else h = w / aspect;
  }
  return { x: (b.w - w) / 2, y: (b.h - h) / 2, w, h };
}

export function moveRect(r: Rect, dx: number, dy: number, b: Bounds): Rect {
  return { ...r, x: clamp(r.x + dx, 0, b.w - r.w), y: clamp(r.y + dy, 0, b.h - r.h) };
}

/** Make `r` fit inside the picture without changing its shape where possible. */
export function clampRect(r: Rect, b: Bounds): Rect {
  const w = clamp(r.w, MIN_SIZE, b.w);
  const h = clamp(r.h, MIN_SIZE, b.h);
  return { x: clamp(r.x, 0, b.w - w), y: clamp(r.y, 0, b.h - h), w, h };
}

/**
 * Drag a handle by (dx, dy). Sides never cross each other, the box stays in the picture, and with an
 * `aspect` (width / height) the shape is kept: corners keep the opposite corner fixed, edges keep the
 * middle of the opposite pair of sides.
 */
export function resizeRect(
  r: Rect,
  handle: Handle,
  dx: number,
  dy: number,
  b: Bounds,
  aspect: number | null = null,
): Rect {
  const west = handle.includes('w');
  const east = handle.includes('e');
  const north = handle.includes('n');
  const south = handle.includes('s');

  let left = r.x + (west ? dx : 0);
  let right = r.x + r.w + (east ? dx : 0);
  let top = r.y + (north ? dy : 0);
  let bottom = r.y + r.h + (south ? dy : 0);

  left = clamp(left, 0, right - MIN_SIZE);
  right = clamp(right, left + MIN_SIZE, b.w);
  top = clamp(top, 0, bottom - MIN_SIZE);
  bottom = clamp(bottom, top + MIN_SIZE, b.h);

  if (!aspect) return { x: left, y: top, w: right - left, h: bottom - top };

  const corner = (west || east) && (north || south);
  let w = right - left;
  let h = bottom - top;
  // Both sides must be at least MIN_SIZE, so the shorter side sets the smallest box.
  const minW = Math.max(MIN_SIZE, MIN_SIZE * aspect);
  const minH = minW / aspect;

  if (corner) {
    // The opposite corner stays where it is; the box grows toward the pointer.
    const ax = west ? r.x + r.w : r.x;
    const ay = north ? r.y + r.h : r.y;
    const room = Math.min(west ? ax : b.w - ax, (north ? ay : b.h - ay) * aspect);
    w = Math.min(Math.max(w, h * aspect), room);
    w = Math.max(w, Math.min(minW, room));
    h = w / aspect;
    return { x: west ? ax - w : ax, y: north ? ay - h : ay, w, h };
  }

  if (east || west) {
    // Height follows width, around the vertical middle.
    const cy = r.y + r.h / 2;
    const room = Math.min(east ? b.w - r.x : r.x + r.w, 2 * Math.min(cy, b.h - cy) * aspect);
    w = Math.max(Math.min(w, room), Math.min(minW, room));
    h = w / aspect;
    return { x: east ? r.x : r.x + r.w - w, y: cy - h / 2, w, h };
  }
  // North or south: width follows height, around the horizontal middle.
  const cx = r.x + r.w / 2;
  const room = Math.min(south ? b.h - r.y : r.y + r.h, (2 * Math.min(cx, b.w - cx)) / aspect);
  h = Math.max(Math.min(h, room), Math.min(minH, room));
  w = h * aspect;
  return { x: cx - w / 2, y: south ? r.y : r.y + r.h - h, w, h };
}

/** The largest box with `aspect` that fits inside `r`, with the same center. */
export function fitAspect(r: Rect, aspect: number, b: Bounds): Rect {
  let w = r.w;
  let h = r.h;
  if (w / h > aspect) w = h * aspect;
  else h = w / aspect;
  return clampRect({ x: r.x + (r.w - w) / 2, y: r.y + (r.h - h) / 2, w, h }, b);
}

export type Field = 'x' | 'y' | 'w' | 'h';

/** Set one of the numeric fields (Left, Top, Width, Height); with an aspect the other size follows. */
export function setField(
  r: Rect,
  field: Field,
  value: number,
  b: Bounds,
  aspect: number | null,
): Rect {
  const v = Math.round(value);
  if (!Number.isFinite(v)) return r;
  if (field === 'x') return moveRect(r, clamp(v, 0, b.w - r.w) - r.x, 0, b);
  if (field === 'y') return moveRect(r, 0, clamp(v, 0, b.h - r.h) - r.y, b);
  if (aspect) {
    let w = field === 'w' ? v : v * aspect;
    w = clamp(w, MIN_SIZE, Math.min(b.w - r.x, (b.h - r.y) * aspect));
    return { ...r, w, h: w / aspect };
  }
  return field === 'w'
    ? { ...r, w: clamp(v, MIN_SIZE, b.w - r.x) }
    : { ...r, h: clamp(v, MIN_SIZE, b.h - r.y) };
}

export const toRelative = (r: Rect, b: Bounds): RelRect => ({
  x: r.x / b.w,
  y: r.y / b.h,
  w: r.w / b.w,
  h: r.h / b.h,
});

/**
 * The same region on another picture. With an `aspect`, the width is scaled and the height follows, around
 * the same center, so the shape is exactly that ratio whatever the picture's own shape.
 */
export function fromRelative(rel: RelRect, b: Bounds, aspect: number | null = null): Rect {
  let w = rel.w * b.w;
  let h = rel.h * b.h;
  const cx = (rel.x + rel.w / 2) * b.w;
  const cy = (rel.y + rel.h / 2) * b.h;
  if (aspect) {
    h = w / aspect;
    if (h > b.h) {
      h = b.h;
      w = h * aspect;
    }
    if (w > b.w) {
      w = b.w;
      h = w / aspect;
    }
  }
  return clampRect({ x: cx - w / 2, y: cy - h / 2, w, h }, b);
}

/** Whole pixels for cropping: the box is rounded outward-free, never leaves the picture, never empty. */
export function toPixels(r: Rect, b: Bounds): Rect {
  const x = clamp(Math.round(r.x), 0, b.w - 1);
  const y = clamp(Math.round(r.y), 0, b.h - 1);
  const w = clamp(Math.round(r.w), 1, b.w - x);
  const h = clamp(Math.round(r.h), 1, b.h - y);
  return { x, y, w, h };
}

/**
 * The largest box with `aspect` (width / height) that fits in the picture, centered on a focal point
 * (given as fractions of the picture) as far as the picture's edges allow.
 */
export function cropAround(b: Bounds, aspect: number, focal: { x: number; y: number }): Rect {
  let w = b.w;
  let h = w / aspect;
  if (h > b.h) {
    h = b.h;
    w = h * aspect;
  }
  return {
    x: clamp(focal.x * b.w - w / 2, 0, b.w - w),
    y: clamp(focal.y * b.h - h / 2, 0, b.h - h),
    w,
    h,
  };
}
