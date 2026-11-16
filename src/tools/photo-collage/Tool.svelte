<script lang="ts">
  import { image } from '#lib/core';
  import { JobError } from '#lib/core';
  import type { ComposeSource, OutputFormat } from '#lib/types';
  import ColorInput from '#lib/ui/ColorInput.svelte';
  import ComposeTool from '#lib/ui/ComposeTool.svelte';
  import NumberField from '#lib/ui/NumberField.svelte';
  import SaveAs from '#lib/ui/SaveAs.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import { loadPicture } from '#lib/core/bitmap';
  import Preview from './Preview.svelte';
  import { draw, layout, MAX_SIDE, type Options } from './logic';

  let columns = $state(3);
  let gap = $state<number | undefined>(10);
  let margin = $state<number | undefined>(20);
  let background = $state('#ffffff');
  let width = $state<number | undefined>(2048);
  let format = $state<OutputFormat>('jpeg');
  let quality = $state(90);

  const options = $derived<Options>({
    columns,
    gap: Math.max(0, gap ?? 0),
    margin: Math.max(0, margin ?? 0),
    background,
    width: Math.max(64, Math.min(MAX_SIDE, Math.round(width ?? 2048))),
  });

  async function build(
    sources: ComposeSource[],
    ctx: { signal: AbortSignal; progress(fraction: number): void },
  ): Promise<Blob> {
    const l = layout(sources.length, options);
    if (l.height > MAX_SIDE) {
      throw new JobError(
        'too-large',
        `The collage would be ${l.height} px tall. Use more columns or a smaller width.`,
      );
    }
    const canvas = new OffscreenCanvas(l.width, l.height);
    const g = canvas.getContext('2d');
    if (!g) throw new JobError('out-of-memory', 'The collage is too large to draw on this device.');
    g.imageSmoothingQuality = 'high';
    await draw(
      g as unknown as Parameters<typeof draw>[0],
      sources.length,
      options,
      1,
      async (i) => {
        if (ctx.signal.aborted) throw new JobError('cancelled', 'Canceled.');
        ctx.progress(i / sources.length);
        // A photo larger than its cell is loaded smaller, which saves memory.
        return loadPicture(sources[i].file, Math.ceil(l.cell * 2));
      },
      (_i, bitmap) => bitmap.close(),
    );
    const png = await canvas.convertToBlob({ type: 'image/png' });
    // The shared pipeline writes the chosen format (WebP and AVIF work in every browser).
    return (await image(png, ctx.signal).encode(format, { quality })).blob;
  }
</script>

<ComposeTool
  verb="Create collage from"
  noun="photo"
  filename={() => `collage.${format === 'jpeg' ? 'jpg' : format}`}
  {build}
  track={{ output: format }}
>
  {#snippet settings()}
    <Segmented
      label="Columns"
      bind:value={columns}
      options={[
        { value: 1, label: '1' },
        { value: 2, label: '2' },
        { value: 3, label: '3' },
        { value: 4, label: '4' },
      ]}
    />
    <div class="pair">
      <NumberField label="Gap" bind:value={gap} min={0} unit="px" />
      <NumberField label="Margin" bind:value={margin} min={0} unit="px" />
      <NumberField label="Output width" bind:value={width} min={64} max={MAX_SIDE} unit="px" />
    </div>
    <ColorInput label="Background color" bind:value={background} />
    <SaveAs bind:value={format} only={['jpeg', 'png', 'webp', 'avif']} />
    {#if format !== 'png'}<Slider label="Quality" bind:value={quality} min={1} max={100} />{/if}
  {/snippet}
  {#snippet preview(sources)}
    <Preview {sources} {options} />
  {/snippet}
</ComposeTool>
