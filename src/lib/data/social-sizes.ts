// Image sizes per platform. Every entry names the official page it comes from and the day it was checked.
// Values that could not be confirmed on an official page are left out and listed below.
//
// MISSING: Instagram Stories (1080 × 1920): the Help Center pages found do not state a Stories size.
// MISSING: YouTube and Facebook profile pictures other than the sizes below: no official minimum is stated.

export interface SocialSize {
  /** Used in file names, for example `portrait` in `instagram-portrait-1080x1350.jpg`. */
  id: string;
  platform: string;
  label: string;
  width: number;
  height: number;
  /** Official page the number comes from. */
  source: string;
  /** Day the source was last read, `YYYY-MM-DD`. */
  verified: string;
  /** Anything worth saying next to the size. */
  note?: string;
}

const CHECKED = '2026-10-25';
const IG_PHOTO = 'https://help.instagram.com/1631821640426723';

export const socialSizes: SocialSize[] = [
  {
    id: 'square',
    platform: 'Instagram',
    label: 'Square post',
    width: 1080,
    height: 1080,
    source: IG_PHOTO,
    verified: CHECKED,
    note: 'Instagram scales photos to a width of 1080 px.',
  },
  {
    id: 'portrait',
    platform: 'Instagram',
    label: 'Portrait post (4:5)',
    width: 1080,
    height: 1350,
    source: IG_PHOTO,
    verified: CHECKED,
    note: '4:5 is the tallest ratio every version of the guidance accepts.',
  },
  {
    id: 'landscape',
    platform: 'Instagram',
    label: 'Landscape post (1.91:1)',
    width: 1080,
    height: 566,
    source: IG_PHOTO,
    verified: CHECKED,
  },
  {
    id: 'reel-cover',
    platform: 'Instagram',
    label: 'Reel cover',
    width: 420,
    height: 654,
    source: 'https://help.instagram.com/1038071743007909',
    verified: CHECKED,
  },
  {
    id: 'profile',
    platform: 'X',
    label: 'Profile picture',
    width: 400,
    height: 400,
    source: 'https://help.x.com/articles/20019886-',
    verified: CHECKED,
  },
  {
    id: 'header',
    platform: 'X',
    label: 'Header image',
    width: 1500,
    height: 500,
    source: 'https://help.x.com/articles/20019886-',
    verified: CHECKED,
  },
  {
    id: 'page-logo',
    platform: 'LinkedIn',
    label: 'Page logo',
    width: 400,
    height: 400,
    source: 'https://www.linkedin.com/help/linkedin/answer/70781',
    verified: CHECKED,
  },
  {
    id: 'page-cover',
    platform: 'LinkedIn',
    label: 'Page cover',
    width: 1512,
    height: 256,
    source: 'https://www.linkedin.com/help/linkedin/answer/70781',
    verified: CHECKED,
  },
  {
    id: 'life-main',
    platform: 'LinkedIn',
    label: 'Life tab main image',
    width: 1128,
    height: 376,
    source: 'https://www.linkedin.com/help/linkedin/answer/70781',
    verified: CHECKED,
  },
  {
    id: 'thumbnail',
    platform: 'YouTube',
    label: 'Video thumbnail (16:9)',
    width: 1920,
    height: 1080,
    source: 'https://support.google.com/youtube/answer/72431',
    verified: CHECKED,
    note: 'YouTube asks for 16:9, at least 640 px wide, up to 3840 × 2160.',
  },
  {
    id: 'shorts-thumbnail',
    platform: 'YouTube',
    label: 'Shorts thumbnail (9:16)',
    width: 1080,
    height: 1920,
    source: 'https://support.google.com/youtube/answer/72431',
    verified: CHECKED,
    note: 'YouTube asks for 9:16, at least 640 px high, up to 2160 × 3840.',
  },
  {
    id: 'banner',
    platform: 'YouTube',
    label: 'Channel banner',
    width: 2560,
    height: 1440,
    source: 'https://support.google.com/youtube/answer/10456525',
    verified: CHECKED,
    note: 'Recommended size, especially for TVs. The minimum is 2048 × 1152.',
  },
  {
    id: 'profile',
    platform: 'Facebook',
    label: 'Profile picture',
    width: 320,
    height: 320,
    source: 'https://www.facebook.com/help/125379114252045',
    verified: CHECKED,
  },
  {
    id: 'cover',
    platform: 'Facebook',
    label: 'Cover photo',
    width: 851,
    height: 315,
    source: 'https://www.facebook.com/help/125379114252045',
    verified: CHECKED,
  },
];

export const platforms = [...new Set(socialSizes.map((s) => s.platform))];

/** `instagram-portrait-1080x1350` */
export const sizeName = (s: SocialSize) =>
  `${s.platform.toLowerCase()}-${s.id}-${s.width}x${s.height}`;
