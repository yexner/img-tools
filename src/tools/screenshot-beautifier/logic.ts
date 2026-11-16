export type Shape = 'auto' | '16:9' | '1:1' | '4:5';

export const RATIOS: Record<Exclude<Shape, 'auto'>, number> = {
  '16:9': 16 / 9,
  '1:1': 1,
  '4:5': 4 / 5,
};

export interface Options {
  /** Space around the window, in points: 1000 points are the width of the screenshot. */
  padding: number;
  /** Corner radius, in the same points. */
  radius: number;
  titleBar: boolean;
  shadow: boolean;
  /** 0 to 100. */
  shadowStrength: number;
  shape: Shape;
}

export interface Layout {
  width: number;
  height: number;
  /** The window: title bar and screenshot. */
  win: { x: number; y: number; w: number; h: number };
  /** Size of one point in pixels. */
  unit: number;
  barHeight: number;
}

/** How big the picture is and where the window sits, for a screenshot of the given size. */
export function layoutFor(w: number, h: number, o: Options): Layout {
  const unit = w / 1000;
  const barHeight = o.titleBar ? Math.round(Math.max(28, 46 * unit)) : 0;
  const padding = o.padding * unit;
  const winW = w;
  const winH = h + barHeight;
  let W = winW + 2 * padding;
  let H = winH + 2 * padding;
  if (o.shape !== 'auto') {
    const ratio = RATIOS[o.shape];
    // Grow the shorter side until the picture has the shape; the window stays the same size, in the middle.
    if (W / H < ratio) W = H * ratio;
    else H = W / ratio;
  }
  W = Math.round(W);
  H = Math.round(H);
  return {
    width: W,
    height: H,
    win: { x: Math.round((W - winW) / 2), y: Math.round((H - winH) / 2), w: winW, h: winH },
    unit,
    barHeight,
  };
}
