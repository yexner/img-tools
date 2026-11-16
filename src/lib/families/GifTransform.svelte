<script lang="ts">
  // GifTransform family: take an animated GIF apart, change every frame the same way, put it back together.
  // Used by compress-gif and resize-gif. The work happens in the GIF worker.
  import { readSizeOf } from '#lib/core';
  import { runGif, type GifResult } from '#lib/core/gifjob';
  import BatchTool from '#lib/ui/BatchTool.svelte';
  import NumberField from '#lib/ui/NumberField.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import Toggle from '#lib/ui/Toggle.svelte';

  let { mode }: { mode: 'compress' | 'resize' } = $props();

  let colors = $state(256);
  let every = $state(1);
  let scale = $state(100);
  let percent = $state(50);
  let by = $state<'percent' | 'size'>('percent');
  let width = $state<number | undefined>(320);
  let height = $state<number | undefined>(240);
  let lock = $state(true);
  let driving = $state<'w' | 'h'>('w');

  const valid = $derived(
    mode === 'compress' ||
      (by === 'percent'
        ? percent >= 1
        : lock
          ? !!(driving === 'w' ? width : height)
          : !!(width && height)),
  );

  async function run(file: File, ctx: { signal: AbortSignal; progress(f: number): void }) {
    const size = await readSizeOf(file);
    if (!size) throw new Error('The size of this GIF could not be read.');
    let to: { width: number; height: number } | null = null;
    if (mode === 'compress') {
      if (scale !== 100)
        to = {
          width: Math.max(1, Math.round((size.width * scale) / 100)),
          height: Math.max(1, Math.round((size.height * scale) / 100)),
        };
    } else if (by === 'percent') {
      to = {
        width: Math.max(1, Math.round((size.width * percent) / 100)),
        height: Math.max(1, Math.round((size.height * percent) / 100)),
      };
    } else if (!lock) {
      to = { width: Math.round(width!), height: Math.round(height!) };
    } else if (driving === 'w') {
      to = {
        width: Math.round(width!),
        height: Math.max(1, Math.round((width! * size.height) / size.width)),
      };
    } else {
      to = {
        width: Math.max(1, Math.round((height! * size.width) / size.height)),
        height: Math.round(height!),
      };
    }
    const r = (await runGif(
      {
        kind: 'transform',
        bytes: await file.arrayBuffer(),
        colors: mode === 'compress' ? colors : 256,
        every: mode === 'compress' ? every : 1,
        scale: to,
        // Resizing changes nothing but the size: the colors are the ones the animation already has.
        keepColors: mode === 'resize',
      },
      { signal: ctx.signal, progress: ctx.progress },
    )) as GifResult;
    const seconds = (r.duration / 1000).toFixed(1);
    return {
      blob: new Blob([r.bytes as BlobPart], { type: 'image/gif' }),
      note: `${r.frames} ${r.frames === 1 ? 'frame' : 'frames'}, ${r.width} × ${r.height} px, ${seconds} s`,
    };
  }
</script>

<BatchTool
  verb={mode === 'compress' ? 'Compress' : 'Resize'}
  noun="GIF"
  suffix={mode === 'compress' ? 'compressed' : 'resized'}
  ready={valid}
  {run}
>
  {#snippet settings()}
    {#if mode === 'compress'}
      <Segmented
        label="Colors"
        bind:value={colors}
        options={[
          { value: 256, label: '256' },
          { value: 128, label: '128' },
          { value: 64, label: '64' },
          { value: 32, label: '32' },
        ]}
      />
      <Segmented
        label="Frames to keep"
        bind:value={every}
        options={[
          { value: 1, label: 'All' },
          { value: 2, label: 'Every 2nd' },
          { value: 3, label: 'Every 3rd' },
        ]}
      />
      <Segmented
        label="Size"
        bind:value={scale}
        options={[
          { value: 100, label: '100%' },
          { value: 75, label: '75%' },
          { value: 50, label: '50%' },
        ]}
      />
      <p class="tiny muted">
        When frames are dropped, the others stay on screen longer, so the animation lasts as long as
        before. The result loops forever.
      </p>
    {:else}
      <Segmented
        label="Resize by"
        bind:value={by}
        options={[
          { value: 'percent', label: 'Percent' },
          { value: 'size', label: 'Width × height' },
        ]}
      />
      {#if by === 'percent'}
        <Slider
          label="Percent of the original size"
          bind:value={percent}
          min={1}
          max={400}
          unit="%"
        />
      {:else}
        <div class="pair">
          <NumberField
            label="Width"
            bind:value={width}
            min={1}
            unit="px"
            oninput={() => (driving = 'w')}
          />
          <NumberField
            label="Height"
            bind:value={height}
            min={1}
            unit="px"
            oninput={() => (driving = 'h')}
          />
        </div>
        <Toggle label="Keep proportions" bind:checked={lock} />
        {#if lock}
          <p class="tiny muted">
            The side you typed last decides. The other follows the picture's own shape.
          </p>
        {/if}
      {/if}
      <p class="tiny muted">
        Only the size changes. Timing, frame count and colors stay the same, and the result loops
        forever.
      </p>
    {/if}
  {/snippet}
</BatchTool>

<style>
  p {
    margin: 0 0 12px;
  }
</style>
