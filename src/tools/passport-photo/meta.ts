import icon from '@tabler/icons/outline/id.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Passport photo maker',
  description: 'Make a passport or ID photo at 300 DPI, or a print sheet with copies.',
  seoTitle: 'Passport Photo Maker: Crop to Official Size | IMG-TOOLS',
  seoDescription:
    'Crop a photo to passport or ID size for the US, UK, Canada and more, or print a sheet of copies with cut lines. No upload.',
  intro:
    'Choose a document and the tool shows its size, for example 50.8 x 50.8 mm for a US passport or 35 x 45 mm for the UK, with head guide lines where the authority states one. Move the box over your face and download a JPG or PNG at 300 DPI, or fill a print sheet with copies and cut lines. It only crops: it does not change the background.',
  category: 'photo-id',
  spec: '11.1',
  icon,
  accepts: ['jpeg', 'png', 'webp', 'avif', 'heic'],
  batch: false,
  hint: 'Passport sizes',
  keywords: [
    'passport',
    'id',
    'visa',
    'biometric',
    'photo',
    'head',
    'crop',
    'oci',
    'application',
    'sheet',
    'print',
    'copies',
    '4x6',
    'a4',
    'letter',
    'cut',
  ],
} satisfies ToolMeta;
