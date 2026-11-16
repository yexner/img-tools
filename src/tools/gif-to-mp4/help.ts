import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one animated GIF.',
    'Choose the quality: Low, Medium or High.',
    'Press Convert. A looping preview appears, then download the MP4.',
  ],
  faq: [
    {
      q: 'Why turn a GIF into a video?',
      a: 'An MP4 is usually many times smaller than the GIF it came from and looks better, because video can use millions of colors. Many sites and apps play such videos just like GIFs.',
    },
    {
      q: 'Does the MP4 loop?',
      a: 'The file itself does not loop. A video loops only when the page that shows it says so, for example with the `loop` attribute in HTML. The preview here loops because we ask it to. Most apps that accept a video as a GIF replacement loop it for you.',
    },
    {
      q: 'Which browsers can do this?',
      a: "Writing H.264 video needs the browser's video encoder. It works in Chrome, Edge and Safari. If your browser cannot do it, this page says so and nothing is sent anywhere. You can still use the other GIF tools.",
    },
    {
      q: 'Is transparency kept?',
      a: 'No. MP4 has no transparency, so transparent areas become white.',
    },
    {
      q: 'Is there sound?',
      a: 'No. GIF files have no sound, so the video has none either.',
    },
  ],
} satisfies Help;
