import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one picture.',
    'Choose how many colors you want: 4, 6, 8 or 10, or pick Custom and type any number from 1 to 64.',
    'Click a swatch to copy its hex value, or export the whole palette as CSS variables, JSON or a Tailwind theme.',
  ],
  faq: [
    {
      q: 'How are the colors chosen?',
      a: 'Similar colors are grouped together, and each group is shown as its average color. The share tells how much of the picture the group covers, and the swatches are ordered from most to least.',
    },
    {
      q: 'What about transparent areas?',
      a: "They are ignored, so a logo on a clear background gives the logo's colors and not the background.",
    },
    {
      q: 'Why does a color look different from what I expected?',
      a: 'The tool shows an average of a group of similar colors. A tiny bright detail may be absorbed into a larger group. Ask for more colors to find it.',
    },
    {
      q: 'What are the export formats for?',
      a: 'CSS variables go into a stylesheet, JSON suits scripts and design tools, and the Tailwind snippet goes into a Tailwind configuration file.',
    },
  ],
} satisfies Help;
