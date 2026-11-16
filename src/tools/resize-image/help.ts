import type { Help } from '#lib/types';

export default {
  steps: [
    'Add images, or drop a whole folder.',
    'Choose how to resize: by longest edge, to an exact size, or by percent. The result size is shown for the selected image.',
    'Press Resize, then download each file or all of them as one ZIP.',
  ],
  faq: [
    {
      q: 'What does "longest edge" do?',
      a: 'The longer side of each picture is made no longer than your number, and the other side follows. Pictures that are already small enough are left as they are, so nothing is enlarged.',
    },
    {
      q: 'What does "keep proportions" do?',
      a: 'Each picture keeps its own shape. Type the width and the height follows, or type the height and the width follows. Turn it off to stretch every picture to exactly the size you type.',
    },
    {
      q: 'Is the picture stretched?',
      a: 'Only when you switch off "keep proportions".',
    },
    {
      q: 'Can I make a picture bigger?',
      a: 'Yes, with an exact size or a percent above 100. The picture gets more pixels but no more detail, so it can look soft.',
    },
    {
      q: 'Is metadata removed?',
      a: 'Yes. Camera details and location are left out, and photos stay upright.',
    },
  ],
} satisfies Help;
