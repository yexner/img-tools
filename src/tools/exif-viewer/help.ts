import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one photo.',
    'Read the details grouped by camera, lens, exposure, date and time, and location.',
    'Open the "All tags" section for every other field. If the photo has a location, use the map links to see where it was taken.',
  ],
  faq: [
    {
      q: 'What is EXIF?',
      a: 'It is information that cameras and phones store inside a photo: the device, the settings, the time and often the place where it was taken.',
    },
    {
      q: 'Why look at it?',
      a: 'To check what you would share when you send a photo. Location and time can be more than you mean to give away. Use Remove EXIF data to clear them.',
    },
    {
      q: 'What do the map links do?',
      a: 'They only open when you click them, in a new tab on OpenStreetMap or Google Maps. Nothing is sent from this page when you view the details.',
    },
    {
      q: 'Why is nothing shown?',
      a: 'Many pictures carry no metadata, for example screenshots and images from websites. Some apps remove it on purpose.',
    },
    {
      q: 'Why does the capture time have no time zone?',
      a: 'Cameras write the local time without a zone, so it is shown exactly as stored.',
    },
  ],
} satisfies Help;
