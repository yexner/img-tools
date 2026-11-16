import type { Help } from '#lib/types';

export default {
  steps: [
    'Add any number of photos.',
    'Read the table: file name, latitude, longitude, altitude and capture time. Use the map link to see a place.',
    'Download the list as CSV for a spreadsheet, or as GPX for a map or GPS app.',
  ],
  faq: [
    {
      q: 'Which photos have a location?',
      a: 'Photos from phones and some cameras, if location was switched on when they were taken. Screenshots and photos shared through many apps have none. They are listed as "No GPS data".',
    },
    {
      q: 'What is in the GPX file?',
      a: 'One named waypoint for each photo that has a location, with its altitude and time when known. Photos without a location are left out.',
    },
    {
      q: 'Why do some waypoints have no time?',
      a: 'GPX times are in UTC. A photo only gives one if it stores the GPS clock or the time zone offset. Otherwise nothing is guessed, and the time is left out. The CSV still has the capture time as the camera wrote it.',
    },
    {
      q: 'Is anything sent anywhere?',
      a: 'No. The files are read in your browser. The map links only open when you click them.',
    },
  ],
} satisfies Help;
