<script lang="ts">
  import { zip } from '#lib/core';
  import type { ComposeSource } from '#lib/types';
  import ComposeTool from '#lib/ui/ComposeTool.svelte';
  import NumberField from '#lib/ui/NumberField.svelte';
  import Toggle from '#lib/ui/Toggle.svelte';
  import Preview from './Preview.svelte';
  import { closeAll, drawSheet, layoutOf } from './sheet';

  let gap = $state<number | undefined>(2);
  let retina = $state(false);
  const gapPx = $derived(Math.max(0, Math.round(gap ?? 0)));

  async function build(list: ComposeSource[], ctx: { progress(f: number): void }): Promise<Blob> {
    const made = await layoutOf(list, gapPx, retina);
    ctx.progress(0.3);
    const entries = [
      { name: 'sprite.png', blob: await drawSheet(made, 1) },
      { name: 'sprite.css', blob: new Blob([made.css], { type: 'text/css' }) },
    ];
    if (retina) entries.push({ name: 'sprite@2x.png', blob: await drawSheet(made, 2) });
    closeAll(made);
    ctx.progress(1);
    return zip(entries);
  }
</script>

<ComposeTool
  verb="Create sprite sheet from"
  noun="image"
  filename={() => 'sprite-sheet.zip'}
  {build}
>
  {#snippet settings()}
    <NumberField label="Gap between images" bind:value={gap} min={0} unit="px" />
    <Toggle label="Also make a 2× version for sharp screens" bind:checked={retina} />
  {/snippet}
  {#snippet preview(list)}
    <Preview sources={list} gap={gapPx} {retina} />
  {/snippet}
</ComposeTool>
