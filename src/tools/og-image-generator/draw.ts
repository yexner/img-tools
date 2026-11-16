// Drawing a design onto a 1200 x 630 canvas. The page preview and the saved file both use this.
import {
  FONTS,
  HEIGHT,
  WIDTH,
  fitText,
  gradientColors,
  gradientLine,
  seeded,
  type Design,
  type TemplateId,
} from './design';

export interface Assets {
  logo?: ImageBitmap | null;
  feature?: ImageBitmap | null;
  background?: ImageBitmap | null;
}

interface Template {
  label: string;
  align: 'left' | 'center';
  vertical: 'top' | 'middle' | 'bottom';
  tag: 'pill' | 'rule' | 'plain';
  accent: 'none' | 'bar' | 'underline' | 'frame' | 'corner';
  pad: number;
}

/** Six layouts. They change how things look and where they sit, never the words. */
export const TEMPLATES: Record<TemplateId, Template> = {
  classic: {
    label: 'Classic',
    align: 'left',
    vertical: 'middle',
    tag: 'pill',
    accent: 'none',
    pad: 80,
  },
  centered: {
    label: 'Centerd',
    align: 'center',
    vertical: 'middle',
    tag: 'plain',
    accent: 'underline',
    pad: 90,
  },
  bottom: {
    label: 'Bottom',
    align: 'left',
    vertical: 'bottom',
    tag: 'rule',
    accent: 'none',
    pad: 72,
  },
  stripe: {
    label: 'Stripe',
    align: 'left',
    vertical: 'middle',
    tag: 'plain',
    accent: 'bar',
    pad: 96,
  },
  frame: {
    label: 'Frame',
    align: 'center',
    vertical: 'middle',
    tag: 'pill',
    accent: 'frame',
    pad: 110,
  },
  corner: {
    label: 'Corner',
    align: 'left',
    vertical: 'top',
    tag: 'rule',
    accent: 'corner',
    pad: 80,
  },
};

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const font = (d: Design, size: number, weight?: number) =>
  `${weight ?? FONTS[d.font].weight} ${size}px ${FONTS[d.font].family}`;

