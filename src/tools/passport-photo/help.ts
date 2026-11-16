import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one photo of a face looking straight at the camera.',
    'Choose Single photo or Print sheet. A sheet repeats the photo on a paper size of your choice.',
    'Choose the document. Its size, head height and background are shown under the choice. If yours is not listed, choose Custom and type the numbers your country asks for.',
    'Move the box so the head sits between the guide lines. The box always keeps the shape of the printed photo.',
    'Press Create photo (or Create sheet), then download it from the Result box. The print resolution is stored in the file. Print a sheet at 100 % without "fit to page".',
  ],
  faq: [
    {
      q: 'Will my photo be accepted?',
      a: 'This tool only handles size. Offices also check lighting, background, expression and print quality, and none of that is changed here.',
    },
    {
      q: 'Does it change the background?',
      a: 'No. The background stays as it is in your photo, so take it against the color the document asks for.',
    },
    {
      q: 'What are the guide lines?',
      a: 'The top line is the crown of the head. The two lower lines are where the chin should fall for the shortest and the longest head height allowed. Only documents with a stated head height have them.',
    },
    {
      q: 'Why is a document missing, or a value blank?',
      a: 'Every value comes from the issuing authority and is listed with its source. Where no official page states a value, it is left out instead of guessed.',
    },
    {
      q: 'My country is not listed. What can I do?',
      a: 'Choose Custom and enter the width, the height, the head height range and the background your authority asks for. Those numbers are yours and are not checked. You can also use the button under the document choice to ask for your country to be added.',
    },
    {
      q: 'How does the print sheet work?',
      a: 'Choose Print sheet, then the paper size (4 x 6 in, 5 x 7 in, A4 or Letter), the print resolution, the gap between copies and whether to draw cut lines. The summary shows the grid and the number of copies. The sheet is turned to landscape when that fits more copies.',
    },
    {
      q: 'Why does it warn about the gap?',
      a: 'A gap uses space. When it means one row or column less than with no gap, the warning says how many copies you lose, so you can shrink the gap.',
    },
    {
      q: 'What are the cut lines for?',
      a: 'They are thin gray lines between the photos, drawn in the gap so they never touch a face. With no gap they run along the edges of the photos.',
    },
    {
      q: 'Why only JPG and PNG?',
      a: 'Print software reads the stored resolution reliably from those two formats, but not from WebP or AVIF.',
    },
  ],
} satisfies Help;
