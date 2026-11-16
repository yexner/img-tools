import type { Help } from '#lib/types';

export default {
  steps: [
    'Add images in any mix of formats, or drop a whole folder.',
    'Choose how to compress: by quality, or to a file size in KB such as 50 or 100. Each file keeps its own format unless you pick another under Save as.',
    'Press Compress and check the size of each file. With one JPG, WebP or AVIF selected, the preview shows the real result and a before/after split.',
    'Download each file, or all of them as one ZIP.',
  ],
  faq: [
    {
      q: 'Does the file type change?',
      a: 'No. A JPG stays a JPG, a PNG stays a PNG and so on, unless you choose JPG, WebP, AVIF or PNG under Save as. A GIF is the exception: it cannot be written, so it is saved as a PNG with its first frame only. Use Compress GIF to keep an animation.',
    },
    {
      q: 'How do I compress an image to 100 KB or another size?',
      a: 'Choose "To a file size", pick a preset or enter your own number, and press Compress. The best quality that still fits is found for each file. One KB is 1000 bytes here, so the result also fits websites that count 1024 bytes per KB.',
    },
    {
      q: 'What if the target cannot be reached?',
      a: 'The smallest result possible is returned, and the file is marked "target not reached". Try a larger target, save as JPG or WebP, or set a smaller longest edge under Advanced.',
    },
    {
      q: 'Which quality should I pick?',
      a: 'About 75 is a good balance for photos. Below about 50, blocky edges start to appear. Use the split view and zoom to check.',
    },
    {
      q: 'How are PNG files made smaller?',
      a: '"Lossless" repacks the file without changing a single pixel, so the saving is smaller. "Reduced colors" redraws the picture with at most 256, 64 or 16 colors, which suits screenshots, logos and drawings; photographs can show banding. In file size mode, colors are reduced step by step until the PNG fits.',
    },
    {
      q: 'Which format gives the smallest file?',
      a: 'AVIF is usually the smallest, then WebP, then JPG. PNG keeps every pixel exactly, so it stays large; it is best for graphics, logos and screenshots. JPG cannot store transparency, so transparent areas become white.',
    },
    {
      q: 'Why did my file get bigger?',
      a: 'Files that are already well compressed can grow when saved again. The result is flagged, and you can keep the original.',
    },
    {
      q: 'Is metadata removed?',
      a: 'Yes. Camera details, location, text comments and time stamps are left out of the compressed file, and photos stay upright.',
    },
  ],
} satisfies Help;
