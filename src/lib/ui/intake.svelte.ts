// Shared file intake for BatchTool and ComposeTool: sniffs and filters files, keeps the skipped list,
// and handles picker, drop, paste and handoff. The shell decides what an accepted file becomes.
import { onMount } from 'svelte';
import { track } from '#lib/analytics';
import { kindFromName, matchesAccepts, sniff } from '#lib/core';
import { filesFromDrop, filesFromPaste } from '#lib/core/intake';
import { takeHandoff } from '#lib/handoff';
import type { InputKind } from '#lib/types';
import { isFieldTarget } from './batch';

export function createIntake<T>(opts: {
  slug: string;
  accepts: InputKind[];
  batch: boolean;
  /** Reject files whose kind could not be determined. */
  requireKind?: boolean;
  /** Turns one accepted file into the shell's own item. */
  make: (file: File, kind: InputKind | null) => T;
  /** Receives the accepted items (never empty), after the upload event. */
  onAdd: (items: T[]) => void;
}) {
  let skipped = $state<string[]>([]);

  async function addFiles(files: File[]) {
    const accepted: T[] = [];
    const rejected: string[] = [];
    for (const file of files) {
      const kind = (await sniff(file)) ?? kindFromName(file.name);
      if ((opts.requireKind && !kind) || !matchesAccepts(kind, opts.accepts)) {
        rejected.push(file.name);
        continue;
      }
      accepted.push(opts.make(file, kind));
    }
    skipped = rejected;
    if (!accepted.length) return;
    track(opts.slug, 'upload');
    opts.onAdd(accepted);
  }

  onMount(() => {
    const handed = takeHandoff();
    if (handed.length) void addFiles(handed);
  });

  return {
    get skipped() {
      return skipped;
    },
    addFiles,
    async onDrop(e: DragEvent) {
      e.preventDefault();
      if (e.dataTransfer) await addFiles(await filesFromDrop(e.dataTransfer, opts.batch));
    },
    onPaste(e: ClipboardEvent) {
      if (isFieldTarget(e.target)) return;
      const files = filesFromPaste(e);
      if (files.length) {
        e.preventDefault();
        void addFiles(files);
      }
    },
  };
}
