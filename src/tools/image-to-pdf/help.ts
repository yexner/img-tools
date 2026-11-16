import type { Help } from '#lib/types';

export default {
  steps: [
    'Add JPG, PNG or WebP images. Each image becomes one page.',
    'Use the arrows to put the pages in order, or remove the ones you do not want.',
    'Press Create PDF, then download the file.',
  ],
  faq: [
    {
      q: 'Is the image quality reduced?',
      a: 'No. JPG images are placed in the PDF exactly as they are. PNG and WebP images are stored without any loss.',
    },
    {
      q: 'What size are the pages?',
      a: 'Each page has the size of its image. There is no paper size, no cropping and no margin.',
    },
    {
      q: 'Why is my PDF larger than the images?',
      a: 'JPG images add almost nothing. PNG and WebP images are stored without loss, which can take more space than the original file.',
    },
    {
      q: 'Are photos taken in portrait mode the right way up?',
      a: 'Yes. The orientation stored in the photo is respected.',
    },
    {
      q: 'Are my images uploaded?',
      a: 'No. The PDF is created in your browser, and nothing leaves your device.',
    },
  ],
} satisfies Help;
