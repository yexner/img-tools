import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one picture.',
    'Press Add text, type your words and choose the font, size and color.',
    'Drag the text on the picture to place it. With the keyboard, select the picture area and use the arrow keys.',
    'Add more layers if you need them. Reorder or delete them in the list. Then press Download.',
  ],
  faq: [
    {
      q: 'Is the saved picture the same as the preview?',
      a: "Yes. The preview is the same drawing as the file, only smaller. The text size is a share of the picture's width, so it looks the same at any size.",
    },
    {
      q: 'How do I put text on more than one line?',
      a: 'Press Enter in the text box. Each line is centered, left or right aligned as you choose.',
    },
    {
      q: 'What does the order of the layers mean?',
      a: 'Layers lower in the list are drawn later, so they appear on top. Use the arrows to change the order.',
    },
    {
      q: 'How can I keep text readable on a busy picture?',
      a: 'Switch on the shadow, or put the text on a colored box.',
    },
    {
      q: 'Is metadata removed?',
      a: 'Yes. Camera details and location are left out, and photos stay upright.',
    },
  ],
} satisfies Help;