/** Draw a bitmap so that it covers the box, cut from the center. */
function cover(ctx: Ctx, img: ImageBitmap, x: number, y: number, w: number, h: number) {
  const k = Math.max(w / img.width, h / img.height);
  const sw = w / k;
  const sh = h / k;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function background(ctx: Ctx, d: Design, a: Assets) {
  if (d.background === 'solid') {
    ctx.fillStyle = d.solid;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  } else if (d.background === 'image' && a.background) {
    cover(ctx, a.background, 0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = 'rgb(0 0 0 / 0.55)'; // darkened, so the text stays readable
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  } else {
    const [from, to] = gradientColors(d);
    const l = gradientLine(d.direction, WIDTH, HEIGHT);
    const g = ctx.createLinearGradient(l.x0, l.y0, l.x1, l.y1);
    g.addColorStop(0, from);
    g.addColorStop(1, to);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

function overlays(ctx: Ctx, d: Design) {
  if (d.grid) {
    ctx.save();
    ctx.strokeStyle = 'rgb(255 255 255 / 0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= WIDTH; x += 60) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, HEIGHT);
    }
    for (let y = 0; y <= HEIGHT; y += 60) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(WIDTH, y + 0.5);
    }
    ctx.stroke();
    ctx.restore();
  }
  if (d.grain) {
    // A seeded tile of noise, so the preview and the saved file have the same grain.
    const tile =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(200, 200)
        : document.createElement('canvas');
    tile.width = 200;
    tile.height = 200;
    const t = (tile as OffscreenCanvas).getContext('2d') as OffscreenCanvasRenderingContext2D;
    const img = t.createImageData(200, 200);
    const rnd = seeded(20260101);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rnd() * 256);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    t.putImageData(img, 0, 0);
    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = ctx.createPattern(tile as CanvasImageSource, 'repeat')!;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }
}

function accent(ctx: Ctx, d: Design, t: Template) {
  ctx.save();
  ctx.fillStyle = d.textColor;
  ctx.strokeStyle = d.textColor;
  ctx.globalAlpha = 0.9;
  if (t.accent === 'bar') ctx.fillRect(0, 0, 28, HEIGHT);
  if (t.accent === 'frame') {
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.55;
    ctx.strokeRect(40, 40, WIDTH - 80, HEIGHT - 80);
  }
  if (t.accent === 'corner') {
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.moveTo(WIDTH, HEIGHT - 260);
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.lineTo(WIDTH - 360, HEIGHT);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Paint the design. `ctx` is a 1200 x 630 surface; the caller scales it for previews. */
export function drawDesign(ctx: Ctx, d: Design, assets: Assets) {
  const t = TEMPLATES[d.template];
  ctx.save();
  background(ctx, d, assets);
  overlays(ctx, d);
  accent(ctx, d, t);

  const hasFeature = !!assets.feature;
  const pad = t.pad;
  // With a feature picture the words keep to the left part of the image.
  const textW = hasFeature
    ? Math.min(560, WIDTH - 2 * pad)
    : WIDTH - 2 * pad - (t.accent === 'bar' ? 0 : 0);
  const left = t.align === 'center' && !hasFeature ? WIDTH / 2 : pad;
  const align: CanvasTextAlign = t.align === 'center' && !hasFeature ? 'center' : 'left';
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';

  const measure = (text: string, size: number) => {
    ctx.font = font(d, size);
    return ctx.measureText(text).width;
  };

  // Logo, top left (or top center for centered layouts).
  let top = pad - 20;
  if (assets.logo) {
    const h = 56;
    const w = (assets.logo.width / assets.logo.height) * h;
    const x = align === 'center' ? WIDTH / 2 - w / 2 : pad;
    ctx.drawImage(assets.logo, x, pad - 30, Math.min(w, 260), Math.min(w, 260) * (h / w));
    top = pad + 40;
  }

  const tagText = d.tag.trim();
  const tagSize = 26;
  const title = fitText(d.title, {
    maxWidth: textW,
    maxHeight: 300,
    maxSize: 92,
    minSize: 36,
    maxLines: 4,
    lineHeight: 1.12,
    measure,
  });
  const sub = fitText(d.subtitle, {
    maxWidth: textW,
    maxHeight: 90,
    maxSize: 34,
    minSize: 22,
    maxLines: 2,
    lineHeight: 1.3,
    measure: (text, size) => {
      ctx.font = font(d, size, 400);
      return ctx.measureText(text).width;
    },
  });

  const titleH = title.lines.length * title.size * 1.12;
  const subH = sub.lines.length ? sub.lines.length * sub.size * 1.3 + 22 : 0;
  const tagH = tagText ? tagSize * 1.6 + 26 : 0;
  const blockH = tagH + titleH + subH;
  let y =
    t.vertical === 'top'
      ? Math.max(top, pad)
      : t.vertical === 'bottom'
        ? HEIGHT - pad - blockH
        : (HEIGHT - blockH) / 2 + (assets.logo ? 20 : 0);

  ctx.fillStyle = d.textColor;
  if (tagText) {
    ctx.font = font(d, tagSize);
    const w = ctx.measureText(tagText.toUpperCase()).width + 36;
    const x = align === 'center' ? left - w / 2 : left;
    if (t.tag === 'pill') {
      ctx.save();
      ctx.globalAlpha = 0.22;
      roundRect(ctx, x, y, w, tagSize * 1.6, tagSize * 0.8);
      ctx.fill();
      ctx.restore();
    } else if (t.tag === 'rule') {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillRect(x, y + tagSize * 1.6 + 6, 64, 4);
      ctx.restore();
    }
    ctx.textAlign = 'left';
    ctx.fillText(tagText.toUpperCase(), x + (t.tag === 'pill' ? 18 : 0), y + tagSize * 1.15);
    ctx.textAlign = align;
    y += tagH;
  }

  ctx.font = font(d, title.size);
  for (const line of title.lines) {
    y += title.size * 1.12;
    ctx.fillText(line, left, y - title.size * 0.22);
  }
  if (sub.lines.length) {
    y += 22;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.font = font(d, sub.size, 400);
    for (const line of sub.lines) {
      y += sub.size * 1.3;
      ctx.fillText(line, left, y - sub.size * 0.3);
    }
    ctx.restore();
  }
  if (t.accent === 'underline') {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillRect(WIDTH / 2 - 48, y + 28, 96, 5);
    ctx.restore();
  }

  // The feature picture is shown as a card on the right.
  if (assets.feature) {
    const w = 400;
    const h = 400;
    const x = WIDTH - pad - w;
    const cy = (HEIGHT - h) / 2;
    ctx.save();
    ctx.shadowColor = 'rgb(0 0 0 / 0.35)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 16;
    roundRect(ctx, x, cy, w, h, 28);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, x, cy, w, h, 28);
    ctx.clip();
    cover(ctx, assets.feature, x, cy, w, h);
    ctx.restore();
  }
  ctx.restore();
}
