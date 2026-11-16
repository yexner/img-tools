import icon from '@tabler/icons/outline/binary.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Image to Base64',
  description:
    'Turn images into data URIs, HTML img tags or CSS url() values you can paste into code.',
  category: 'convert',
  spec: '3.11',
  icon,
  accepts: ['image'],
  batch: true,
  hint: 'Image → data URI',
  keywords: ['data uri', 'embed', 'inline', 'html', 'css', 'base64'],
} satisfies ToolMeta;
