import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one or more images. The details appear straight away.',
    'Read the format, size in pixels, file size, aspect ratio and DPI.',
    'Remove a file with its X button, or remove them all.',
  ],
  faq: [
    {
      q: 'How is the format found?',
      a: 'From the contents of the file, not from its name. A file called photo.jpg that is really a PNG is shown as PNG.',
    },
    {
      q: 'What is the nearest common ratio?',
      a: 'The well-known shape closest to your picture, such as 16:9 or 4:3, and how far off it is. A picture that is exactly 16:9 says so.',
    },
    {
      q: 'Why is there no DPI?',
      a: 'DPI is optional and many files do not store it. Websites and phones usually leave it out. It only matters for printing.',
    },
    {
      q: 'Are photos shown the right way up?',
      a: 'Yes. The width and height are those of the photo as it is displayed, after its stored orientation is applied.',
    },
    {
      q: 'Is anything uploaded?',
      a: 'No. Only the first bytes of each file are read, in your browser.',
    },
  ],
} satisfies Help;
