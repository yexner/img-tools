<script lang="ts">
  // Crop family: one region per picture, or one region carried to every picture.
  // Used by crop-image (with the Shape choice) and bulk-crop.
  import { SvelteMap } from 'svelte/reactivity';
  import { image, readSizeOf } from '#lib/core';
  import { centeredRect, fromRelative, toPixels, type Bounds, type RelRect } from '#lib/core/rect';
  import { formatQuality } from '#lib/formatQuality.svelte';
  import type { OutputFormat } from '#lib/types';
  import BatchTool from '#lib/ui/BatchTool.svelte';
  import Button from '#lib/ui/Button.svelte';
  import NumberField from '#lib/ui/NumberField.svelte';
  import SaveAs from '#lib/ui/SaveAs.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import CropStage from './CropStage.svelte';
  import CropThumb from './CropThumb.svelte';

  let {
    mode = 'each',
    shapes = false,
    formats,
    startAspect = 'free',
    verb = 'Crop',
  }: {
    /** `each`: every picture has its own box. `reference`: one box is applied to all pictures. */
    mode?: 'each' | 'reference';
    /** Offer the Shape choice: Rectangle, Circle or Oval (circle and oval keep a transparent outside). */
    shapes?: boolean;
    /** Choices for Save as. */
    formats: OutputFormat[];
    startAspect?: string;
    verb?: string;
  } = $props();

  const PRESETS: Record<string, number | null> = {
    free: null,
    '1:1': 1,
    '4:3': 4 / 3,
    '3:2': 3 / 2,
    '16:9': 16 / 9,
    '9:16': 9 / 16,
  };

  let shapeId = $state<'rect' | 'circle' | 'oval'>('rect');
  const shape = $derived<'rect' | 'ellipse'>(shapes && shapeId !== 'rect' ? 'ellipse' : 'rect');
  // svelte-ignore state_referenced_locally
  let aspectId = $state(startAspect);
  let customW = $state<number | undefined>(5);
  let customH = $state<number | undefined>(4);
  // svelte-ignore state_referenced_locally
  let chosen = $state<OutputFormat>(formats[0]);
  const q = formatQuality(90);
  let outSize = $state<number | 'none'>('none');
  let files = $state<File[]>([]);
  let pick = $state<File>();

  const aspect = $derived<number | null>(
    shapes && shapeId === 'circle'
      ? 1
      : aspectId === 'custom'
        ? customW && customH && customW > 0 && customH > 0
          ? customW / customH
          : null
        : (PRESETS[aspectId] ?? null),
  );

  // Transparent corners need PNG or WebP, so an ellipse switches the format automatically.
  const ELLIPSE_FORMATS: OutputFormat[] = ['png', 'webp'];
  // The choice is kept, so going back to Rectangle restores it.
  const format = $derived<OutputFormat>(
    shape === 'ellipse' && !ELLIPSE_FORMATS.includes(chosen) ? 'png' : chosen,
  );
  const quality = $derived(q.qualityFor(format));
  const formatChoices = $derived(shape === 'ellipse' ? ELLIPSE_FORMATS : formats);

  // The region every picture without its own box uses (as fractions, so it fits any size).
  let template = $state<RelRect | null>(null);
  const own = new SvelteMap<File, RelRect>();

  const regionFor = (file: File) => (mode === 'reference' ? template : (own.get(file) ?? template));

  /** The box before the visitor has touched anything: centered, and a circle for the circle crop. */
  const fallback = (bounds: Bounds) => centeredRect(bounds, 0.8, aspect);

  function edited(file: File, region: RelRect) {
    if (mode === 'reference') template = region;
    else own.set(file, region);
    if (mode === 'each') lastEdited = region;
  }
  let lastEdited = $state<RelRect | null>(null);

  function applyToAll() {
    if (lastEdited) template = lastEdited;
    own.clear();
  }

  // Forget boxes of pictures that were removed.
  $effect(() => {
    for (const f of [...own.keys()]) if (!files.includes(f)) own.delete(f);
  });

  async function crop(file: File, ctx: { signal: AbortSignal }) {
    const size = await readSizeOf(file);
    if (!size) throw new Error('The size of this picture could not be read.');
    const bounds = { w: size.width, h: size.height };
    const region = regionFor(file);
    const box = toPixels(region ? fromRelative(region, bounds, aspect) : fallback(bounds), bounds);
    const pipe = image(file, ctx.signal).crop(box.x, box.y, box.w, box.h);
    if (shape === 'ellipse' && outSize !== 'none') pipe.resize(outSize, outSize, 'contain');
    if (shape === 'ellipse') pipe.ellipse();
    const r = await pipe.encode(format, { quality });
    return { blob: r.blob, note: r.note };
  }
