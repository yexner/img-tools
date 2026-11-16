import type { Help } from '#lib/types';

export default {
  steps: [
    'Add your photos.',
    'Pick a print size or enter your own, then choose the resolution. 300 DPI suits most prints.',
    'Choose how the photo fills the size, then press Resize.',
    'Download each file or all of them as one ZIP.',
  ],
  faq: [
    {
      q: 'What does DPI mean?',
      a: 'It is how many pixels are printed per inch. A print of 10.2 cm × 15.2 cm (4 in × 6 in) at 300 DPI needs 1200 × 1800 pixels. The chosen DPI is stored in the file, so print software uses the right size.',
    },
    {
      q: 'What is the difference between the three fit options?',
      a: 'Fit within keeps the whole photo, undistorted. Crop to fill covers the whole size and trims the edges, centered. Stretch to fill covers the whole size by stretching the photo, which distorts it.',
    },
    {
      q: 'What happens with landscape and portrait photos together?',
      a: 'Each photo is fitted on its own. A landscape photo uses a box of 15.2 cm × 10.2 cm (6 in × 4 in) for a print of 10.2 cm × 15.2 cm (4 in × 6 in), and a portrait photo uses the print size as it is.',
    },
    {
      q: 'Why are only JPG and PNG offered?',
      a: 'WebP and AVIF cannot store the print resolution reliably, so they are hidden here.',
    },
    {
      q: 'Is the photo enlarged?',
      a: 'Yes, if it has fewer pixels than the print needs. It then has the right size but not more detail.',
    },
  ],
} satisfies Help;
