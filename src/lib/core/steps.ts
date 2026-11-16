// Canvas work for the image steps. Used inside the worker only (it needs OffscreenCanvas).
import { CodedError } from './coded';
import type { Step } from './ops';
import { applyFilters } from './filters';
import { drawSingle, drawTiled } from './watermark';
import {
  boxBlur,
  effectSize,
  fillSolid,
  parseHex,
  pixelate,
  restoreOutsideEllipse,
} from './pixels';

export function canvasOf(w: number, h: number): OffscreenCanvas {
  return new OffscreenCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

export function ctx2d(c: OffscreenCanvas): OffscreenCanvasRenderingContext2D {
  const ctx = c.getContext('2d');
  if (!ctx) throw new CodedError('out-of-memory', 'Could not create a drawing surface.');
  return ctx;
}

/**
 * Draw `src` at the new size. Large reductions are done in halves, because a single drawImage from a
 * big picture to a small one skips pixels and looks jagged.
 */
export function resample(src: OffscreenCanvas, width: number, height: number): OffscreenCanvas {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  let cur = src;
  while (cur.width / 2 >= w && cur.height / 2 >= h) {
    const half = canvasOf(cur.width / 2, cur.height / 2);
    const ctx = ctx2d(half);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cur, 0, 0, cur.width, cur.height, 0, 0, half.width, half.height);
    cur = half;
  }
  if (cur.width === w && cur.height === h) return cur;
  const out = canvasOf(w, h);
  const ctx = ctx2d(out);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cur, 0, 0, cur.width, cur.height, 0, 0, out.width, out.height);
  return out;
}

export function apply(src: OffscreenCanvas, step: Step): OffscreenCanvas {
  switch (step.op) {
    case 'rotate': {
      const swap = step.deg !== 180;
      const out = canvasOf(swap ? src.height : src.width, swap ? src.width : src.height);
      const ctx = ctx2d(out);
      ctx.translate(out.width / 2, out.height / 2);
      ctx.rotate((step.deg * Math.PI) / 180);
      ctx.drawImage(src, -src.width / 2, -src.height / 2);
      return out;
    }
    case 'flip': {
      const out = canvasOf(src.width, src.height);
      const ctx = ctx2d(out);
      ctx.translate(step.h ? src.width : 0, step.v ? src.height : 0);
      ctx.scale(step.h ? -1 : 1, step.v ? -1 : 1);
      ctx.drawImage(src, 0, 0);
      return out;
    }
    case 'crop': {
      const out = canvasOf(step.w, step.h);
      ctx2d(out).drawImage(src, step.x, step.y, step.w, step.h, 0, 0, out.width, out.height);
      return out;
    }
    case 'limit': {
      const k = Math.min(1, step.edge / Math.max(src.width, src.height));
      return k === 1 ? src : resample(src, src.width * k, src.height * k);
    }
    case 'scale':
      return resample(src, src.width * step.factor, src.height * step.factor);
    case 'size': {
      // One side given: the other follows the picture's own proportions.
      const w = step.w ?? (step.h! * src.width) / src.height;
      const h = step.h ?? (step.w! * src.height) / src.width;
      return resample(src, w, h);
    }
    case 'resize': {
      let w = step.w;
      let h = step.h;
      let sx = 0;
      let sy = 0;
      let sw = src.width;
      let sh = src.height;
      if (step.fit === 'contain') {
        const k = Math.min(w / src.width, h / src.height);
        w = src.width * k;
        h = src.height * k;
      } else if (step.fit === 'cover') {
        const k = Math.max(w / src.width, h / src.height);
        sw = w / k;
        sh = h / k;
        sx = (src.width - sw) / 2;
        sy = (src.height - sh) / 2;
      }
      if (sx === 0 && sy === 0 && sw === src.width && sh === src.height) return resample(src, w, h);
      // Cover: crop the center first, then scale that part.
      const part = canvasOf(sw, sh);
      ctx2d(part).drawImage(src, sx, sy, sw, sh, 0, 0, part.width, part.height);
      return resample(part, w, h);
    }
    case 'pad': {
      const out = canvasOf(src.width + step.left + step.right, src.height + step.top + step.bottom);
      const ctx = ctx2d(out);
      if (step.color) {
        ctx.fillStyle = step.color;
        ctx.fillRect(0, 0, out.width, out.height);
      }
      ctx.drawImage(src, step.left, step.top);
      return out;
    }
    case 'regions': {
      const ctx = ctx2d(src);
      for (const r of step.regions) {
        const x = Math.max(0, Math.round(r.x));
        const y = Math.max(0, Math.round(r.y));
        const w = Math.min(src.width - x, Math.round(r.w));
        const h = Math.min(src.height - y, Math.round(r.h));
        if (w < 1 || h < 1) continue;
        const pixels = ctx.getImageData(x, y, w, h);
        const size = effectSize(r.strength, w, h);
        const before = step.shape === 'oval' ? pixels.data.slice() : null;
        if (step.style === 'blur') boxBlur(pixels, size);
        else if (step.style === 'pixelate') pixelate(pixels, size);
        else fillSolid(pixels, parseHex(step.color ?? '#000000'));
        if (before) restoreOutsideEllipse(pixels, before);
        ctx.putImageData(pixels, x, y);
      }
      return src;
    }
    case 'watermark': {
      const out = canvasOf(src.width, src.height);
      const ctx = ctx2d(out);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(src, 0, 0);
      const target = ctx as unknown as Parameters<typeof drawSingle>[0];
      if ('single' in step) drawSingle(target, out.width, out.height, step.mark, step.single);
      else drawTiled(target, out.width, out.height, step.mark, step.tiled);
      return out;
    }
    case 'filters': {
      const ctx = ctx2d(src);
      const pixels = ctx.getImageData(0, 0, src.width, src.height);
      applyFilters(pixels, step.options);
      ctx.putImageData(pixels, 0, 0);
      return src;
    }
    case 'ellipse': {
      // Everything outside the ellipse that fills the picture becomes transparent.
      const out = canvasOf(src.width, src.height);
      const ctx = ctx2d(out);
      ctx.beginPath();
      ctx.ellipse(out.width / 2, out.height / 2, out.width / 2, out.height / 2, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(src, 0, 0);
      return out;
    }
  }
}
