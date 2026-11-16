import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one or more pictures.',
    'Drag on a picture to draw a region over a face or anything else you want to hide. Add as many as you need.',
    'Choose Rectangle or Oval as the region shape. An oval fits a face better and leaves the corners of the box untouched.',
    'Choose Blur or Pixelate and how strong it is. The result under the picture updates as you go.',
    'Press Blur. With several pictures, you can copy the regions from one picture to all the others first.',
  ],
  faq: [
    {
      q: 'Are faces found automatically?',
      a: 'No. You draw each region yourself, so nothing about your pictures is analyzed or guessed.',
    },
    {
      q: 'Can a region be round?',
      a: 'Yes. Under Region shape choose Oval. Only the ellipse inside each region box is blurred or pixelated, with a smooth edge, and the corners of the box stay as they were. The shape applies to all regions.',
    },
    {
      q: 'Can a blur be undone?',
      a: 'A strong blur or pixelation cannot be reversed by eye, but a weak one can hint at what is underneath. For text, plates or anything that must stay secret, use Redact image, which paints over the area completely.',
    },
    {
      q: 'How do I move or remove a region?',
      a: 'Drag a region to move it, drag its handles to resize it, and press Delete to remove it. With the keyboard, Tab to a region, then use the arrow keys, or Ctrl with the arrow keys to resize.',
    },
    {
      q: 'What does copying regions do?',
      a: 'It places the same regions, as a share of the picture, on every other picture. It works best for pictures taken from the same spot.',
    },
    {
      q: 'Is metadata removed?',
      a: 'Yes. Camera details and location are left out, and photos stay upright.',
    },
  ],
} satisfies Help;
