// Where a watermark goes and how it is drawn. The preview and the saved file both use this code, and the
// mark's size is a share of the picture's width, so it looks the same on a phone photo and a big scan.

export type Position = 'tl' | 't' | 'tr' | 'l' | 'c' | 'r' | 'bl' | 'b' | 'br';

export interface SingleOptions {
  /** Mark width as a percentage of the picture's width. */
  size: number;
  position: Position;
  /** Distance from the edges, as a percentage of the picture's width. */
  margin: number;
  /** 0 to 100. */
  opacity: number;
}

export interface TiledOptions {
  size: number;
  /** Degrees; negative turns the grid anticlockwise. */
  angle: number;
  /** Space between marks, as a percentage of the mark's own size. */
  gap: number;
  opacity: number;
}

export interface Mark {
  width: number;
  height: number;
}

/** Size of the mark on a picture `width` pixels wide. */
export function markSize(width: number, mark: Mark, sizePct: number) {
  const w = Math.max(1, (width * sizePct) / 100);
  return { w, h: Math.max(1, (w * mark.height) / mark.width) };
}

/** Top-left corner of the mark for one of the nine places. */
export function place(
  W: number,
  H: number,
  w: number,
  h: number,
  position: Position,
  margin: number,
) {
  const m = (W * margin) / 100;
  const col =
    position === 'tl' || position === 'l' || position === 'bl'
      ? 0
      : position === 't' || position === 'c' || position === 'b'
        ? 1
        : 2;
  const row =
    position === 'tl' || position === 't' || position === 'tr'
      ? 0
      : position === 'l' || position === 'c' || position === 'r'
        ? 1
        : 2;
  const x = col === 0 ? m : col === 1 ? (W - w) / 2 : W - w - m;
  const y = row === 0 ? m : row === 1 ? (H - h) / 2 : H - h - m;
  return { x, y };
}

/**
 * Centers of the marks in a tiled pattern, in the picture's own coordinates before it is turned. Rows are
 * shifted by half a step, so the marks form a staggered grid with no straight clean lanes. The pattern
 * covers the whole picture even after it is rotated by `angle`.
 */
export function tileCenters(W: number, H: number, w: number, h: number, gapPct: number) {
  const stepX = w * (1 + gapPct / 100);
  const stepY = h * (1 + gapPct / 100);
  // After rotation the picture can reach out to its diagonal, so lay the grid over a square that big.
  const reach = Math.hypot(W, H) / 2;
  const rows = Math.ceil(reach / stepY) + 1;
  const cols = Math.ceil(reach / stepX) + 1;
  const out: { x: number; y: number }[] = [];
  for (let r = -rows; r <= rows; r++) {
    const shift = Math.abs(r) % 2 ? stepX / 2 : 0;
    for (let c = -cols; c <= cols; c++) out.push({ x: c * stepX + shift, y: r * stepY });
  }
  return out;
}

/** Minimal drawing surface shared by page canvases and worker canvases. */
export interface Surface {
  globalAlpha: number;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  drawImage(image: never, x: number, y: number, w: number, h: number): void;
}

export function drawSingle(
  ctx: Surface,
  W: number,
  H: number,
  mark: Mark & object,
  o: SingleOptions,
) {
  const { w, h } = markSize(W, mark, o.size);
  const { x, y } = place(W, H, w, h, o.position, o.margin);
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, o.opacity / 100));
  ctx.drawImage(mark as never, x, y, w, h);
  ctx.restore();
}

export function drawTiled(
  ctx: Surface,
  W: number,
  H: number,
  mark: Mark & object,
  o: TiledOptions,
) {
  const { w, h } = markSize(W, mark, o.size);
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, o.opacity / 100));
  ctx.translate(W / 2, H / 2);
  ctx.rotate((o.angle * Math.PI) / 180);
  for (const c of tileCenters(W, H, w, h, o.gap)) {
    ctx.drawImage(mark as never, c.x - w / 2, c.y - h / 2, w, h);
  }
  ctx.restore();
}
