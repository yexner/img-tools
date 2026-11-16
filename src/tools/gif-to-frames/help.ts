import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one animated GIF.',
    'Every frame appears with its number and how long it is shown.',
    'Click a frame to save it as a PNG, or download all frames as one ZIP.',
  ],
  faq: [
    {
      q: 'Are the frames complete pictures?',
      a: 'Yes. Many GIFs store only what changes from one frame to the next. Each frame here is put together as it looks during playback, so every picture is whole.',
    },
    {
      q: 'Is transparency kept?',
      a: 'Yes. Transparent areas stay transparent in the PNG files.',
    },
    {
      q: 'What is the display time?',
      a: 'How long the frame stays on screen, in milliseconds. Browsers show frames with a time of 0 or 10 ms for 100 ms, and so does this tool.',
    },
    {
      q: 'How are the files named?',
      a: "With the GIF's name and a padded frame number, for example `dance-frame-007.png`, so they sort correctly.",
    },
  ],
} satisfies Help;
