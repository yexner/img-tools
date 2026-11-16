import icon from '@tabler/icons/outline/camera-search.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'EXIF viewer',
  description: 'See the camera, exposure, date and location details hidden inside a photo.',
  category: 'privacy',
  spec: '6.1',
  icon,
  accepts: ['image'],
  batch: false,
  hint: 'Read photo details',
  keywords: ['exif', 'metadata', 'gps', 'camera', 'location', 'iso', 'aperture', 'map', 'tags'],
} satisfies ToolMeta;
