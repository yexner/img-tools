import type { InitMessage, Job, Reply } from './ops';

export class JobError extends Error {
  constructor(
    public reason: string,
    message: string,
  ) {
    super(message);
  }
}

type InitAck = Extract<Reply, { cmd: 'init' }>;

interface Slot {
  worker: Worker;
  busy: {
    job: Job;
    resolve: (r: Extract<Reply, { ok: true }>) => void;
    reject: (e: Error) => void;
  } | null;
  /** Codec inits sent to this worker that it has not confirmed yet. */
  inits: Map<string, (ack: InitAck) => void>;
}

/** Small worker pool. Canceling terminates and respawns the worker, because WASM can't be interrupted. */
class Pool {
  private slots: Slot[] = [];
  private queue: {
    job: Job;
    resolve: (r: Extract<Reply, { ok: true }>) => void;
    reject: (e: Error) => void;
  }[] = [];
  private nextId = 1;
  /** Every codec init so far; a respawned worker gets them again, so it can start offline. */
  private codecs: InitMessage[] = [];

  constructor(private size: number) {}

  private spawn(): Slot {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const slot: Slot = { worker, busy: null, inits: new Map() };
    for (const msg of this.codecs) this.sendInit(slot, msg);
    worker.onmessage = (e: MessageEvent<Reply>) => {
      if ('cmd' in e.data) {
        slot.inits.get(e.data.codec)?.(e.data);
        slot.inits.delete(e.data.codec);
        return;
      }
      const task = slot.busy;
      slot.busy = null;
      if (task) {
        if (e.data.ok) task.resolve(e.data);
        else task.reject(new JobError(e.data.reason, e.data.message));
      }
      this.pump();
    };
    worker.onerror = () => {
      const task = slot.busy;
      slot.busy = null;
      task?.reject(new JobError('encoder-failed', 'The image worker stopped unexpectedly.'));
      this.replace(slot);
      this.pump();
    };
    return slot;
  }

  private replace(slot: Slot) {
    slot.worker.terminate();
    slot.inits.forEach((done) => done({ cmd: 'init', codec: '', ok: true })); // the replacement gets it again
    const i = this.slots.indexOf(slot);
    if (i >= 0) this.slots[i] = this.spawn();
  }

  private pump() {
    while (this.queue.length) {
      let slot = this.slots.find((s) => !s.busy);
      if (!slot && this.slots.length < this.size) {
        slot = this.spawn();
        this.slots.push(slot);
      }
      if (!slot) return;
      const task = this.queue.shift()!;
      slot.busy = task;
      const { pixels } = task.job;
      slot.worker.postMessage(task.job, pixels ? [pixels.data] : []);
    }
  }

  /** Start the workers now, so the first file does not wait for them. */
  warm() {
    while (this.slots.length < this.size) this.slots.push(this.spawn());
  }

  private sendInit(slot: Slot, msg: InitMessage): Promise<InitAck> {
    return new Promise((resolve) => {
      slot.inits.set(msg.codec, resolve);
      slot.worker.postMessage(msg);
    });
  }

  /** Load a codec in every worker now. Resolves when all of them have it. */
  async init(msg: InitMessage): Promise<void> {
    this.warm();
    const [first, ...rest] = this.slots;
    // The first worker downloads and compiles; the others reuse its compiled module.
    const ack = await this.sendInit(first, msg);
    const failed = () =>
      new JobError(
        'needs-download',
        'This format needs a one-time download. Reconnect and try again.',
      );
    if (!ack.ok) throw failed();
    const shared: InitMessage = { ...msg, module: ack.module ?? msg.module };
    this.codecs = [...this.codecs.filter((m) => m.codec !== msg.codec), shared];
    const acks = await Promise.all(rest.map((slot) => this.sendInit(slot, shared)));
    if (acks.some((a) => !a.ok)) throw failed();
  }

  run(job: Omit<Job, 'id'>, signal?: AbortSignal): Promise<Extract<Reply, { ok: true }>> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new JobError('cancelled', 'Canceled.'));
      const task = { job: { ...job, id: this.nextId++ }, resolve, reject };
      signal?.addEventListener(
        'abort',
        () => {
          const queued = this.queue.indexOf(task);
          if (queued >= 0) this.queue.splice(queued, 1);
          const slot = this.slots.find((s) => s.busy === task);
          if (slot) {
            slot.busy = null;
            this.replace(slot);
          }
          reject(new JobError('cancelled', 'Canceled.'));
        },
        { once: true },
      );
      this.queue.push(task);
      this.pump();
    });
  }
}

let pool: Pool | undefined;

export const warmPool = () => getPool().warm();

export function getPool(): Pool {
  if (!pool) {
    const cores = navigator.hardwareConcurrency || 2;
    const coarse = matchMedia('(pointer: coarse)').matches;
    pool = new Pool(coarse ? 2 : Math.min(4, Math.max(1, cores - 1)));
  }
  return pool;
}
