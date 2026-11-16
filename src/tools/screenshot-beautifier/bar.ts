// The title bar of the framed window, drawn in three looks. Each is drawn from shapes, not from any
// system's artwork, so it only resembles that desktop.
export type WindowStyle = 'mac' | 'windows' | 'linux';

export const STYLES: { value: WindowStyle; label: string; radius: number }[] = [
  { value: 'mac', label: 'Mac (OS X)', radius: 18 },
  { value: 'windows', label: 'Windows', radius: 8 },
  { value: 'linux', label: 'Ubuntu / Linux', radius: 12 },
];

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Draws the bar over the top of the window: `x`, `y` is its top-left corner, `h` its height. */
export function drawBar(ctx: Ctx, style: WindowStyle, x: number, y: number, w: number, h: number) {
  const cy = y + h / 2;
  if (style === 'mac') {
    ctx.fillStyle = '#eceef2';
    ctx.fillRect(x, y, w, h);
    const dot = h * 0.16;
    ['#f26b5e', '#f4bf4f', '#5fc454'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + h * 0.55 + i * dot * 3.2, cy, dot, 0, Math.PI * 2);
      ctx.fill();
    });
    return;
  }

  ctx.lineCap = 'round';
  if (style === 'windows') {
    ctx.fillStyle = '#f3f3f3';
    ctx.fillRect(x, y, w, h);
    // Minimize, maximize and close, each in a box as wide as the bar is tall.
    const box = h * 1.15;
    const g = h * 0.17;
    const center = (i: number) => x + w - box * (i + 0.5);
    ctx.strokeStyle = '#1f1f1f';
    ctx.lineWidth = Math.max(1, h * 0.035);
    ctx.beginPath();
    ctx.moveTo(center(2) - g, cy);
    ctx.lineTo(center(2) + g, cy);
    ctx.stroke();
    ctx.strokeRect(center(1) - g, cy - g, g * 2, g * 2);
    ctx.beginPath();
    ctx.moveTo(center(0) - g, cy - g);
    ctx.lineTo(center(0) + g, cy + g);
    ctx.moveTo(center(0) + g, cy - g);
    ctx.lineTo(center(0) - g, cy + g);
    ctx.stroke();
    return;
  }

  // Ubuntu / GNOME: a dark header bar with round buttons on the right, the close button in orange.
  ctx.fillStyle = '#2d2d2d';
  ctx.fillRect(x, y, w, h);
  const r = h * 0.2;
  const gap = r * 2.7;
  const at = (i: number) => x + w - h * 0.55 - i * gap;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, h * 0.035);
  [2, 1, 0].forEach((i) => {
    ctx.fillStyle = i === 0 ? '#e95420' : '#4a4a4a';
    ctx.beginPath();
    ctx.arc(at(i), cy, r, 0, Math.PI * 2);
    ctx.fill();
    const s = r * 0.42;
    ctx.beginPath();
    if (i === 2) {
      ctx.moveTo(at(i) - s, cy + s * 0.6);
      ctx.lineTo(at(i) + s, cy + s * 0.6);
    } else if (i === 1) {
      ctx.rect(at(i) - s, cy - s, s * 2, s * 2);
    } else {
      ctx.moveTo(at(i) - s, cy - s);
      ctx.lineTo(at(i) + s, cy + s);
      ctx.moveTo(at(i) + s, cy - s);
      ctx.lineTo(at(i) - s, cy + s);
    }
    ctx.stroke();
  });
}
