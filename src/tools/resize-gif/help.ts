import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one animated GIF.',
    'Choose a percentage, or enter a width and height. "Keep proportions" is on by default.',
    'Press Resize, then download the result.',
  ],
  faq: [
    {
      q: 'What changes?',
      a: 'Only the size in pixels. The number of frames, how long each is shown and the colors stay as they were.',
    },
    {
      q: 'Do the colors really stay the same?',
      a: 'When the GIF uses 256 colors or fewer in total, the resized frames are mapped back onto those same colors. A GIF with more than that is saved with 256.',
    },
    {
      q: 'Does it loop?',
      a: 'Yes. The result always loops forever.',
    },
    {
      q: 'Can I make it bigger?',
      a: 'Yes, but the picture gets no more detail, so it looks soft.',
    },
    {
      q: 'Is transparency kept?',
      a: 'Yes. A GIF can only be fully transparent or fully solid, so soft edges become hard.',
    },
  ],
} satisfies Help;
