import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one image.',
    'Click the most important part of the picture. Every crop is centered on that point.',
    'Tick the sizes you need. They are grouped by platform.',
    'Press Resize, then download each file or all of them as one ZIP.',
  ],
  faq: [
    {
      q: 'Is the picture stretched?',
      a: 'Never. Each size is cut from the picture in the right shape, around your point, and then scaled to the exact size.',
    },
    {
      q: 'What if the picture is smaller than a size?',
      a: 'It is scaled up, which makes it soft. Start from a larger picture for the best result.',
    },
    {
      q: 'Where do the sizes come from?',
      a: "From each platform's own help pages, checked on 25 October 2026. Each size lists its source below. Platforms change their advice now and then, so check the source if a size matters.",
    },
    {
      q: 'How are the files named?',
      a: 'By platform and size, for example `instagram-portrait-1080x1350.jpg`.',
    },
    {
      q: 'Is metadata removed?',
      a: 'Yes. Camera details and location are left out, and photos stay upright.',
    },
  ],
} satisfies Help;