</script>

<BatchTool
  {verb}
  suffix="cropped"
  bind:files
  bind:pick
  track={{ output: format, quality: q.tracked(format) }}
  run={crop}
>
  {#snippet settings()}
    {#if shapes}
      <Segmented
        label="Shape"
        bind:value={shapeId}
        options={[
          { value: 'rect', label: 'Rectangle' },
          { value: 'circle', label: 'Circle' },
          { value: 'oval', label: 'Oval' },
        ]}
      />
    {/if}
    {#if !(shapes && shapeId === 'circle')}
      <Segmented
        label="Ratio"
        bind:value={aspectId}
        options={[
          { value: 'free', label: 'Free' },
          { value: '1:1', label: '1:1' },
          { value: '4:3', label: '4:3' },
          { value: '3:2', label: '3:2' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: 'custom', label: 'Custom' },
        ]}
      />
    {/if}
    {#if aspectId === 'custom' && !(shapes && shapeId === 'circle')}
      <div class="pair">
        <NumberField label="Ratio width" bind:value={customW} min={0.1} step={0.1} />
        <NumberField label="Ratio height" bind:value={customH} min={0.1} step={0.1} />
      </div>
    {/if}
    {#if mode === 'each' && files.length > 1}
      <div class="row">
        <Button onclick={applyToAll} disabled={!lastEdited}>Apply this crop to all images</Button>
        <span class="tiny muted">Uses the same part of every picture, whatever its size.</span>
      </div>
    {/if}
    {#if mode === 'reference'}
      <p class="tiny muted">
        Set the box on any picture. The same part is cropped from every picture, whatever its size.
      </p>
    {/if}
    {#if shape === 'ellipse'}
      <Segmented
        label="Output size (longest side)"
        bind:value={outSize}
        options={[
          { value: 'none', label: 'As cropped' },
          { value: 256, label: '256 px' },
          { value: 512, label: '512 px' },
          { value: 1024, label: '1024 px' },
        ]}
      />
    {/if}
    {#if shape === 'ellipse'}
      <p class="tiny muted">
        The outside of the {shapeId === 'circle' ? 'circle' : 'oval'} is transparent, so the result is
        PNG or WebP.
      </p>
    {/if}
    {#if formatChoices.length > 1}<SaveAs
        bind:value={() => format, (v) => (chosen = v)}
        only={formatChoices}
      />{/if}
    {#if q.showsQuality(format)}<Slider
        label="Quality"
        bind:value={() => q.qualityFor(format), (v) => q.setQuality(format, v)}
        min={1}
        max={100}
      />{/if}
  {/snippet}
  {#snippet preview(src)}
    {#key src.file}
      <CropStage
        file={src.file}
        region={regionFor(src.file)}
        {fallback}
        {aspect}
        {shape}
        onedit={(region) => edited(src.file, region)}
      />
    {/key}
    {#if mode === 'reference' && files.length > 1}
      <h3 class="grid-title">The crop on every image</h3>
      <div class="grid">
        {#each files as f (f)}
          <CropThumb
            file={f}
            region={regionFor(f)}
            {fallback}
            {aspect}
            {shape}
            selected={f === src.file}
            onselect={() => (pick = f)}
          />
        {/each}
      </div>
    {/if}
  {/snippet}
</BatchTool>

<style>
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    margin-bottom: 16px;
  }
  p {
    margin: 0 0 12px;
  }
  .grid-title {
    margin: 20px 0 8px;
    font-size: 1rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 8px;
  }
</style>
