// The design of a social preview image: what the settings hold, what is allowed in them, and how text is fitted.

export const WIDTH = 1200;
export const HEIGHT = 630;

export type FontId = 'sans' | 'serif' | 'mono' | 'display';
export type TemplateId = 'classic' | 'centered' | 'bottom' | 'stripe' | 'frame' | 'corner';
type BackgroundKind = 'gradient' | 'solid' | 'image';
type Format = 'png' | 'jpeg' | 'webp';

export const FONTS: Record<FontId, { label: string; family: string; weight: number }> = {
  sans: { label: 'Sans', family: '"Atkinson Hyperlegible Next", sans-serif', weight: 700 },
  serif: { label: 'Serif', family: '"Source Serif 4", serif', weight: 700 },
  mono: { label: 'Mono', family: '"JetBrains Mono", monospace', weight: 500 },
  display: { label: 'Display', family: '"Bricolage Grotesque", sans-serif', weight: 700 },
};

export { GRADIENTS } from '#lib/data/gradients';
import { GRADIENTS } from '#lib/data/gradients';

/** The eight directions, as CSS angles: 0 is upward, 90 to the right. */
export const DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315] as const;

export interface Design {
  template: TemplateId;
  tag: string;
  title: string;
  subtitle: string;
  background: BackgroundKind;
  /** A preset id, or `custom` for the two colors below. */
  gradient: string;
  direction: number;
  from: string;
  to: string;
  solid: string;
  grid: boolean;
  grain: boolean;
  font: FontId;
  textColor: string;
  format: Format;
}

export const defaultDesign: Design = {
  template: 'classic',
  tag: 'Guide',
  title: 'A clear title that says what the page is about',
  subtitle: 'A short line that adds detail',
  background: 'gradient',
  gradient: 'dusk',
  direction: 135,
  from: '#1f2a68',
  to: '#a23b72',
  solid: '#1f2a68',
  grid: false,
  grain: false,
  font: 'display',
  textColor: '#ffffff',
  format: 'png',
};

const HEX = /^#[0-9a-f]{6}$/i;
const TEMPLATES: TemplateId[] = ['classic', 'centered', 'bottom', 'stripe', 'frame', 'corner'];

const pickEnum = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
const pickText = (v: unknown, max: number, fallback: string) =>
  typeof v === 'string' ? v.slice(0, max) : fallback;
const pickColor = (v: unknown, fallback: string) =>
  typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fallback;

/**
 * Turn anything (a file the visitor imported, an old saved design) into a design that is safe to use:
 * unknown fields are dropped and every value is checked, so a bad file can never break the page.
 */
export function parseDesign(raw: unknown): Design | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const d = defaultDesign;
  return {
    template: pickEnum(r.template, TEMPLATES, d.template),
    tag: pickText(r.tag, 40, d.tag),
    title: pickText(r.title, 140, d.title),
    subtitle: pickText(r.subtitle, 160, d.subtitle),
    background: pickEnum(r.background, ['gradient', 'solid', 'image'], d.background),
    gradient: pickEnum(r.gradient, [...GRADIENTS.map((g) => g.id), 'custom'], d.gradient),
    direction: pickEnum(
      String(r.direction),
      DIRECTIONS.map(String),
      String(d.direction),
    ) as unknown as number,
    from: pickColor(r.from, d.from),
    to: pickColor(r.to, d.to),
    solid: pickColor(r.solid, d.solid),
    grid: r.grid === true,
    grain: r.grain === true,
    font: pickEnum(r.font, ['sans', 'serif', 'mono', 'display'], d.font),
    textColor: pickColor(r.textColor, d.textColor),
    format: pickEnum(r.format, ['png', 'jpeg', 'webp'], d.format),
  };
}

/** `direction` comes out of `parseDesign` as a number. */
export const normalized = (d: Design): Design => ({ ...d, direction: Number(d.direction) });

/** The two colors of the chosen gradient. */
export function gradientColors(d: Design): [string, string] {
  if (d.gradient === 'custom') return [d.from, d.to];
  const g = GRADIENTS.find((x) => x.id === d.gradient) ?? GRADIENTS[0];
  return [g.from, g.to];
}

export { fitText } from '#lib/core/text-fit';

/** A small seeded random number generator, so the grain looks the same in the preview and in the file. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Start and end of a linear gradient across a box for a CSS angle (0 = up, 90 = right). */
export function gradientLine(angle: number, w: number, h: number) {
  const a = (angle * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  const cx = w / 2;
  const cy = h / 2;
  return {
    x0: cx - (dx * len) / 2,
    y0: cy - (dy * len) / 2,
    x1: cx + (dx * len) / 2,
    y1: cy + (dy * len) / 2,
  };
}
