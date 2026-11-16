import type { Category } from './types';

export const categories: { id: Category; name: string }[] = [
  { id: 'convert', name: 'Convert' },
  { id: 'compress', name: 'Compress' },
  { id: 'resize-crop', name: 'Resize & crop' },
  { id: 'privacy', name: 'Privacy' },
  { id: 'watermark', name: 'Watermark' },
  { id: 'animation', name: 'Animation' },
  { id: 'developer', name: 'Developer' },
  { id: 'creative', name: 'Creative' },
  { id: 'photo-id', name: 'Photo IDs & print' },
];
