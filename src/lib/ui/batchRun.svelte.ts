// The run loop of BatchTool: up to four files at once, per-file status, analytics and the summary line.
import { onDestroy } from 'svelte';
import { track, type RawProps } from '#lib/analytics';
import type { RunContext, RunResult } from '#lib/types';
import { normalize, reason, summarize, toResults, type FileResult, type Item } from './batch';

export function createRunner(opts: {
  slug: string;
  items: () => Item[];
  run: () => (file: File, ctx: RunContext) => Promise<RunResult> | RunResult;
  suffix: () => string;
  trackProps: () => RawProps;
  ctx: Pick<RunContext, 'ask' | 'confirm'>;
  urls: { add(blob: Blob): string; revoke(url: string): void };
}) {
  let running = $state(false);
  let ranOnce = $state(false);
  let announce = $state('');
  let summary = $state('');
  let controller: AbortController | undefined;

  function finalize() {
    const taken = new Set<string>();
    for (const it of opts.items()) {
      for (const r of it.results) if (r.type === 'file') opts.urls.revoke(r.url);
      it.results = toResults(it.raw, it.file.name, opts.suffix(), taken, opts.urls.add);
    }
  }

  async function runOne(it: Item, signal: AbortSignal) {
    it.status = 'working';
    it.progress = 0;
    it.error = undefined;
    try {
      const result = await opts.run()(it.file, {
        signal,
        ...opts.ctx,
        progress: (f) => (it.progress = f),
      });
      it.raw = normalize(result);
      it.status = 'done';
      it.progress = 1;
    } catch (err) {
      const { code, message } = reason(err);
      it.status = 'error';
      it.error = code === 'cancelled' ? 'Canceled.' : message;
      it.raw = [];
      track(opts.slug, 'error', { reason: code, input: it.kind ?? undefined });
    }
  }

  async function runAll() {
    const items = opts.items();
    if (running || !items.length) return;
    const todo = items.filter((i) => i.status !== 'working');
    const ctl = (controller = new AbortController());
    running = true;
    ranOnce = true;
    summary = '';
    const started = performance.now();
    const first = todo[0]?.kind ?? undefined;
    const props = opts.trackProps();
    track(opts.slug, 'run', { ...props, files: todo.length, input: first });
    for (const it of todo) {
      it.status = 'queued';
      it.results = [];
      it.raw = [];
    }
    announce = `Working on ${todo.length} ${todo.length === 1 ? 'file' : 'files'}.`;
    let next = 0;
    const lane = async () => {
      while (next < todo.length && !ctl.signal.aborted) await runOne(todo[next++], ctl.signal);
    };
    await Promise.all(Array.from({ length: Math.min(4, todo.length) }, lane));
    for (const it of todo) if (it.status === 'queued') it.status = 'error';
    finalize();
    running = false;
    const ok = items.filter((i) => i.status === 'done').length;
    const failed = items.filter((i) => i.status === 'error').length;
    if (ok)
      track(opts.slug, 'done', {
        ...props,
        files: ok,
        input: first,
        ms: performance.now() - started,
      });
    const files = items.flatMap((i) => i.results.filter((r): r is FileResult => r.type === 'file'));
    const before = items.reduce((s, i) => s + (i.status === 'done' ? i.file.size : 0), 0);
    const after = files.reduce((s, r) => s + r.blob.size, 0);
    summary = summarize(ok, before, after, files.length);
    announce = `Finished. ${ok} done${failed ? `, ${failed} failed` : ''}.`;
  }

  onDestroy(() => controller?.abort());

  return {
    get running() {
      return running;
    },
    get ranOnce() {
      return ranOnce;
    },
    get announce() {
      return announce;
    },
    get summary() {
      return summary;
    },
    runAll,
    cancel: () => controller?.abort(),
    reset() {
      ranOnce = false;
      summary = '';
    },
  };
}
