import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one screenshot.',
    'Pick a background and a window style (Mac, Windows or Ubuntu/Linux), then set the padding, the corner radius, the title bar and the shadow.',
    'Choose a shape for the picture: automatic, 16:9, square or 4:5, to suit where you will post it.',
    'Press Download.',
  ],
  faq: [
    {
      q: 'What do the shapes do?',
      a: 'Automatic wraps the window with the padding you chose. The other shapes make the whole picture exactly 16:9, square or 4:5 by adding background on two sides. The screenshot is never stretched or cut.',
    },
    {
      q: 'Is the screenshot scaled?',
      a: 'No. It keeps its own size, and the padding, corners and shadow scale with it, so the result looks the same at any resolution.',
    },
    {
      q: 'Can I make the title bar different?',
      a: 'Choose Mac (the default), Windows or Ubuntu / Linux. Each is a simple bar with the usual window buttons, drawn to resemble that desktop, not copied from it. You can also switch the bar off. Choosing a style sets a matching corner radius, which you can change.',
    },
    {
      q: 'Does it keep transparency?',
      a: 'The background is always filled, so the result has none. Pick PNG for the best quality of text.',
    },
  ],
} satisfies Help;
