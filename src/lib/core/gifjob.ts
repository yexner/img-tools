// Runs GIF work in its own worker, one request at a time. Stopping a job stops the worker, because the
// work cannot be interrupted any other way; the next job starts a fresh one.
import { JobError } from './pool';
import type { Reply, Request, Result } from './gif.worker';

let worker: Worker | undefined;
let nextId = 1;
const waiting = new Map<
  number,
  { resolve: (r: Result) => void; reject: (e: Error) => void; progress?: (f: number) => void }
>();

function start(): Worker {
  const w = new Worker(new URL('./gif.worker.ts', import.meta.url), { type: 'module' });
  w.onmessage = (e: MessageEvent<Reply>) => {
    const m = e.data;
    const job = waiting.get(m.id);
    if (!job) return;
    if (!m.ok) {
      waiting.delete(m.id);
      job.reject(new JobError(m.reason, m.message));
    } else if ('done' in m) {
      waiting.delete(m.id);
      job.resolve(m);
    } else {
      job.progress?.(m.progress);
    }
  };
  w.onerror = () => {
    for (const job of waiting.values()) {
      job.reject(new JobError('encoder-failed', 'The GIF worker stopped unexpectedly.'));
    }
    waiting.clear();
    worker = undefined;
  };
  return w;
}

/** Start the worker ahead of time, so it works even if the network drops later. */
export function warmGifWorker() {
  worker ??= start();
}

export function runGif(
  request: Request,
  options: {
    signal?: AbortSignal;
    progress?: (fraction: number) => void;
    transfer?: Transferable[];
  } = {},
): Promise<Result> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) return reject(new JobError('cancelled', 'Canceled.'));
    const id = nextId++;
    waiting.set(id, { resolve, reject, progress: options.progress });
    options.signal?.addEventListener(
      'abort',
      () => {
        if (!waiting.delete(id)) return;
        worker?.terminate();
        worker = undefined;
        reject(new JobError('cancelled', 'Canceled.'));
      },
      { once: true },
    );
    warmGifWorker();
    worker!.postMessage({ id, request }, options.transfer ?? []);
  });
}

export type GifResult = Extract<Result, { kind: 'gif' }>;
export type FramesResult = Extract<Result, { kind: 'frames' }>;
