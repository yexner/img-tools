import type { Help } from '#lib/types';

export default {
  steps: [
    'Add images, or drop a whole folder.',
    'Use Left and Right to turn the pictures in 90° steps, and the flip buttons to mirror them. The preview updates at once.',
    'Press Rotate, then download each file or all of them as one ZIP.',
  ],
  faq: [
    {
      q: 'Is any quality lost?',
      a: 'The turn itself loses nothing: every pixel moves to its new place. JPG, WebP and AVIF files must be saved again, so they are written at a high quality (95 by default) and may differ from the original by a tiny amount. PNG stays exact.',
    },
    {
      q: 'What does flipping do?',
      a: 'Flip horizontally mirrors the picture left to right. Flip vertically turns it upside down as in a mirror. Both can be used together, and they apply after the turn.',
    },
    {
      q: 'Why does my photo look turned in other programs?',
      a: 'Some photos only carry a note saying how they should be turned. This tool applies that note first, then your turn, and the saved file needs no note.',
    },
    {
      q: 'Is metadata removed?',
      a: 'Yes. Camera details and location are left out of the saved file.',
    },
  ],
} satisfies Help;
