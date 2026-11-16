import type { Help } from '#lib/types';

export default {
  steps: [
    'Add the pictures in play order, then use the arrows to change their order.',
    'Set how long each frame stays on screen. Use one delay for all, or switch on per-frame delays.',
    'Choose the number of colors, whether it loops, and the output width.',
    'Press Create GIF, check the preview, then download it.',
  ],
  faq: [
    {
      q: 'What if my pictures have different shapes?',
      a: 'Every frame is cut from the center to match the shape of the first picture, so nothing is stretched. Put the picture whose shape you want first.',
    },
    {
      q: 'How many colors should I use?',
      a: '256 looks best and gives the biggest file. 64 or 32 make smaller files and suit drawings and logos better than photos.',
    },
    {
      q: 'What does the delay mean?',
      a: 'It is how long a frame stays on screen, in milliseconds. 100 is a tenth of a second. Very short delays may be shown more slowly by browsers.',
    },
    {
      q: 'What is the output width?',
      a: 'The width of the GIF in pixels. By default it is the width of the first picture. A smaller width gives a smaller file.',
    },
    {
      q: 'Is transparency kept?',
      a: 'Transparent areas are filled with white, because the frames are cut and scaled first and GIF only allows fully transparent or fully solid pixels.',
    },
  ],
} satisfies Help;
