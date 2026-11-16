import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one animated GIF.',
    'Choose fewer colors, to keep only every 2nd or 3rd frame, or a smaller size. Combine them for the smallest file.',
    'Press Compress and compare the sizes, then download the result.',
  ],
  faq: [
    {
      q: 'Which setting saves the most?',
      a: 'Making the picture smaller usually saves the most, because the file shrinks with the number of pixels. Fewer frames and fewer colors help too, and they cost less in looks for simple animations.',
    },
    {
      q: 'Does dropping frames make the animation faster?',
      a: 'No. The frames that are kept stay on screen for the time of the ones that were dropped, so the animation lasts about as long as before.',
    },
    {
      q: 'Is transparency kept?',
      a: 'Yes. Transparent areas stay transparent. A GIF can only be fully transparent or fully solid, so soft edges become hard.',
    },
    {
      q: 'Does it loop?',
      a: 'Yes. The result always loops forever.',
    },
    {
      q: 'Why is my file still large?',
      a: 'Photographic animations are hard for GIF, which is an old format. Try the GIF to MP4 tool: a video is usually far smaller.',
    },
  ],
} satisfies Help;
