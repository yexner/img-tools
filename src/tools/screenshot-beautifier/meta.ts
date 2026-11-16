import icon from '@tabler/icons/outline/app-window.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Screenshot frame',
  description:
    'Put a screenshot in a window frame on a gradient, with rounded corners and a soft shadow.',
  category: 'creative',
  spec: '10.2',
  icon,
  accepts: ['image'],
  batch: false,
  hint: 'Beautify screenshots',
  keywords: [
    'mockup',
    'browser window',
    'device frame',
    'shadow',
    'gradient',
    'presentation',
    'social',
    'beautify',
  ],
} satisfies ToolMeta;
