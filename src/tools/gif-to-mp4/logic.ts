/** H.264 needs even sizes. */
export const even = (n: number) => Math.max(2, n - (n % 2));

/** When each frame starts and how long it lasts, in seconds, from the delays in milliseconds. */
export function timeline(delaysMs: number[]) {
  let t = 0;
  return delaysMs.map((ms) => {
    const frame = { start: t, duration: ms / 1000 };
    t += ms / 1000;
    return frame;
  });
}

/** Browsers that can write H.264 video from a page. Others show a message naming these. */
export const WORKING_BROWSERS = 'Chrome, Edge and Safari';
