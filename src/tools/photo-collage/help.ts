import type { Help } from '#lib/types';

export default {
  steps: [
    'Add several photos.',
    'Use the arrows to put them in order. Choose the number of columns, the gap, the margin and the background color. The preview updates as you go.',
    'Press Create collage, then download the picture.',
  ],
  faq: [
    {
      q: 'How are the photos fitted?',
      a: 'Every cell is a square. Each photo fills its cell and is cut from the center, so nothing is stretched.',
    },
    {
      q: 'How many rows will I get?',
      a: 'Rows are added automatically. With 3 columns and 7 photos you get 3 rows, the last one partly filled.',
    },
    {
      q: 'What size is the result?',
      a: 'The width is the output width you choose, 2048 px by default. The height follows from the number of rows. Very tall results above 16384 px are refused, because browsers cannot draw them.',
    },
    {
      q: 'Does the saved picture match the preview?',
      a: 'Yes. Both are drawn by the same code, the preview just at a smaller size.',
    },
    {
      q: 'Is metadata removed?',
      a: 'Yes. Camera details and location are left out, and photos are shown upright.',
    },
  ],
} satisfies Help;
