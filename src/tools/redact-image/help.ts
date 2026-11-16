import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one or more pictures.',
    'Drag on a picture to draw a region over what you want to hide. Add as many as you need.',
    'Choose black, white or your own color.',
    'Press Redact. With several pictures, you can copy the regions from one to all the others first.',
  ],
  faq: [
    {
      q: 'Can the hidden part be recovered?',
      a: 'No. Each region is painted with one solid color and the result is saved as a single flat picture. The original pixels are not stored anywhere in the new file.',
    },
    {
      q: 'Is this safer than blurring?',
      a: 'Yes. A blur keeps some of what was underneath. A solid box keeps nothing, so it is the right choice for names, numbers and anything private.',
    },
    {
      q: 'Does the file still hold other hidden data?',
      a: 'No. Camera details, location and every other hidden block are left out of the saved file.',
    },
    {
      q: 'How do I move or remove a region?',
      a: 'Drag a region to move it, drag its handles to resize it, and press Delete to remove it. With the keyboard, Tab to a region, then use the arrow keys, or Ctrl with the arrow keys to resize.',
    },
  ],
} satisfies Help;
