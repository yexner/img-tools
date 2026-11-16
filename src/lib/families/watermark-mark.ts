// Making the watermark picture: a piece of text drawn once at a fixed size, or an uploaded logo.
// It is a transparent bitmap that the worker scales to each picture.
import { loadPicture } from '#lib/core/bitmap';

export type FontChoice = 'display' | 'sans' | 'mono';

export const fonts: Record<FontChoice, { label: string; css: string }> = {
  display: { label: 'Display', css: '700 {px}px "Bricolage Grotesque", sans-serif' },
  sans: { label: 'Plain', css: '700 {px}px "Atkinson Hyperlegible Next", sans-serif' },
  mono: { label: 'Typewriter', css: '500 {px}px "JetBrains Mono", monospace' },
};

interface TextMarkOptions {
  color: string;
  shadow: boolean;
  font: FontChoice;
}

const SIZE = 160;

/** The text as a transparent picture, as tight as the letters allow (plus room for the shadow). */
export async function textMark(text: string, o: TextMarkOptions): Promise<ImageBitmap | null> {
  const line = text.trim();
  if (!line) return null;
  const font = fonts[o.font].css.replace('{px}', String(SIZE));
  await document.fonts.load(font, line).catch(() => []);
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.font = font;
  const m = probe.measureText(line);
  const pad = Math.round(SIZE * (o.shadow ? 0.18 : 0.06));
  const ascent = Math.ceil(m.actualBoundingBoxAscent);
  const descent = Math.ceil(m.actualBoundingBoxDescent);
  const left = Math.ceil(m.actualBoundingBoxLeft);
  const width = Math.max(1, Math.ceil(m.actualBoundingBoxRight + left) + 2 * pad);
  const height = Math.max(1, ascent + descent + 2 * pad);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = o.color;
  if (o.shadow) {
    ctx.shadowColor = 'rgb(0 0 0 / 0.6)';
    ctx.shadowBlur = SIZE * 0.06;
    ctx.shadowOffsetX = SIZE * 0.03;
    ctx.shadowOffsetY = SIZE * 0.03;
  }
  ctx.fillText(line, pad + left, pad + ascent);
  return createImageBitmap(canvas);
}

/** An uploaded logo, limited to a size that is plenty for any watermark. */
export const logoMark = (file: Blob) => loadPicture(file, 1200);
