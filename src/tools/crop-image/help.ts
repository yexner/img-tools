import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one or more images. Select the one you want to crop in the list.',
    'Drag the box to move it, or drag its handles to resize it. Pick a ratio such as 1:1 or 16:9, or type exact values in pixels.',
    'For a round picture, choose Circle or Oval under Shape. The outside becomes transparent and the result is saved as PNG or WebP.',
    'To use the same crop on every image, press "Apply this crop to all images".',
    'Press Crop, then download each file or all of them as one ZIP.',
  ],
  faq: [
    {
      q: 'Can I use only the keyboard?',
      a: 'Yes. Click the box or tab to it. The arrow keys move it by 1 pixel, or 10 with Shift held. Hold Ctrl, Alt or ⌘ with the arrow keys to make it bigger or smaller. You can also type values in the Left, Top, Width and Height fields.',
    },
    {
      q: 'What does "Apply this crop to all images" do?',
      a: 'It cuts the same part from every image, as a share of its size. A box over the left half of one image covers the left half of the others, even when they have other sizes. Images you adjust afterwards keep their own box.',
    },
    {
      q: 'Can I crop to a circle or an oval?',
      a: 'Yes. Under Shape choose Circle (always round) or Oval (any width and height). The edge is smooth and the area outside is transparent, so the result is saved as PNG or WebP, because JPG cannot store transparency. The shape applies to every image, and you can scale the result to 256, 512 or 1024 pixels, which suits profile pictures.',
    },
    {
      q: 'Is the picture scaled?',
      a: 'No, unless you choose an output size for a circle or oval. Otherwise the saved file holds exactly the pixels inside the box.',
    },
    {
      q: 'Which format is the result?',
      a: 'The same as the original by default. Choose JPG, PNG, WebP or AVIF to change it.',
    },
    {
      q: 'Is metadata removed?',
      a: 'Yes. Camera details and location are left out, and photos stay upright.',
    },
  ],
} satisfies Help;
