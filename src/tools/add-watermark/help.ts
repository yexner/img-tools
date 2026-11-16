import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one or more pictures.',
    'Type your text, or choose a logo. Pick its size, place on the 3 × 3 grid, margin and opacity. The preview shows the first picture.',
    'Press Add watermark, then download each file or all of them as one ZIP.',
  ],
  faq: [
    {
      q: 'Will the watermark look the same on every picture?',
      a: "Yes. Its size and margin are a share of each picture's width, so a small photo and a large one get a watermark that looks alike.",
    },
    {
      q: 'Which logo files work?',
      a: 'Any picture. A PNG or WebP with a transparent background looks best, because only the logo itself is drawn.',
    },
    {
      q: 'Can the watermark be removed again?',
      a: 'It is drawn into the pixels, so it cannot be switched off. A low opacity makes it harder to notice, but also easier to clean up. Keep your originals.',
    },
    {
      q: 'Why use a shadow?',
      a: 'A soft shadow keeps white text readable on bright pictures. Turn it off for a cleaner look.',
    },
    {
      q: 'Is metadata removed?',
      a: 'Yes. Camera details and location are left out, and photos stay upright.',
    },
  ],
} satisfies Help;
