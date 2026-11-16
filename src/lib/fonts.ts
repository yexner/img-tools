const faces = [
  '600 1em "Bricolage Grotesque"',
  '700 1em "Bricolage Grotesque"',
  '400 1em "Atkinson Hyperlegible Next"',
  '700 1em "Atkinson Hyperlegible Next"',
  '400 1em "JetBrains Mono"',
  '500 1em "JetBrains Mono"',
];

/** Load every font face up front, so text never changes font if the network drops later. */
export function warmFonts(): Promise<unknown> {
  return Promise.all(faces.map((f) => document.fonts.load(f))).catch(() => {});
}
