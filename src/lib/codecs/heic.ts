// HEIC fallback: browsers that cannot decode HEIC themselves use the unmodified libheif build in its own
// classic worker (`static/heic-worker.js`). Nothing here is imported unless a HEIC tool asks for it.
import libheifScript from 'libheif-js/libheif-wasm/libheif.js?url';
import libheifWasm from 'libheif-js/libheif-wasm/libheif.wasm?url';
import { JobError } from '../core/pool';
import type { RawPixels } from '../core/ops';
import { asset } from '$app/paths';

interface Pending {
  resolve: (r: { width: number; height: number; buffer: ArrayBuffer }) => void;
  reject: (e: Error) => void;
}

let worker: Worker | undefined;
let ready: Promise<void> | undefined;
let nextId = 1;
const pending = new Map<number, Pending>();

const absolute = (path: string) => new URL(path, document.baseURI).href;

function spawn(): Worker {
  const w = new Worker(absolute(asset('heic-worker.js')));
  w.onmessage = (e) => {
    const task = pending.get(e.data.id);
    pending.delete(e.data.id);
    if (e.data.ok) task?.resolve(e.data);
    else task?.reject(new JobError('decode-failed', e.data.message));
  };
  w.onerror = () => {
    for (const task of pending.values()) {
      task.reject(new JobError('decode-failed', 'The HEIC decoder stopped unexpectedly.'));
    }
    pending.clear();
    worker = ready = undefined;
  };
  return w;
}

function send<T>(msg: object, transfer: Transferable[] = []): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve: resolve as Pending['resolve'], reject });
    worker!.postMessage({ ...msg, id }, transfer);
  });
}

/** Start the decoder and keep it in memory, so a later network loss does not matter. */
export function warmHeic(): Promise<void> {
  if (!ready) {
    worker = spawn();
    ready = send<void>({
      cmd: 'init',
      script: absolute(libheifScript),
      wasm: absolute(libheifWasm),
    }).catch((err) => {
      worker?.terminate();
      worker = ready = undefined;
      throw err instanceof JobError
        ? new JobError(
            'needs-download',
            'This format needs a one-time download. Reconnect and try again.',
          )
        : err;
    });
  }
  return ready;
}

export async function decodeHeic(file: Blob, signal?: AbortSignal): Promise<RawPixels> {
  await warmHeic();
  const onAbort = () => {
    // WASM cannot be interrupted, so canceling restarts the decoder.
    worker?.terminate();
    worker = ready = undefined;
    for (const task of pending.values()) task.reject(new JobError('cancelled', 'Canceled.'));
    pending.clear();
  };
  if (signal?.aborted) throw new JobError('cancelled', 'Canceled.');
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const buffer = await file.arrayBuffer();
    const r = await send<{ width: number; height: number; buffer: ArrayBuffer }>(
      { cmd: 'decode', buffer },
      [buffer],
    );
    return { data: r.buffer, width: r.width, height: r.height };
  } catch (err) {
    throw err instanceof JobError
      ? err
      : new JobError('decode-failed', 'This HEIC file could not be read.');
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}

/** True when the browser can decode HEIC itself, so the LGPL fallback is not needed up front. */
export async function nativeHeic(): Promise<boolean> {
  try {
    return (
      typeof ImageDecoder !== 'undefined' && (await ImageDecoder.isTypeSupported('image/heic'))
    );
  } catch {
    return false;
  }
}
