export interface Box {
  width: number;
  height: number;
}

interface Placed {
  x: number;
  y: number;
}

export interface Packing {
  width: number;
  height: number;
  /** Where each picture goes, in the order they were given. */
  places: Placed[];
}

/**
 * Pack pictures into rows ("shelves") on one sheet. Tall pictures go first; a row ends when the next one
 * would pass the target width, which is chosen to give a sheet that is roughly square.
 */
export function pack(boxes: Box[], gap: number): Packing {
  if (!boxes.length) return { width: 0, height: 0, places: [] };
  const area = boxes.reduce((n, b) => n + (b.width + gap) * (b.height + gap), 0);
  const widest = Math.max(...boxes.map((b) => b.width));
  const target = Math.max(widest, Math.ceil(Math.sqrt(area)));
  const order = boxes.map((_, i) => i).sort((a, b) => boxes[b].height - boxes[a].height || a - b);
  const places: Placed[] = new Array(boxes.length);
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  let width = 0;
  for (const i of order) {
    const b = boxes[i];
    if (x > 0 && x + b.width > target) {
      y += rowHeight + gap;
      x = 0;
      rowHeight = 0;
    }
    places[i] = { x, y };
    x += b.width + gap;
    rowHeight = Math.max(rowHeight, b.height);
    width = Math.max(width, x - gap);
  }
  return { width, height: y + rowHeight, places };
}

/** A CSS-safe class name from a file name: `Home Icon.png` → `icon-home-icon`. Repeats get a number. */
export function className(fileName: string, taken: Set<string>): string {
  const stem = fileName.replace(/\.[^.]+$/, '');
  const slug =
    stem
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'image';
  let name = `icon-${slug}`;
  for (let n = 2; taken.has(name); n++) name = `icon-${slug}-${n}`;
  taken.add(name);
  return name;
}

export interface Sprite {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The CSS for a sheet: a shared `.icon` class and one class per picture. */
export function toCss(sprites: Sprite[], sheet: Box, retina: boolean): string {
  const lines = [
    '.icon {',
    '  display: inline-block;',
    '  background-image: url("sprite.png");',
    '  background-repeat: no-repeat;',
    '}',
  ];
  for (const s of sprites) {
    lines.push(
      '',
      `.${s.name} {`,
      `  width: ${s.width}px;`,
      `  height: ${s.height}px;`,
      `  background-position: ${s.x ? `-${s.x}px` : '0'} ${s.y ? `-${s.y}px` : '0'};`,
      '}',
    );
  }
  if (retina) {
    lines.push(
      '',
      '@media (min-resolution: 2dppx), (-webkit-min-device-pixel-ratio: 2) {',
      '  .icon {',
      '    background-image: url("sprite@2x.png");',
      `    background-size: ${sheet.width}px ${sheet.height}px;`,
      '  }',
      '}',
    );
  }
  return lines.join('\n') + '\n';
}
