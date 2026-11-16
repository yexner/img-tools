<script lang="ts">
  import { image, readSizeOf } from '#lib/core';
  import type { OutputFormat } from '#lib/types';
  import BatchTool from '#lib/ui/BatchTool.svelte';
  import NumberField from '#lib/ui/NumberField.svelte';
  import SaveAs from '#lib/ui/SaveAs.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import Toggle from '#lib/ui/Toggle.svelte';
  import { stepFor, targetSize, valid, type Mode, type Options } from './logic';

  let mode = $state<Mode>('edge');
  let preset = $state<number | 'custom'>(1600);
  let custom = $state<number | undefined>(1200);
  let width = $state<number | undefined>(800);
  let height = $state<number | undefined>(600);
  let lock = $state(true);
  let driving = $state<'w' | 'h'>('w');
  let percent = $state(50);
  let format = $state<OutputFormat>('original');
  let quality = $state(90);

  const options = $derived<Options>({
    mode,
    edge: (preset === 'custom' ? custom : preset) ?? 0,
    width,
    height,
    lock,
    driving,
    percent,
  });

  async function resize(file: File, ctx: { signal: AbortSignal }) {
    const pipe = image(file, ctx.signal);
    const step = stepFor(options)!;
    if ('limit' in step) pipe.limit(step.limit);
    else if ('scale' in step) pipe.scale(step.scale);
    else pipe.size(step.w, step.h);
    const r = await pipe.encode(format, { quality });
    return { blob: r.blob, note: r.note };
  }
</script>

<BatchTool
  verb="Resize"
  suffix="resized"
  ready={valid(options)}
  track={{ output: format, quality: format === 'png' ? undefined : quality }}
  run={resize}
>
  {#snippet settings()}
    <Segmented
      label="Resize by"
      bind:value={mode}
      options={[
        { value: 'edge', label: 'Longest edge' },
        { value: 'exact', label: 'Exact size' },
        { value: 'percent', label: 'Percent' },
      ]}
    />
    {#if mode === 'edge'}
      <Segmented
        label="Size limit"
        bind:value={preset}
        options={[
          { value: 1080, label: '1080 px' },
          { value: 1600, label: '1600 px' },
          { value: 2048, label: '2048 px' },
          { value: 'custom', label: 'Custom' },
        ]}
      />
      {#if preset === 'custom'}
        <NumberField label="Custom longest edge" bind:value={custom} min={1} unit="px" />
      {/if}
      <p class="tiny muted">Only makes pictures smaller. Smaller pictures stay as they are.</p>
    {:else if mode === 'exact'}
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
          The side you typed last decides. The other side follows each picture's own shape.
        </p>
      {:else}
        <p class="tiny muted">Every picture is stretched to exactly this size.</p>
      {/if}
    {:else}
      <Slider
        label="Percent of the original size"
        bind:value={percent}
        min={1}
        max={400}
        unit="%"
      />
    {/if}
    <SaveAs bind:value={format} only={['original', 'jpeg', 'png', 'webp', 'avif']} />
    {#if format !== 'png'}<Slider label="Quality" bind:value={quality} min={1} max={100} />{/if}
  {/snippet}
  {#snippet preview(src)}
    <div class="stage"><img src={src.url} alt="Preview of {src.file.name}" /></div>
    {#await readSizeOf(src.file) then size}
      {#if size && valid(options)}
        {@const out = targetSize(size, options)}
        <p class="mono readout" aria-live="polite">
          {size.width} × {size.height} → {out.width} × {out.height} px
        </p>
      {/if}
    {/await}
  {/snippet}
</BatchTool>

<style>
  p {
    margin: 0 0 12px;
  }
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
