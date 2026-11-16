import type { Help } from '#lib/types';

export default {
  steps: [
    'Add many images, or drop a whole folder.',
    'Set the crop box on any one image. Pick a shape such as 1:1 if every result must have it.',
    'Check the small pictures below: each one shows what will be cut from it.',
    'Press Crop, then download everything as one ZIP.',
  ],
  faq: [
    {
      q: 'How can one box fit images of different sizes?',
      a: 'The box is remembered as a share of the picture, such as "the middle 80 percent". It is then worked out again for every image, so a big photo and a small one both lose the same share.',
    },
    {
      q: 'What if I choose a fixed shape?',
      a: 'Every result has exactly that shape, even when the images have different shapes. The box is centered on the same spot and kept as wide as the share allows.',
    },
    {
      q: 'Can I crop one image differently?',
      a: 'Not in this tool: every image gets the same crop. Use Crop image to give images their own boxes.',
    },
    {
      q: 'Is anything scaled?',
      a: 'No. Each result holds exactly the pixels inside its box.',
    },
  ],
} satisfies Help;
