import icon from '@tabler/icons/outline/brand-instagram.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Social media image resizer',
  description:
    'Make one picture fit the image sizes of Instagram, X, LinkedIn, YouTube and Facebook.',
  seoTitle: 'Social Media Image Resizer: Instagram, X, More | IMG-TOOLS',
  seoDescription:
    'Resize one picture to Instagram, X, LinkedIn, YouTube and Facebook image sizes at once. Runs in your browser, no upload.',
  intro:
    'Add one image, click the part that matters most, and tick the sizes you need, such as an Instagram portrait post at 1080 x 1350 or a YouTube thumbnail at 1920 x 1080. Each size is cropped around your point, never stretched, and downloaded with a name like instagram-portrait-1080x1350.jpg. Every size lists the platform page it comes from, so you can check it.',
  category: 'resize-crop',
  spec: '5.4',
  icon,
  accepts: ['image'],
  batch: false,
  hint: 'Sizes per platform',
  keywords: [
    'instagram',
    'x',
    'twitter',
    'linkedin',
    'youtube',
    'facebook',
    'banner',
    'thumbnail',
    'profile',
    'cover',
  ],
} satisfies ToolMeta;
