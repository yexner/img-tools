import icon from '@tabler/icons/outline/mood-happy.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Meme maker',
  description: 'Put top and bottom text on a picture, in the classic bold style with an outline.',
  category: 'creative',
  spec: '10.1',
  icon,
  accepts: ['image'],
  batch: false,
  hint: 'Text on top and bottom',
  keywords: ['funny', 'caption', 'impact', 'top text', 'bottom text', 'joke', 'image macro'],
} satisfies ToolMeta;
