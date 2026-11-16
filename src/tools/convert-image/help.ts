import type { Help } from '#lib/types';

export default {
  steps: [
    'Add images in any mix of formats (HEIC, PNG, JPG, WebP, AVIF, TIFF, BMP, GIF), or drop a whole folder.',
    'Choose the format to save as: JPG, PNG, WebP or AVIF. Then set the quality. 90 suits most photos.',
    'Press Convert, then download each file or all of them as one ZIP.',
  ],
  faq: [
    {
      q: 'Which format should I choose?',
      a: 'JPG opens almost everywhere and suits photos. PNG loses nothing and suits screenshots and graphics. WebP and AVIF give smaller files, but some older programs cannot open them.',
    },
    {
      q: 'How do I open iPhone HEIC photos on Windows?',
      a: 'Add them here and save as JPG or PNG. Each photo keeps its original width and height and stays upright. On browsers that cannot read HEIC themselves, the decoder is downloaded when you open this page.',
    },
    {
      q: 'What happens to transparent areas?',
      a: 'JPG cannot store transparency, so transparent areas become white. PNG, WebP and AVIF keep them.',
    },
    {
      q: 'Which quality should I pick?',
      a: 'The defaults are 90 for JPG, 80 for WebP and 75 for AVIF. Lower values give smaller files, and below about 50 blocky edges start to appear. PNG is lossless, so it has no quality setting.',
    },
    {
      q: 'Why is my new file larger than the original?',
      a: 'PNG stores every pixel without loss, so photos take far more space than as JPG or HEIC. A HEIC or AVIF photo also usually grows as JPG. Simple graphics can grow as JPG. The result list flags a larger file, and you can keep the original.',
    },
    {
      q: 'What happens to a TIFF with several pages, or an animated GIF or WebP?',
      a: 'Every page of a TIFF becomes its own file, named with the page number, for example `scan-page-2.png`. An animated GIF or WebP gives only its first frame.',
    },
    {
      q: 'Is metadata kept?',
      a: 'No. Camera details and location are left out of the new file, and photos stay upright. Your original files are never modified.',
    },
    {
      q: 'Does it work without an internet connection?',
      a: 'Yes, once the page has finished loading. AVIF and WebP encoders are downloaded when you choose them. Nothing is uploaded.',
    },
  ],
} satisfies Help;
