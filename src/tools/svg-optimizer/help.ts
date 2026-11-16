import type { Help } from '#lib/types';

export default {
  steps: [
    'Add an SVG file, or paste the markup into the box.',
    'Leave the safe defaults on, or adjust the number precision and the options below them.',
    'Compare the sizes and the two pictures, then download the file or copy the markup.',
  ],
  faq: [
    {
      q: 'Does the picture change?',
      a: 'It should look the same. The tool removes comments, editor data, hidden and empty elements and unneeded digits. Lowering the number precision can move shapes by a tiny amount, so check the preview.',
    },
    {
      q: 'What is number precision?',
      a: 'How many digits are kept after the decimal point in coordinates. 3 is a safe default. Small icons can use 1 or 2, and large drawings may need more.',
    },
    {
      q: 'Why keep the viewBox?',
      a: 'The viewBox lets an SVG scale to any size. Without it, the picture may stop scaling. Removing width and height also needs the viewBox, so that option keeps it.',
    },
    {
      q: 'Why keep IDs?',
      a: 'Style sheets and scripts on your page may refer to an element by its ID. Keeping IDs is safer. Turn it off to shorten or remove them when nothing refers to them.',
    },
    {
      q: 'Is it safe to preview an SVG from somewhere else?',
      a: 'Yes. The previews show the SVG as a picture, and scripts inside it do not run. The tool never puts SVG markup into the page itself.',
    },
  ],
} satisfies Help;
