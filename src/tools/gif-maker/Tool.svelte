<script lang="ts">
  import { readSizeOf } from '#lib/core';
  import { loadPicture } from '#lib/core/bitmap';
  import { runGif, type GifResult } from '#lib/core/gifjob';
  import type { ComposeSource } from '#lib/types';
  import ComposeTool from '#lib/ui/ComposeTool.svelte';
  import NumberField from '#lib/ui/NumberField.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import Toggle from '#lib/ui/Toggle.svelte';

  const MAX_WIDTH = 4000;

  let delay = $state<number | undefined>(200);
  let perFrame = $state(false);
  let own = $state<Record<number, number | undefined>>({});
  let colors = $state(256);
  let loop = $state<'forever' | 'once'>('forever');
  let width = $state<number | undefined>();

  const frameDelay = (s: ComposeSource) =>
    Math.max(20, Math.round((perFrame ? own[s.id] : undefined) ?? delay ?? 200));

  async function build(
    list: ComposeSource[],
    ctx: { signal: AbortSignal; progress(fraction: number): void },
  ): Promise<Blob> {
    const first = await readSizeOf(list[0].file);
    const w = Math.min(MAX_WIDTH, Math.max(1, Math.round(width ?? first?.width ?? 480)));
    // Each picture is read at about the size it will be used at, which keeps memory low.
    const images: ImageBitmap[] = [];
    for (const [i, s] of list.entries()) {
      images.push(await loadPicture(s.file, Math.ceil(w * 1.5)));
      ctx.progress((i + 1) / (list.length * 4));
    }
    const r = (await runGif(
      {
        kind: 'make',
        images,
        delays: list.map(frameDelay),
        width: w,
        colors,
        loop: loop === 'forever',
      },
      { signal: ctx.signal, progress: (p) => ctx.progress(0.25 + p * 0.75), transfer: images },
    )) as GifResult;
    return new Blob([r.bytes as BlobPart], { type: 'image/gif' });
  }
</script>

<ComposeTool verb="Create GIF from" noun="picture" filename={() => 'animation.gif'} {build}>
  {#snippet settings()}
    <div class="pair">
      <NumberField label="Delay for every frame" bind:value={delay} min={20} step={10} unit="ms" />
      <NumberField
        label="Output width"
        bind:value={width}
        min={1}
        max={MAX_WIDTH}
        unit="px"
        placeholder="Same as the first picture"
      />
    </div>
    <Toggle label="Set the delay of each frame separately" bind:checked={perFrame} />
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
      label="Looping"
      bind:value={loop}
      options={[
        { value: 'forever', label: 'Loop forever' },
        { value: 'once', label: 'Play once' },
      ]}
    />
  {/snippet}
  {#snippet extra(s)}
    {#if perFrame}
      <label class="own">
        <span class="tiny muted">Delay</span>
        <input
          class="mono"
          type="number"
          min="20"
          step="10"
          placeholder="Same as the first picture"
          aria-label="Delay of {s.file.name} in milliseconds"
          value={own[s.id] ?? ''}
          oninput={(e) =>
            (own[s.id] = e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value))}
        />
        <span class="tiny muted">ms</span>
      </label>
    {/if}
  {/snippet}
  {#snippet preview(list)}
    <p class="tiny muted">
      {list.length}
      {list.length === 1 ? 'frame' : 'frames'}, about
      {(list.reduce((n, s) => n + frameDelay(s), 0) / 1000).toFixed(1)} s. Press Create GIF to see the
      animation.
    </p>
  {/snippet}
</ComposeTool>

<style>
  .own {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .own input {
    width: 6rem;
    min-height: 36px;
    padding: 0 8px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
  }
</style>
