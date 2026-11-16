import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one picture.',
    'Type the top text, the bottom text, or both. Either one can stay empty.',
    'Choose the colors, and switch capital letters on or off. The preview updates as you type.',
    'Press Download to save the picture as a JPG, or choose another format.',
  ],
  faq: [
    {
      q: 'What happens to long text?',
      a: 'The text is centered. It shrinks to fit the width, and wraps to a second line when it is long. If it still does not fit at the smallest size, it is cut short with three dots.',
    },
    {
      q: 'Why does the text have an outline?',
      a: 'A dark outline around light letters keeps them readable on busy or bright pictures. Change the colors if you prefer another look.',
    },
    {
      q: 'Is the saved picture the same as the preview?',
      a: 'Yes, but at the original size of your picture. The preview is the same drawing, only smaller.',
    },
    {
      q: 'Is metadata removed?',
      a: 'Yes. Camera details and location are left out, and photos stay upright.',
    },
  ],
} satisfies Help;
