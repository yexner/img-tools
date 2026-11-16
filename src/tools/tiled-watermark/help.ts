import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one or more pictures.',
    'Type your text, or choose a logo. Set its size, the angle, the gap between marks and the opacity. The preview shows the first picture.',
    'Press Add watermark, then download each file or all of them as one ZIP.',
  ],
  faq: [
    {
      q: 'Why repeat the mark?',
      a: 'A single mark in a corner can be cropped off. A repeated mark covers the whole picture, so there is no clean part left to crop to.',
    },
    {
      q: 'What do angle and gap do?',
      a: "The angle turns the whole pattern. The gap is the space between marks, as a share of the mark's own size.",
    },
    {
      q: 'Will it look the same on every picture?',
      a: "Yes. The size is a share of each picture's width, so the pattern looks alike on small and large pictures.",
    },
    {
      q: 'Can the watermark be removed again?',
      a: 'It is drawn into the pixels, so it cannot be switched off. Keep your originals.',
    },
  ],
} satisfies Help;
