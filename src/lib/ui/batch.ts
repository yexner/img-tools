import { JobError, formatBytes, formats, percentChange, uniqueName } from '#lib/core';
import type { InputKind, Output, RunResult } from '#lib/types';

type Status = 'queued' | 'working' | 'done' | 'error';
export interface FileResult {
  type: 'file';
  blob: Blob;
  name: string;
  note?: string;
  url: string;
}
interface TextResult {
  type: 'text';
  text: string;
  label: string;
  filename: string;
  note?: string;
}
interface DataResult {
  type: 'data';
  data: unknown;
}
export type Result = FileResult | TextResult | DataResult;
export interface Item {
  id: number;
  file: File;
  kind: InputKind | null;
  thumb: string;
  status: Status;
  progress: number;
  error?: string;
  raw: Output[];
  results: Result[];
}

/** Files larger than this get a warning in the list. */
export const LARGE = 100_000_000;

const mimeToExt = new Map(Object.values(formats).map((f) => [f.mime, f.ext]));

/** Maps a thrown value to the analytics reason code and a message for the list. */
export function reason(err: unknown): { code: string; message: string } {
  if (err instanceof JobError) return { code: err.reason, message: err.message };
  const coded = err as { reason?: string; message?: string };
  return {
    code: coded?.reason ?? 'decode-failed',
    message: coded?.message ?? 'This file could not be processed.',
  };
}

/** A run may return a Blob, one output or several. */
export function normalize(r: RunResult): Output[] {
  if (r instanceof Blob) return [{ blob: r }];
  return Array.isArray(r) ? r : [r];
}

/**
 * Turns the raw outputs of one input file into results, naming files uniquely
 * within `taken` (shared across the whole batch). `makeUrl` creates the blob URL.
 */
export function toResults(
  raw: Output[],
  fileName: string,
  suffix: string,
  taken: Set<string>,
  makeUrl: (blob: Blob) => string,
): Result[] {
  return raw.map((o): Result => {
    if ('blob' in o) {
      const ext = mimeToExt.get(o.blob.type) ?? 'bin';
      const name = o.name
        ? uniqueName(o.name, undefined, ext, taken)
        : uniqueName(fileName, o.suffix ?? suffix, ext, taken);
      return { type: 'file', blob: o.blob, name, note: o.note, url: makeUrl(o.blob) };
    }
    if ('text' in o) {
      const filename = uniqueName(fileName, o.filename ?? 'text', 'txt', taken);
      return { type: 'text', text: o.text, label: o.label, filename, note: o.note };
    }
    return { type: 'data', data: o.data };
  });
}

/** Total size of the file results of one item. */
export function sizeOut(results: Result[]): number {
  return results.reduce((s, r) => s + (r.type === 'file' ? r.blob.size : 0), 0);
}

/** The line shown next to the result buttons. */
export function summarize(ok: number, before: number, after: number, fileCount: number): string {
  return fileCount && before
    ? `${formatBytes(before)} → ${formatBytes(after)} (${percentChange(before, after)})`
    : `${ok} ${ok === 1 ? 'file' : 'files'} processed`;
}

/** Truncates long text for the list. */
export function shorten(text: string, max = 120): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

const DISPLAYABLE = new Set<string>(['jpeg', 'png', 'webp', 'avif', 'gif', 'bmp', 'svg']);

/** True when the browser can show a file of this kind in an <img> thumbnail. */
export function displayable(kind: InputKind | null | undefined): boolean {
  return Boolean(kind && DISPLAYABLE.has(kind));
}

/** "Compress 3 images", or just the verb when there are no files. */
export function countLabel(verb: string, noun: string, count: number): string {
  return count ? `${verb} ${count} ${noun}${count === 1 ? '' : 's'}` : verb;
}

/** Paste events aimed at a form field belong to the field, not to the file intake. */
export function isFieldTarget(target: EventTarget | null): boolean {
  const tag = (target as { tagName?: string } | null)?.tagName;
  return Boolean(tag && /^(input|textarea|select)$/i.test(tag));
}
