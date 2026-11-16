import type { Help } from '#lib/types';

export default {
  steps: [
    'Type your tag, title and subtitle. Long titles shrink to fit.',
    'Pick a template, a background and a font. Add a logo or a feature picture if you like.',
    'Choose PNG, JPG or WebP and download the image. Save the design on this device to come back to it, or export it as a file.',
  ],
  faq: [
    {
      q: 'How do I use the image?',
      a: 'Upload it to your website and add tags like `<meta property="og:image" content="https://example.com/social.png">` to the head of the page. Add `og:title` and `og:description` too. For X, add `<meta name="twitter:card" content="summary_large_image">`. The page address must be an absolute one that starts with https://.',
    },
    {
      q: 'Why 1200 × 630?',
      a: 'It is the size most platforms show best: a wide picture with a ratio of about 1.9 to 1. Keep important words away from the edges, because some apps cut a little off.',
    },
    {
      q: 'Do the templates change my words?',
      a: 'Never. A template only changes where things sit and how they look. The tag, title and subtitle stay exactly as you typed them.',
    },
    {
      q: 'What happens to my saved designs?',
      a: 'They stay in this browser on this device, and nowhere else. Exporting writes the settings to a file you can keep or import on another device. Pictures you added are not saved in the file, so add them again after importing.',
    },
    {
      q: 'What is the grain?',
      a: 'A fine texture over the background. It hides banding in gradients and gives a printed look.',
    },
  ],
} satisfies Help;
