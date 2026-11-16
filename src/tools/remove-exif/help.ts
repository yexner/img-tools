import type { Help } from '#lib/types';

export default {
  steps: [
    'Add photos, or drop a whole folder.',
    'Keep "Original" to clean each file in its own format, or choose JPG, PNG or WebP. Every kind of metadata is ticked for removal; clear a box to keep that kind in all files.',
    'Press Remove metadata. Each file shows what was removed.',
    'Download each file, or all of them as one ZIP.',
  ],
  faq: [
    {
      q: 'What is removed?',
      a: 'By default everything: the GPS location, camera and lens details, dates and times, software names, comments, thumbnails, color profiles and every other hidden block. The picture itself stays the same. Clear a box to keep that kind of detail. The choice applies to the whole batch, not to single pictures.',
    },
    {
      q: 'Is the picture changed?',
      a: 'JPG, PNG and WebP files are cleaned directly, so the pixels are not touched at all. Other formats, and any file you save in a different format, are saved again, which can change them slightly.',
    },
    {
      q: 'When is a file saved again?',
      a: 'When a photo is only marked as turned, because simply removing the mark would show it sideways. Also when its color profile is not sRGB, because removing it would change the colors. The file then shows a note, and the photo is converted to sRGB.',
    },
    {
      q: 'Can I check the result?',
      a: 'Yes. Add the cleaned file to the EXIF viewer. It should show no details.',
    },
    {
      q: 'Is anything uploaded?',
      a: 'No. Files are cleaned in your browser.',
    },
  ],
} satisfies Help;
