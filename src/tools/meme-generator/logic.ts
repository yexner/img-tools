/** Limits for the text of a meme on a picture of the given size, in the picture's pixels. */
export function memeBox(width: number, height: number) {
  return {
    maxWidth: width * 0.94,
    maxHeight: height * 0.3,
    maxSize: Math.max(24, Math.min(height * 0.16, width * 0.12)),
    minSize: Math.max(14, width * 0.03),
    maxLines: 2,
    lineHeight: 1.05,
  };
}

export const FONT = '700 {px}px "Bricolage Grotesque", "Atkinson Hyperlegible Next", sans-serif';

/** Outline width for a font size: thick enough to read on any picture. */
export const outlineWidth = (size: number) => Math.max(2, size * 0.14);
