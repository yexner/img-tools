import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one picture.',
    'Move the pointer over it. The magnifier shows the pixels under the pointer and their exact color.',
    'Click to copy the hex value and add it to the list of samples. Click a sample to copy it again.',
  ],
  faq: [
    {
      q: 'Can I use the keyboard?',
      a: 'Yes. Tab to the picture, move the crosshair with the arrow keys (hold Shift to move 10 pixels at a time) and press Enter to pick the color.',
    },
    {
      q: 'How many samples are kept?',
      a: 'The last 24. Clear empties the list. Nothing is stored after you leave the page.',
    },
    {
      q: 'Is the color exact?',
      a: 'Yes, it is the value of the pixel as your browser decodes it. A very large picture is shown at up to 6000 pixels on its longest side, so one pixel there can stand for several.',
    },
    {
      q: 'What about transparent pixels?',
      a: 'They are shown with their transparency, for example "rgba(0, 0, 0, 0)", and the hex value ends with the alpha part.',
    },
  ],
} satisfies Help;
