import type { Help } from '#lib/types';

export default {
  steps: [
    'Add images, or drop a whole folder.',
    'Choose how thick the border is and its color. Switch on "Set each side separately" for uneven borders.',
    'Press Add border, then download each file or all of them as one ZIP.',
  ],
  faq: [
    {
      q: 'Is the picture cropped or covered?',
      a: 'No. The picture grows outward, so a 20 px border makes the file 40 px wider and 40 px taller.',
    },
    {
      q: 'How do I get a transparent border?',
      a: 'Choose Transparent. JPG cannot store transparency, so the picture is saved as PNG, or pick WebP or AVIF.',
    },
    {
      q: 'Is the border the same size on every picture?',
      a: 'Yes, it is a fixed number of pixels. A 20 px border looks thinner on a big photo than on a small one.',
    },
    {
      q: 'Is metadata removed?',
      a: 'Yes. Camera details and location are left out, and photos stay upright.',
    },
  ],
} satisfies Help;
