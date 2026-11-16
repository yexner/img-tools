// Aspect ratios for the size checker and the crop tools.

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** 4000 x 3000 → "4:3". */
export function simplify(width: number, height: number): string {
  const d = gcd(width, height) || 1;
  return `${width / d}:${height / d}`;
}

/** Ratios people recognize, wide and tall. */
const COMMON_RATIOS: [number, number][] = [
  [1, 1],
  [5, 4],
  [4, 3],
  [3, 2],
  [16, 10],
  [16, 9],
  [2, 1],
  [21, 9],
  [3, 1],
  [4, 5],
  [3, 4],
  [2, 3],
  [10, 16],
  [9, 16],
  [1, 2],
  [9, 21],
];

interface Nearest {
  label: string;
  /** How far the picture is from that ratio, in percent. 0 means exact. */
  offByPercent: number;
}

export function nearestRatio(width: number, height: number): Nearest {
  const r = width / height;
  let best = COMMON_RATIOS[0];
  let off = Infinity;
  for (const c of COMMON_RATIOS) {
    const d = Math.abs(Math.log(r / (c[0] / c[1])));
    if (d < off) {
      off = d;
      best = c;
    }
  }
  const percent = Math.abs(r / (best[0] / best[1]) - 1) * 100;
  return { label: `${best[0]}:${best[1]}`, offByPercent: Math.round(percent * 10) / 10 };
}
