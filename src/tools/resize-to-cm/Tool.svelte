<script lang="ts">
  import { image, readSizeOf } from '#lib/core';
  import { fromInches, tidy, toInches, type Unit } from '#lib/core/units';
  import type { OutputFormat } from '#lib/types';
  import BatchTool from '#lib/ui/BatchTool.svelte';
  import NumberField from '#lib/ui/NumberField.svelte';
  import SaveAs from '#lib/ui/SaveAs.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import { boxFor, PRESETS, resultSize, valid, type Fit, type Options } from './logic';

  let presetId = $state<string>('4x6');
  let width = $state<number | undefined>(4);
  let height = $state<number | undefined>(6);
  let unit = $state<Unit>('in');
  let dpi = $state(300);
  let fit = $state<Fit>('within');
  let format = $state<OutputFormat>('jpeg');
  let quality = $state(92);

  const options = $derived<Options>({ width: width ?? 0, height: height ?? 0, unit, dpi, fit });

  function pick(id: string) {
    presetId = id;
    const p = PRESETS.find((x) => x.id === id); // "custom" keeps the numbers as they are
    if (!p) return;
    unit = p.unit;
    width = p.width;
    height = p.height;
  }

  // Changing the unit converts the numbers, so the physical size stays the same.
  function changeUnit(next: Unit) {
    const w = toInches(width ?? 0, unit);
    const h = toInches(height ?? 0, unit);
    unit = next;
    width = tidy(fromInches(w, next), next === 'mm' ? 1 : 2);
    height = tidy(fromInches(h, next), next === 'mm' ? 1 : 2);
  }

  async function resize(file: File, ctx: { signal: AbortSignal }) {
    const photo = await readSizeOf(file);
    const box = boxFor(photo, options);
    const fitMode = { within: 'contain', fill: 'cover', stretch: 'stretch' } as const;
    const r = await image(file, ctx.signal)
      .resize(box.width, box.height, fitMode[fit])
      .encode(format, { quality, dpi });
    return { blob: r.blob, note: r.note };
  }
</script>

<BatchTool
  verb="Resize"
  suffix="print"
  ready={valid(options)}
  track={{ output: format, quality: format === 'png' ? undefined : quality }}
  run={resize}
>
  {#snippet settings()}
    <Segmented
      label="Print size"
      bind:value={presetId}
      options={[
        ...PRESETS.map((p) => ({ value: p.id, label: p.label })),
        { value: 'custom', label: 'Custom' },
      ]}
      onchange={pick}
    />
    <div class="pair">
      <NumberField
        label="Width"
        bind:value={width}
        min={0}
        step={0.1}
        {unit}
        oninput={() => (presetId = 'custom')}
      />
      <NumberField
        label="Height"
        bind:value={height}
        min={0}
        step={0.1}
        {unit}
        oninput={() => (presetId = 'custom')}
      />
    </div>
    <Segmented
      label="Unit"
      value={unit}
      options={[
        { value: 'cm', label: 'cm' },
        { value: 'mm', label: 'mm' },
        { value: 'in', label: 'inches' },
      ]}
      onchange={changeUnit}
    />
    <Segmented
      label="Resolution"
      bind:value={dpi}
      options={[
        { value: 150, label: '150 DPI' },
        { value: 300, label: '300 DPI' },
        { value: 600, label: '600 DPI' },
      ]}
    />
    <Segmented
      label="Fit"
      bind:value={fit}
      options={[
        { value: 'within', label: 'Fit within' },
        { value: 'fill', label: 'Crop to fill' },
        { value: 'stretch', label: 'Stretch to fill' },
      ]}
    />
    <SaveAs bind:value={format} only={['jpeg', 'png']} print />
    {#if format !== 'png'}<Slider label="Quality" bind:value={quality} min={1} max={100} />{/if}
  {/snippet}
  {#snippet preview(src)}
    <div class="stage"><img src={src.url} alt="Preview of {src.file.name}" /></div>
    {#await readSizeOf(src.file) then size}
      {#if valid(options)}
        {@const out = resultSize(size, options)}
        <p class="mono readout" aria-live="polite">
          {size ? `${size.width} × ${size.height} → ` : ''}{out.width} × {out.height} px at {dpi} DPI
        </p>
      {/if}
    {/await}
  {/snippet}
</BatchTool>

<style>
  .stage {
    display: grid;
    place-items: center;
  }
  .stage img {
    max-width: 100%;
    max-height: 420px;
  }
  .readout {
    margin: 12px 0 0;
  }
</style>
