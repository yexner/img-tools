<script lang="ts">
  // Regions family: draw boxes on pictures and blur, pixelate or paint over them.
  // Used by blur-face (`effect`) and redact-image (`redact`).
  import { SvelteMap } from 'svelte/reactivity';
  import { image, readSizeOf } from '#lib/core';
  import { fromRelative, toPixels } from '#lib/core/rect';
  import type { RegionShape, RegionStyle } from '#lib/core/pixels';
  import type { OutputFormat } from '#lib/types';
  import BatchTool from '#lib/ui/BatchTool.svelte';
  import Button from '#lib/ui/Button.svelte';
  import ColorInput from '#lib/ui/ColorInput.svelte';
  import SaveAs from '#lib/ui/SaveAs.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import Toggle from '#lib/ui/Toggle.svelte';
  import RegionStage from './RegionStage.svelte';
  import type { RelRegion } from './regions';

  let {
    mode,
    verb,
  }: {
    /** `effect`: blur or pixelate. `redact`: paint over with a solid color. */
    mode: 'effect' | 'redact';
    verb: string;
  } = $props();

  // svelte-ignore state_referenced_locally
  let style = $state<RegionStyle>(mode === 'redact' ? 'fill' : 'blur');
  let shape = $state<RegionShape>('rect');
  let strength = $state(60);
  let perRegion = $state(false);
  let fillChoice = $state<'black' | 'white' | 'custom'>('black');
  let custom = $state('#cc2222');
  let format = $state<OutputFormat>('original');
  let quality = $state(92);
  let files = $state<File[]>([]);
  let pick = $state<File>();
  let current = $state<File>();

  const NONE: RelRegion[] = [];
  const saved = new SvelteMap<File, RelRegion[]>();
  const color = $derived(
    fillChoice === 'black' ? '#000000' : fillChoice === 'white' ? '#ffffff' : custom,
  );

  $effect(() => {
    for (const f of [...saved.keys()]) if (!files.includes(f)) saved.delete(f);
  });

  function copyToOthers() {
    if (!current) return;
    const mine = saved.get(current) ?? [];
    for (const f of files)
      if (f !== current)
        saved.set(
          f,
          mine.map((r) => ({ ...r })),
        );
  }

  async function run(file: File, ctx: { signal: AbortSignal }) {
    const list = saved.get(file) ?? [];
    if (!list.length) {
      throw new Error(
        'This picture has no regions. Add one, or copy regions from another picture.',
      );
    }
    const size = await readSizeOf(file);
    if (!size) throw new Error('The size of this picture could not be read.');
    const bounds = { w: size.width, h: size.height };
    const regions = list.map((r) => ({
      ...toPixels(fromRelative(r, bounds), bounds),
      strength: perRegion ? r.strength : strength,
    }));
    const r = await image(file, ctx.signal)
      .regions(style, regions, color, shape)
      .encode(format, { quality });
    return { blob: r.blob, note: r.note };
  }
</script>

<BatchTool
  {verb}
  suffix={mode === 'redact' ? 'redacted' : 'blurred'}
  bind:files
  bind:pick
  track={{ output: format, quality: format === 'png' ? undefined : quality }}
  {run}
>
  {#snippet settings()}
    {#if mode === 'effect'}
      <Segmented
        label="Style"
        bind:value={style}
        options={[
          { value: 'blur', label: 'Blur' },
          { value: 'pixelate', label: 'Pixelate' },
        ]}
      />
      <Slider
        label={perRegion ? 'Strength for new regions' : 'Strength'}
        bind:value={strength}
        min={1}
        max={100}
      />
      <Toggle label="Set the strength of each region separately" bind:checked={perRegion} />
      <p class="tiny muted">
        Stronger settings hide more. For something that must never be recognized, use Redact image.
      </p>
    {:else}
      <Segmented
        label="Fill color"
        bind:value={fillChoice}
        options={[
          { value: 'black', label: 'Black' },
          { value: 'white', label: 'White' },
          { value: 'custom', label: 'Custom' },
        ]}
      />
      {#if fillChoice === 'custom'}<ColorInput label="Color" bind:value={custom} />{/if}
      <p class="tiny muted">
        Each region is painted over with a solid color, and the result is one flat picture. What was
        under it is gone from the file.
      </p>
    {/if}
    <Segmented
      label="Region shape"
      bind:value={shape}
      options={[
        { value: 'rect', label: 'Rectangle' },
        { value: 'oval', label: 'Oval' },
      ]}
    />
    {#if files.length > 1}
      <div class="row">
        <Button onclick={copyToOthers} disabled={!current || !(saved.get(current)?.length ?? 0)}
          >Copy these regions to all other pictures</Button
        >
      </div>
    {/if}
    <SaveAs bind:value={format} only={['original', 'jpeg', 'png', 'webp']} />
    {#if format !== 'png'}<Slider label="Quality" bind:value={quality} min={1} max={100} />{/if}
  {/snippet}
  {#snippet preview(src)}
    {#key src.file}
      <RegionStage
        file={src.file}
        saved={saved.get(src.file) ?? NONE}
        onactive={() => (current = src.file)}
        {style}
        {shape}
        {strength}
        {perRegion}
        {color}
        onedit={(regions) => saved.set(src.file, regions)}
      />
    {/key}
  {/snippet}
</BatchTool>

<style>
  .row {
    margin-bottom: 16px;
  }
  p {
    margin: 0 0 12px;
  }
</style>
