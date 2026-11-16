import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one or more PDF files.',
    'Choose JPG or PNG and the resolution. 150 DPI suits screens; 300 DPI suits printing.',
    'Press Convert. A one-page PDF gives one image; a longer one gives a ZIP with a numbered image per page.',
  ],
  faq: [
    {
      q: 'What does DPI mean?',
      a: 'It is how many pixels are used per inch of the page. Higher values give sharper images and bigger files.',
    },
    {
      q: 'How do I open a password-protected PDF?',
      a: 'You are asked for the password when it is needed. It is used on your device only and is never stored or sent anywhere.',
    },
    {
      q: 'What happens to very large pages?',
      a: 'You are warned before they are rendered. If a page would be too large for your device, it is rendered at the largest safe resolution instead.',
    },
    {
      q: 'How are the files named?',
      a: 'Each page is named after the PDF with the page number added, for example `report-page-03.jpg`. The numbers are padded, so the files sort correctly.',
    },
    {
      q: 'Is text kept as text?',
      a: 'No. Each page becomes a picture, so the text can no longer be selected or searched.',
    },
  ],
} satisfies Help;
