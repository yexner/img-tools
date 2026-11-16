<script lang="ts">
  import { image } from '#lib/core';
  import type { OutputFormat } from '#lib/types';
  import BatchTool from '#lib/ui/BatchTool.svelte';
  import ColorInput from '#lib/ui/ColorInput.svelte';
  import NumberField from '#lib/ui/NumberField.svelte';
  import SaveAs from '#lib/ui/SaveAs.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import Toggle from '#lib/ui/Toggle.svelte';
  import BorderPreview from './BorderPreview.svelte';
  import { colorOf, sidesOf, total, type Fill } from './logic';

  let preset = $state<number | 'custom'>(20);
  let custom = $state<number | undefined>(30);
  let separate = $state(false);
  let each = $state({ top: 20, right: 20, bottom: 20, left: 20 });
  let fill = $state<Fill>('white');
  let customColor = $state('#3355cc');
  let format = $state<OutputFormat>('original');
  let quality = $state(90);

  const options = $derived({
    all: separate ? null : ((preset === 'custom' ? custom : preset) ?? 0),
    each,
    fill,
    custom: customColor,
  });
  const sides = $derived(sidesOf(options));
  const color = $derived(colorOf(options));
  const transparent = $derived(fill === 'transparent');

  // JPG cannot be transparent, so "Original" becomes PNG when the border is transparent.
  const target = $derived<OutputFormat>(transparent && format === 'original' ? 'png' : format);
  $effect(() => {
    if (transparent && format === 'jpeg') format = 'png';
  });

  async function addBorder(file: File, ctx: { signal: AbortSignal }) {
    const r = await image(file, ctx.signal)
      .pad(sides.top, sides.right, sides.bottom, sides.left, color)
      .encode(target, { quality });
    return { blob: r.blob, note: r.note };
  }
</script>

<BatchTool
  verb="Add border to"
  suffix="border"
  ready={total(sides) > 0}
  track={{ output: target, quality: target === 'png' ? undefined : quality }}
  run={addBorder}
>
  {#snippet settings()}
    {#if !separate}
      <Segmented
        label="Thickness"
        bind:value={preset}
        options={[
          { value: 10, label: '10 px' },
          { value: 20, label: '20 px' },
          { value: 50, label: '50 px' },
          { value: 100, label: '100 px' },
          { value: 'custom', label: 'Custom' },
        ]}
      />
      {#if preset === 'custom'}
        <NumberField label="Custom thickness" bind:value={custom} min={0} unit="px" />
      {/if}
    {:else}
      <div class="sides">
        <NumberField label="Top" bind:value={each.top} min={0} unit="px" />
        <NumberField label="Right" bind:value={each.right} min={0} unit="px" />
        <NumberField label="Bottom" bind:value={each.bottom} min={0} unit="px" />
        <NumberField label="Left" bind:value={each.left} min={0} unit="px" />
      </div>
    {/if}
    <Toggle label="Set each side separately" bind:checked={separate} />
    <Segmented
      label="Color"
      bind:value={fill}
      options={[
        { value: 'white', label: 'White' },
        { value: 'black', label: 'Black' },
        { value: 'transparent', label: 'Transparent' },
        { value: 'custom', label: 'Custom' },
      ]}
    />
    {#if fill === 'custom'}<ColorInput label="Border color" bind:value={customColor} />{/if}
    <SaveAs
      bind:value={format}
      only={['original', 'jpeg', 'png', 'webp', 'avif']}
      needsAlpha={transparent}
    />
    {#if transparent}
      <p class="tiny muted">
        A transparent border needs PNG, WebP or AVIF. Original files are saved as PNG.
      </p>
    {/if}
    {#if target !== 'png'}<Slider label="Quality" bind:value={quality} min={1} max={100} />{/if}
  {/snippet}
  {#snippet preview(src)}
    <BorderPreview file={src.file} {sides} {color} />
  {/snippet}
</BatchTool>

<style>
  .sides {
    display: grid;
    grid-template-columns: repeat(2, max-content);
    gap: 0 16px;
  }
  p {
    margin: 0 0 12px;
  }
</style>
