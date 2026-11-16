import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one photo.',
    'Pick a look, then add fade or grain, and adjust brightness, contrast and saturation. They all combine.',
    'Drag the line in the preview to compare with the original.',
    'Choose a format and press Download. The saved file has the full resolution of your photo.',
  ],
  faq: [
    {
      q: 'Is the saved photo the same as the preview?',
      a: 'It has the same look. The preview is a smaller copy for speed, and the saved file is made from your full-size photo.',
    },
    {
      q: 'What do fade and grain do?',
      a: 'Fade lifts the dark parts and softens the bright ones, like an old film print. Grain adds fine noise, like film. The grain is always the same pattern for the same picture.',
    },
    {
      q: 'Can I undo a look?',
      a: 'Yes. Choose None and set the sliders back to zero. Your original file is never changed.',
    },
    {
      q: 'Why do I have to wait a moment for big photos?',
      a: 'Every pixel is processed in your browser, in the background, and the page stays usable. Large photos take longer.',
    },
    {
      q: 'Is metadata removed?',
      a: 'Yes. Camera details and location are left out, and photos stay upright.',
    },
  ],
} satisfies Help;
