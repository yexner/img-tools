import icon from '@tabler/icons/outline/eye-off.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Redact image',
  description: 'Paint solid boxes over private parts of a picture, so they cannot be recovered.',
  category: 'privacy',
  spec: '6.5',
  icon,
  accepts: ['image'],
  batch: true,
  hint: 'Cover parts completely',
  keywords: ['black out', 'cover', 'censor', 'hide', 'redact', 'secret', 'text', 'name', 'number'],
} satisfies ToolMeta;
