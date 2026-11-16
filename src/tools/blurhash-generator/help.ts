import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one image.',
    'Choose the detail: how many steps across and down. More steps keep more of the picture but make a longer hash.',
    'Copy the BlurHash, the CSS or the tiny image, and compare the preview with your original.',
  ],
  faq: [
    {
      q: 'What is a BlurHash?',
      a: 'A short piece of text, about 20 to 30 characters, that describes a blurry version of a picture. A web page can turn it into a soft placeholder while the real image loads.',
    },
    {
      q: 'How do I use it?',
      a: 'Store the text next to your image. In the browser, a BlurHash library decodes it into a small picture that you draw on a canvas or turn into an image. The CSS and data URI versions need no library at all.',
    },
    {
      q: 'What detail should I choose?',
      a: '4 across and 3 down is the usual choice. A wide picture can use more across, a tall one more down. The hash grows with both numbers.',
    },
    {
      q: 'What about transparency?',
      a: 'BlurHash has no transparency, so transparent areas are treated as white.',
    },
    {
      q: 'Is the picture uploaded?',
      a: 'No. The hash is made in your browser.',
    },
  ],
} satisfies Help;
