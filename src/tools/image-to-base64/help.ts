import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one or more images.',
    'The encoded text appears under each image.',
    'Copy the data URI, the HTML tag or the CSS value, or download it as a text file.',
  ],
  faq: [
    {
      q: 'What is a data URI?',
      a: 'It is the image written out as text, so it can sit inside a web page or a stylesheet instead of being a separate file.',
    },
    {
      q: 'Why is the text longer than the file?',
      a: 'Base64 turns every 3 bytes into 4 characters, so the text is about a third bigger than the image. The exact increase is shown for each file.',
    },
    {
      q: 'When is it a good idea?',
      a: 'For very small images such as icons. Large images make a page slower to load, because they cannot be cached on their own.',
    },
    {
      q: 'Is the image changed?',
      a: 'No. The original bytes are encoded as they are, with no recompression and nothing removed.',
    },
  ],
} satisfies Help;
