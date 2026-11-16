import icon from '@tabler/icons/outline/device-mobile-code.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'App icon generator',
  description:
    'Make iOS and Android app icons in every size from one picture, ready to drop into your project.',
  category: 'developer',
  spec: '9.2',
  icon,
  accepts: ['image'],
  batch: false,
  hint: 'iOS + Android icons',
  keywords: [
    'ios',
    'android',
    'xcode',
    'appiconset',
    'mipmap',
    'launcher',
    'play store',
    'app store',
    'icon',
  ],
} satisfies ToolMeta;
