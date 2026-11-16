import type { Help } from '#lib/types';

export default {
  steps: [
    'Add your images, icons or SVG files, in any sizes.',
    'Set the gap between them, and switch on the 2× version if you want one for sharp screens.',
    'Copy the CSS, or download a ZIP with the sprite sheet and its stylesheet.',
  ],
  faq: [
    {
      q: 'What is a sprite sheet?',
      a: 'One image that holds many small ones. A page loads it once and shows a part of it wherever an icon is needed, which saves many separate requests.',
    },
    {
      q: 'How do I use the CSS?',
      a: 'Give an element the class `icon` plus the class of the picture, for example `<span class="icon icon-home"></span>`. The class names come from the file names.',
    },
    {
      q: 'What does the 2× version do?',
      a: 'It adds `sprite@2x.png`, the same sheet drawn at twice the size, and a rule that uses it on sharp screens at the same displayed size. For the best result, start from pictures that are already twice as large as you want to show them, or from SVG files.',
    },
    {
      q: 'Why is there a gap?',
      a: 'A little space keeps neighboring pictures from bleeding into each other when the page scales them. 2 pixels is a safe default.',
    },
    {
      q: 'Can I use SVG files?',
      a: 'Yes. They are drawn at their own size into the PNG sheet. Scripts inside an SVG never run.',
    },
  ],
} satisfies Help;
