<script lang="ts">
  // Shows the real result for one file while a setting changes: the encoded size and a before/after split.
  // The work runs in the worker, is debounced, and an older run is canceled when a newer one starts.
  import { onDestroy } from 'svelte';
  import { formatBytes, image, percentChange } from '#lib/core';
  import type { OutputFormat } from '#lib/types';
  import Compare from '#lib/ui/Compare.svelte';
  import { objectUrl, urlBag } from '#lib/objectUrl.svelte';

  let {
    file,
    format,
    quality,
    edge,
  }: { file: File; format: OutputFormat; quality: number; edge?: number } = $props();

  const original = objectUrl(() => file);
  const urls = urlBag();
  let result = $state<{ url: string; size: number } | null>(null);
  let failed = $state('');
  let busy = $state(false);

  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    const f = file;
    const settings = { format, quality, edge };
    clearTimeout(timer);
    controller?.abort();
    busy = true;
    timer = setTimeout(async () => {
      const mine = (controller = new AbortController());
      try {
        const p = image(f, mine.signal);
        if (settings.edge) p.limit(settings.edge);
        const r = await p.encode(settings.format, { quality: settings.quality });
        if (mine.signal.aborted) return;
        if (result) urls.revoke(result.url);
        result = { url: urls.add(r.blob), size: r.blob.size };
        failed = '';
      } catch (err) {
        if (!mine.signal.aborted) failed = (err as Error).message;
      } finally {
        if (controller === mine) busy = false;
      }
    }, 150);
  });

  onDestroy(() => {
    clearTimeout(timer);
    controller?.abort();
  });
</script>

{#if failed}
  <p class="err" role="alert">{failed}</p>
{:else if result}
  <p class="mono" aria-live="polite">
    {formatBytes(file.size)} → {formatBytes(result.size)}
    <span class="pill">{percentChange(file.size, result.size)}</span>
    {#if busy}<span class="tiny muted">Updating…</span>{/if}
  </p>
  <Compare
    before={original.current}
    after={result.url}
    beforeLabel="Original"
    afterLabel="Compressed"
  />
{:else}
  <p class="muted">Preparing the preview…</p>
{/if}

<style>
  p {
    margin: 0 0 8px;
  }
  .pill {
    padding: 1px 8px;
    border-radius: 99px;
    background: var(--safe-soft);
    color: var(--safe);
  }
  .err {
    color: var(--danger);
  }
</style>
