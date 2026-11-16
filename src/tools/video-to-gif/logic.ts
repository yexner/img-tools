/** Most frames a GIF made here may have. More would make a huge file and take very long. */
export const MAX_FRAMES = 150;

export interface Plan {
  frames: number;
  /** Seconds into the video for each frame. */
  times: number[];
  /** Display time of each frame in milliseconds (multiples of 10, adding up to the clip length). */
  delays: number[];
}

/** How many frames a clip gives at a frame rate. At least one. */
export const countFrames = (start: number, end: number, fps: number) =>
  Math.max(0, Math.floor((end - start) * fps + 1e-9)) || (end > start ? 1 : 0);

/**
 * When to take each frame, and how long to show it. A GIF counts in hundredths of a second, so at 8 frames
 * a second the delays alternate between 120 and 130 ms instead of all being rounded the same way, and the
 * animation lasts exactly as long as the clip.
 */
export function plan(start: number, end: number, fps: number): Plan {
  const frames = countFrames(start, end, fps);
  const times = Array.from({ length: frames }, (_, i) => start + i / fps);
  const edge = (i: number) => Math.round((i * 1000) / fps / 10) * 10;
  const delays = Array.from({ length: frames }, (_, i) => Math.max(20, edge(i + 1) - edge(i)));
  return { frames, times, delays };
}

/** Output size: never larger than the video, and the other side follows its shape. */
export function outputSize(videoWidth: number, videoHeight: number, wanted: number | 'original') {
  const width = wanted === 'original' ? videoWidth : Math.min(videoWidth, wanted);
  return { width, height: Math.max(1, Math.round((width * videoHeight) / videoWidth)) };
}

/** `83.4` → `1:23.4` */
export function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}
