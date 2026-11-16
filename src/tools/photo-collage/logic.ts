// Collage layout and drawing. The same code draws the preview (small) and the saved file (full size),
// so what is downloaded matches what was shown.

export interface Options {
  /** 1 to 4. */
  columns: number;
  /** Space between pictures, in output pixels. */
  gap: number;
  /** Space around all pictures, in output pixels. */
  margin: number;
  background: string;
  /** Width of the finished image in pixels. */
  width: number;
}

interface Cell {
  x: number;
  y: number;
  size: number;
}

export interface Layout {
  width: number;
  height: number;
  cell: number;
  rows: number;
  cells: Cell[];
}

/** Largest height a canvas can be trusted with in current browsers. */
export const MAX_SIDE = 16384;

export function layout(count: number, o: Options): Layout {
  const columns = Math.min(4, Math.max(1, Math.round(o.columns)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const cell = Math.max(1, (o.width - 2 * o.margin - (columns - 1) * o.gap) / columns);
  const cells: Cell[] = Array.from({ length: count }, (_, i) => ({
    x: o.margin + (i % columns) * (cell + o.gap),
    y: o.margin + Math.floor(i / columns) * (cell + o.gap),
    size: cell,
  }));
  return {
    width: o.width,
    height: Math.round(2 * o.margin + rows * cell + (rows - 1) * o.gap),
    cell,
    rows,
    cells,
  };
}

/** The centered square of a picture that fills a square cell (like CSS `object-fit: cover`). */
export function coverSource(width: number, height: number) {
  const side = Math.min(width, height);
  return { sx: (width - side) / 2, sy: (height - side) / 2, side };
}

interface Drawable {
  width: number;
  height: number;
}

/** Minimal drawing surface, so tests do not need a browser. */
export interface Surface {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, w: number, h: number): void;
  drawImage(
    img: never,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
}

/**
 * Paint the collage at `scale` (1 = full size). `load(i)` gives the i-th picture, and `done(i, picture)`
 * lets the caller free it straight away, which keeps memory low when saving many large photos.
 */
export async function draw<T extends Drawable>(
  ctx: Surface,
  count: number,
  o: Options,
  scale: number,
  load: (index: number) => Promise<T>,
  done?: (index: number, picture: T) => void,
) {
  const l = layout(count, o);
  ctx.fillStyle = o.background;
  ctx.fillRect(0, 0, l.width * scale, l.height * scale);
  for (let i = 0; i < count; i++) {
    const picture = await load(i);
    const { sx, sy, side } = coverSource(picture.width, picture.height);
    const c = l.cells[i];
    ctx.drawImage(
      picture as never,
      sx,
      sy,
      side,
      side,
      c.x * scale,
      c.y * scale,
      c.size * scale,
      c.size * scale,
    );
    done?.(i, picture);
  }
  return l;
}
