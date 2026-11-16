import icon from '@tabler/icons/outline/video.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Video to GIF',
  description:
    'Turn a short part of a video into an animated GIF. Choose the start, end, size and speed.',
  seoTitle: 'Video to GIF Converter: Free, No Upload | IMG-TOOLS',
  seoDescription:
    'Turn part of a video into an animated GIF in your browser. Set the start, end, width and frame rate. Nothing is uploaded.',
  intro:
    'Play your video, mark where the clip starts and ends, and choose the width, frame rate and number of colors. A GIF is limited here to 150 frames, which is about 19 seconds at 8 frames a second, because longer clips make very large files. The video is read by your browser, so it works with the formats your browser can play, usually MP4 and WebM.',
  category: 'animation',
  spec: '8.2',
  icon,
  accepts: ['video'],
  batch: false,
  hint: 'Video → GIF',
  keywords: ['mp4', 'webm', 'mov', 'clip', 'animation', 'record', 'convert', 'meme'],
  needs: ['gif'],
} satisfies ToolMeta;
