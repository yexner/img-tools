<script lang="ts">
  // Shell for tools that combine several inputs into ONE output: image-to-pdf and friends.
  // Files are listed in order, can be reordered or removed, and `build` turns them into a single file.
  import type { Snippet } from 'svelte';
  import { onDestroy } from 'svelte';
  import { getTool } from '#lib/context';
  import { track, type RawProps } from '#lib/analytics';
  import { JobError, acceptAttr, formatBytes, safeName } from '#lib/core';
  import type { ComposeSource as Source } from '#lib/types';
  import Box from './Box.svelte';
  import Button from './Button.svelte';
  import DropZone from './DropZone.svelte';
  import FilePicker from './FilePicker.svelte';
  import FilesActions from './FilesActions.svelte';
  import ComposeList from './ComposeList.svelte';
  import SkippedNotice from './SkippedNotice.svelte';
  import { countLabel, displayable } from './batch';
  import { createIntake } from './intake.svelte';
  import { saveBlob } from './download';
  import Notice from './Notice.svelte';
  import { download as downloadIcon } from './icons';
  import { urlBag } from '#lib/objectUrl.svelte';

  let {
    verb,
    noun = 'image',
    filename,
    track: trackProps = {},
    ready = true,
    build,
    settings,
    preview,
    extra,
  }: {
    /** Verb for the primary button: "Create PDF from". */
    verb: string;
    noun?: string;
    /** Name of the result file, from the sources in their current order. */
    filename: (sources: Source[]) => string;
    track?: RawProps;
    /** False while the settings are invalid; disables the primary button. */
    ready?: boolean;
    build: (
      sources: Source[],
      ctx: { signal: AbortSignal; progress(fraction: number): void },
    ) => Promise<Blob>;
    settings?: Snippet;
    /** A live view of the result, given the files in their current order. */
    preview?: Snippet<[Source[]]>;
    /** Something extra for each file in the list, such as a delay field. */
    extra?: Snippet<[Source, number]>;
  } = $props();

  const tool = getTool();
  const accept = acceptAttr(tool.accepts);

  let sources = $state<Source[]>([]);
  let running = $state(false);
  let progress = $state(0);
  let error = $state('');
  let result = $state<{ blob: Blob; name: string; url: string } | null>(null);
  let announce = $state('');
  let controller: AbortController | undefined;
  let picker = $state<FilePicker>();
  const urls = urlBag();
  let nextId = 1;

  const intake = createIntake<Source>({
    slug: tool.slug,
    accepts: tool.accepts,
    batch: true,
    requireKind: true,
    make: (file, kind) => ({
      id: nextId++,
      file,
      kind: kind!,
      thumb: displayable(kind) ? urls.add(file) : '',
    }),
    onAdd(accepted) {
      sources = [...sources, ...accepted];
      clearResult();
    },
  });

  function clearResult() {
    if (result) urls.revoke(result.url);
    result = null;
    error = '';
  }

  function remove(id: number) {
    const s = sources.find((x) => x.id === id);
    if (s) urls.revoke(s.thumb);
    sources = sources.filter((x) => x.id !== id);
    clearResult();
  }

  function move(index: number, by: -1 | 1) {
    const to = index + by;
    if (to < 0 || to >= sources.length) return;
    const next = [...sources];
    [next[index], next[to]] = [next[to], next[index]];
    sources = next;
    announce = `${next[to].file.name} moved to position ${to + 1} of ${next.length}.`;
    clearResult();
  }

  function clearAll() {
    for (const s of sources) urls.revoke(s.thumb);
    sources = [];
    clearResult();
  }

  async function run() {
    if (running || !sources.length) return;
    clearResult();
    controller = new AbortController();
    running = true;
    progress = 0;
    const started = performance.now();
    track(tool.slug, 'run', { ...trackProps, files: sources.length, input: sources[0].kind });
    try {
      const blob = await build(sources, {
        signal: controller.signal,
        progress: (f) => (progress = f),
      });
      const name = safeName(filename(sources));
      result = { blob, name, url: urls.add(blob) };
      announce = `Finished. ${name}, ${formatBytes(blob.size)}.`;
      track(tool.slug, 'done', {
        ...trackProps,
        files: sources.length,
        input: sources[0].kind,
        ms: performance.now() - started,
      });
    } catch (err) {
      const coded = err as { reason?: string; message?: string };
      const reason = err instanceof JobError ? err.reason : (coded.reason ?? 'encoder-failed');
      error = reason === 'cancelled' ? 'Canceled.' : (coded.message ?? 'Something went wrong.');
      track(tool.slug, 'error', { reason, input: sources[0]?.kind });
    } finally {
      running = false;
    }
  }

  function save() {
    if (result) saveBlob(tool.slug, result.name, result.blob);
  }

  onDestroy(() => {
    controller?.abort();
  });

  const label = $derived(countLabel(verb, noun, sources.length));
  const total = $derived(sources.reduce((n, s) => n + s.file.size, 0));
</script>

<svelte:window onpaste={intake.onPaste} />

<div class="stack">
  <Box title="Files">
    <SkippedNotice skipped={intake.skipped} />
    {#if !sources.length}
      <DropZone accepts={tool.accepts} batch onfiles={intake.addFiles} />
    {:else}
      <ComposeList {sources} {extra} onmove={move} onremove={remove} />
      <FilesActions onadd={() => picker?.open()} onclear={clearAll}>
        <span class="mono tiny muted">{sources.length} files, {formatBytes(total)}</span>
      </FilesActions>
    {/if}
    {#if sources.length}
      <FilePicker bind:this={picker} {accept} multiple onfiles={intake.addFiles} />
    {/if}
  </Box>

  <Box title="Settings">
    {@render settings?.()}
    {#if running}
      <span class="bar" aria-hidden="true"
        ><span style:width="{Math.round(progress * 100)}%"></span></span
      >
      <Button onclick={() => controller?.abort()}>Cancel</Button>
    {:else}
      <Button variant="primary" disabled={!sources.length || !ready} onclick={run}>{label}</Button>
    {/if}
  </Box>

  {#if preview && sources.length}
    <Box title="Preview">{@render preview(sources)}</Box>
  {/if}

  {#if error}<Notice kind="warn"><span role="alert">{error}</span></Notice>{/if}

  {#if result}
    <Box title="Result">
      <div class="result-row">
        <strong class="mono">{result.name} · {formatBytes(result.blob.size)}</strong>
        <Button variant="primary" icon={downloadIcon} onclick={save}>Download</Button>
      </div>
      {#if result.blob.type.startsWith('image/')}
        <img class="result-img" src={result.url} alt="The result: {result.name}" />
      {/if}
    </Box>
  {/if}
</div>

<div class="sr-only" aria-live="polite">{announce}</div>

<style>
  .bar {
    display: block;
    height: 4px;
    margin-bottom: 12px;
    border-radius: 2px;
    background: var(--surface-sunk);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--accent);
    transition: width var(--ease);
  }
  .result-img {
    display: block;
    max-width: 100%;
    max-height: 480px;
    margin-top: 12px;
    border-radius: var(--radius);
    box-shadow: 0 0 0 1px var(--line);
  }
  .result-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }
</style>
