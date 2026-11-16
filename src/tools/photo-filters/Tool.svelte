<script lang="ts">
  import { onMount } from 'svelte';
  import { track } from '#lib/analytics';
  import { getTool } from '#lib/context';
  import { image, safeName, splitName } from '#lib/core';
  import { LOOKS, noFilter, type FilterOptions, type Look } from '#lib/core/filters';
  import { download } from '#lib/core/intake';
  import type { OutputFormat } from '#lib/types';
  import Box from '#lib/ui/Box.svelte';
  import Button from '#lib/ui/Button.svelte';
  import Compare from '#lib/ui/Compare.svelte';
  import ResultBox from '#lib/ui/ResultBox.svelte';
  import ErrorNotice from '#lib/ui/ErrorNotice.svelte';
  import OneFile from '#lib/ui/OneFile.svelte';
  import SaveAs from '#lib/ui/SaveAs.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import { objectUrl, urlBag } from '#lib/objectUrl.svelte';

  const tool = getTool();
  const labels: Record<Look, string> = {
    none: 'None',
    warm: 'Warm',
    cool: 'Cool',
    vintage: 'Vintage',
    moody: 'Moody',
    vivid: 'Vivid',
    bw: 'B&W',
  };

  let file = $state<File>();
  let opts = $state<FilterOptions>({ ...noFilter });
  let format = $state<OutputFormat>('jpeg');
  let quality = $state(92);
  const before = objectUrl(() => file);
  let after = $state('');
  let error = $state('');
  let working = $state(false);
  let busy = $state(false);

  // The preview is made from a smaller copy, in the worker; an older run is canceled by a newer one.
  const urls = urlBag();
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    const f = file;
    const o = { ...opts };
    clearTimeout(timer);
    controller?.abort();
    if (!f) return void (after = '');
    busy = true;
    timer = setTimeout(async () => {
      const mine = (controller = new AbortController());
      try {
        const r = await image(f, mine.signal).limit(1400).filters(o).encode('png');
        if (mine.signal.aborted) return;
        const old = after;
        after = urls.add(r.blob);
        urls.revoke(old);
        error = '';
      } catch (err) {
        if (!mine.signal.aborted) error = (err as Error).message;
      } finally {
        if (controller === mine) busy = false;
      }
    }, 150);
  });
  onMount(() => () => {
    clearTimeout(timer);
    controller?.abort();
  });

  async function save() {
    if (!file) return;
    working = true;
    error = '';
    track(tool.slug, 'run', { files: 1, output: format });
    try {
      const r = await image(file)
        .filters({ ...opts })
        .encode(format, { quality });
      const ext = format === 'jpeg' ? 'jpg' : format;
      download(`${safeName(splitName(file.name).stem)}-filtered.${ext}`, r.blob);
      track(tool.slug, 'download', { output: format });
    } catch (err) {
      error = (err as Error).message || 'The photo could not be saved.';
      track(tool.slug, 'error', { reason: 'encoder-failed' });
    } finally {
      working = false;
    }
  }
</script>

<div class="stack">
  <OneFile bind:file title="Files" />
  <ErrorNotice {error} />

  <div class="work">
    <Box title="Settings">
      <Segmented
        label="Look"
        bind:value={opts.look}
        options={LOOKS.map((l) => ({ value: l, label: labels[l] }))}
      />
      <Slider label="Fade" bind:value={opts.fade} min={0} max={100} />
      <Slider label="Grain" bind:value={opts.grain} min={0} max={100} />
      <Slider label="Brightness" bind:value={opts.brightness} min={-100} max={100} />
      <Slider label="Contrast" bind:value={opts.contrast} min={-100} max={100} />
      <Slider label="Saturation" bind:value={opts.saturation} min={-100} max={100} />
      <Button onclick={() => (opts = { ...noFilter })}>Reset</Button>
      <SaveAs bind:value={format} only={['jpeg', 'png', 'webp', 'avif']} />
      {#if format !== 'png'}<Slider label="Quality" bind:value={quality} min={1} max={100} />{/if}
    </Box>

    <Box title="Preview">
      {#if file && before.current && after}
        <Compare before={before.current} {after} beforeLabel="Original" afterLabel="Filtered" />
        {#if busy}<p class="tiny muted" aria-live="polite">Updating…</p>{/if}
      {:else if file}
        <p class="muted">Preparing the preview…</p>
      {:else}
        <p class="muted">Add a photo to see a preview.</p>
      {/if}
    </Box>
  </div>

  {#if file}
    <ResultBox
      summary="Filtered copy of {file.name}"
      downloadLabel={working ? 'Saving…' : 'Download'}
      disabled={working}
      onDownload={save}
    />
  {/if}
</div>

<style>
  .work {
    display: grid;
    gap: 16px;
    grid-template-columns: minmax(0, 1fr);
  }
  @media (min-width: 1100px) {
    .work {
      grid-template-columns: 380px minmax(0, 1fr);
      align-items: start;
    }
  }
  p {
    margin: 8px 0 0;
  }
</style>
