// Photo requirements per document. Every entry names the official page it comes from and the day it was
// checked. Values that could not be confirmed on an official page are left out and listed below.
//
// MISSING: Schengen/EU: the European Commission's ICAO guidelines give a width of 35–40 mm and a face of
//   70–80 % of the photo, but no page found states the height or a head height in mm. Only commercial sites
//   state 35 × 45 mm and 32–36 mm, so Schengen/EU is not offered until the maintainer approves a source.
// MISSING: Australia: the background color is not in the search summary of the official page.
// MISSING: India (passport): no official page found gives a head height for the 45 × 35 mm photo. The
//   25–35 mm range appears only in the guideline for a 2 × 2 inch photo, so it is not used here.
// MISSING: India (OCI): the portal asks for "80 % coverage of face" and some missions for 70–80 %, which is
//   not a head height in mm. No range is shown.
// MISSING: China: the page gives the photo for a visa application; the passport photo was not checked.
// CHECK: Japan: the numbers come from consulate pages, not from mofa.go.jp (403 when read).

export interface PassportDocument {
  /** Used in file names, for example `uk` in `passport-photo-uk-35x45mm.jpg`. */
  id: string;
  label: string;
  /** Printed size in millimeters. */
  width: number;
  height: number;
  /** Allowed head height in millimeters, chin to crown, or null when no page states one. */
  head: { min: number; max: number } | null;
  /** Background as the authority words it, or null when no page checked states it. */
  background: string | null;
  /** Anything worth saying next to the size. */
  note?: string;
  /** Official page the numbers come from. */
  source: string;
  /** Day the source was last read, `YYYY-MM-DD`. */
  verified: string;
}

const CHECKED = '2026-10-26';

export const passportDocuments: PassportDocument[] = [
  {
    id: 'us',
    label: 'United States',
    width: 50.8,
    height: 50.8,
    head: { min: 25, max: 35 },
    background: 'White or off-white',
    note: 'The head is measured from the bottom of the chin to the top of the head.',
    source: 'https://travel.state.gov/content/travel/en/passports/how-apply/photos.html',
    verified: CHECKED,
  },
  {
    id: 'uk',
    label: 'United Kingdom',
    width: 35,
    height: 45,
    head: { min: 29, max: 34 },
    background: 'Plain, light-colored',
    note: 'Printed photos must not be cut down from a larger picture.',
    source: 'https://www.gov.uk/photos-for-passports/photo-requirements',
    verified: CHECKED,
  },
  {
    id: 'canada',
    label: 'Canada',
    width: 50,
    height: 70,
    head: { min: 31, max: 36 },
    background: 'Plain white or light-colored',
    source:
      'https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/photos.html',
    verified: CHECKED,
  },
  {
    id: 'australia',
    label: 'Australia',
    width: 35,
    height: 45,
    head: { min: 32, max: 36 },
    background: null,
    note: 'The official range is 3.5–4 cm (1.38–1.57 in) wide and 4.5–5 cm (1.77–1.97 in) high. The smallest size is used here.',
    source: 'https://www.passports.gov.au/PhotoGuidelines',
    verified: CHECKED,
  },
  {
    id: 'china',
    label: 'China (visa)',
    width: 33,
    height: 48,
    head: { min: 28, max: 33 },
    background: 'White or close to white',
    note: 'This is the visa photo. Some centers give a different head width, so ask the one you apply at.',
    source:
      'https://www.visaforchina.cn/SYD3_EN/qianzhengyewu/jichuzhishi/changjianwenti/355135188537315328.html',
    verified: CHECKED,
  },
  {
    id: 'japan',
    label: 'Japan',
    width: 35,
    height: 45,
    head: { min: 32, max: 36 },
    background: 'Plain, without shadows',
    note: 'Read from Japanese consulate pages.',
    source: 'https://www.sf.us.emb-japan.go.jp/itpr_en/e_m03_01_02.html',
    verified: CHECKED,
  },
  {
    id: 'india',
    label: 'India (passport)',
    width: 35,
    height: 45,
    head: null,
    background: 'White',
    note: 'The head must be centered with both ears visible.',
    source: 'https://portal2.passportindia.gov.in/AppOnlineProject/online/faqApplicationForm',
    verified: CHECKED,
  },
  {
    id: 'india-oci',
    label: 'India (OCI)',
    width: 51,
    height: 51,
    head: null,
    background: 'Plain light color, not white',
    note: 'Square, at least 5.1 cm × 5.1 cm (2 in × 2 in), with the face covering about 80 %. The upload is a JPG of 200–900 px a side and at most 200 KB.',
    source: 'https://ociservices.gov.in/onlineOCI/faq',
    verified: CHECKED,
  },
];

export const documentById = (id: string) => passportDocuments.find((d) => d.id === id);

const MM_PER_INCH = 25.4;

/** Millimeters as pixels at `dpi`. */
export const mmToPx = (mm: number, dpi: number) => Math.round((mm / MM_PER_INCH) * dpi);

export const photoPixels = (d: Pick<PassportDocument, 'width' | 'height'>, dpi = 300) => ({
  width: mmToPx(d.width, dpi),
  height: mmToPx(d.height, dpi),
});

export const documentFileName = (d: Pick<PassportDocument, 'id' | 'width' | 'height'>) =>
  `passport-photo-${d.id}-${d.width}x${d.height}mm`;
