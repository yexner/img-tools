import icon from '@tabler/icons/outline/map-pin.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Photo GPS extractor',
  description: 'List where photos were taken, and export the locations as CSV or GPX.',
  category: 'privacy',
  spec: '6.3',
  icon,
  accepts: ['image'],
  batch: true,
  hint: 'Photo locations',
  keywords: [
    'gps',
    'location',
    'coordinates',
    'csv',
    'gpx',
    'map',
    'latitude',
    'longitude',
    'geotag',
  ],
} satisfies ToolMeta;
