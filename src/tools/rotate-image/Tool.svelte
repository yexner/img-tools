<script lang="ts">
  import { image } from '#lib/core';
  import type { OutputFormat } from '#lib/types';
  import BatchTool from '#lib/ui/BatchTool.svelte';
  import Button from '#lib/ui/Button.svelte';
  import { flipH, flipV, rotateLeft, rotateRight } from '#lib/ui/icons';
  import SaveAs from '#lib/ui/SaveAs.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import Toggle from '#lib/ui/Toggle.svelte';

  let turns = $state(0); // quarter turns clockwise, 0 to 3
  let mirrorH = $state(false);
  let mirrorV = $state(false);
  let format = $state<OutputFormat>('original');
  let quality = $state(95);

  const angle = $derived(turns * 90);

  async function rotate(file: File, ctx: { signal: AbortSignal }) {
    const r = await image(file, ctx.signal)
      .rotate(angle as 0 | 90 | 180 | 270)
      .flip(mirrorH, mirrorV)
      .encode(format, { quality });
    return { blob: r.blob, note: r.note };
  }
</script>

<BatchTool
  verb="Rotate"
  suffix="rotated"
  track={{ output: format, quality: format === 'png' ? undefined : quality }}
  run={rotate}
>
  {#snippet settings()}
    <div class="row" role="group" aria-label="Rotate">
      <Button icon={rotateLeft} onclick={() => (turns = (turns + 3) % 4)}>Left</Button>
      <Button icon={rotateRight} onclick={() => (turns = (turns + 1) % 4)}>Right</Button>
      <output class="mono" aria-live="polite">{angle}°</output>
    </div>
    <div class="row" role="group" aria-label="Flip">
      <Toggle label="Flip horizontally" bind:checked={mirrorH} />
      <Toggle label="Flip vertically" bind:checked={mirrorV} />
    </div>
    <SaveAs bind:value={format} only={['original', 'jpeg', 'png', 'webp', 'avif']} />
    {#if format !== 'png'}<Slider label="Quality" bind:value={quality} min={1} max={100} />{/if}
  {/snippet}
  {#snippet preview(src)}
    <div class="stage">
      <!-- Flips apply after the turn, like the saved file: CSS applies the rightmost transform first. -->
      <img
        src={src.url}
        alt="Preview of {src.file.name}"
        style:transform="scale({mirrorH ? -1 : 1}, {mirrorV ? -1 : 1}) rotate({angle}deg)"
      />
    </div>
  {/snippet}
</BatchTool>

<style>
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
    margin-bottom: 12px;
  }
  output {
    min-width: 3.5rem;
  }
  .stage {
    display: grid;
    place-items: center;
    height: 440px;
  }
  .stage img {
    max-width: 420px;
    max-height: 420px;
    transition: transform var(--ease);
  }
  @media (max-width: 480px) {
    .stage img {
      max-width: 100%;
    }
  }
</style>
