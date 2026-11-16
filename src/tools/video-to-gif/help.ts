import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one video. Any video your browser can play will work.',
    'Play the video, and use "Use current position" to set where the clip starts and ends.',
    'Choose the width, frame rate and colors. The number of frames is shown, and must be 150 or fewer.',
    'Press Create GIF, watch the progress, then download the result.',
  ],
  faq: [
    {
      q: 'Why only 150 frames?',
      a: 'A GIF stores every frame as a whole picture, so long clips make very large files. At 8 frames a second, 150 frames is about 19 seconds. Lower the frame rate or shorten the clip to fit.',
    },
    {
      q: 'Which video files can I use?',
      a: 'The ones your own browser can play. MP4 and WebM usually work everywhere, and some browsers also play MOV. If the player shows nothing, the browser cannot read that file.',
    },
    {
      q: 'Is there sound?',
      a: 'No. GIF files have no sound.',
    },
    {
      q: 'How do I make the file smaller?',
      a: 'Use a smaller width, a lower frame rate, fewer colors or a shorter clip. Each of them helps a lot.',
    },
    {
      q: 'Is my video uploaded?',
      a: 'No. The video is played and read in your browser, and nothing leaves your device.',
    },
  ],
} satisfies Help;
