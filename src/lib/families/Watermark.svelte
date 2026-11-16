<script lang="ts">
  // Watermark family: text or a logo, once in a chosen place or repeated over the whole picture.
  // The mark's size is a share of each picture's width, so it looks the same on every resolution.
  import { image } from '#lib/core';
  import type { Position } from '#lib/core/watermark';
  import type { OutputFormat } from '#lib/types';
  import BatchTool from '#lib/ui/BatchTool.svelte';
  import ColorInput from '#lib/ui/ColorInput.svelte';
  import PositionGrid from '#lib/ui/PositionGrid.svelte';
  import SaveAs from '#lib/ui/SaveAs.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import Toggle from '#lib/ui/Toggle.svelte';
  import { fonts, logoMark, textMark, type FontChoice } from './watermark-mark';
  import WatermarkPreview from './WatermarkPreview.svelte';

  let {
    layout,
    size: initialSize,
    opacity: initialOpacity,
  }: {
    layout: 'single' | 'tiled';
    /** Mark width as a percentage of the picture's width. */
    size: number;
    opacity: number;
  } = $props();

  let kind = $state<'text' | 'logo'>('text');
  let text = $state('© Your name');
  let color = $state('#ffffff');
  let shadow = $state(true);
  let font = $state<FontChoice>('display');
  let logo = $state<File>();
  // svelte-ignore state_referenced_locally
  let size = $state(initialSize);
  // svelte-ignore state_referenced_locally
  let opacity = $state(initialOpacity);
  let position = $state<Position>('br');
  let margin = $state(4);
  let angle = $state(-30);
  let gap = $state(15);
  let format = $state<OutputFormat>('original');
  let quality = $state(92);

  let mark = $state<ImageBitmap | null>(null);
  let markError = $state('');

  // Rebuild the mark whenever its text, color, font or logo changes.
  $effect(() => {
    const spec = { kind, text, color, shadow, font, logo };
    let alive = true;
    const build =
      spec.kind === 'logo'
        ? spec.logo
          ? logoMark(spec.logo)
          : Promise.resolve(null)
        : textMark(spec.text, { color: spec.color, shadow: spec.shadow, font: spec.font });
    build.then(
      (m) => {
        if (!alive) return void m?.close();
        mark = m;
        markError = '';
      },
      () => alive && ((mark = null), (markError = 'The logo could not be read as a picture.')),
    );
    return () => {
      alive = false;
    };
  });

  const how = $derived(
    layout === 'single'
      ? { single: { size, position, margin, opacity } }
      : { tiled: { size, angle, gap, opacity } },
  );

  async function stamp(file: File, ctx: { signal: AbortSignal }) {
    if (!mark) throw new Error('Add some text or a logo first.');
    const r = await image(file, ctx.signal).watermark(mark, how).encode(format, { quality });
    return { blob: r.blob, note: r.note };
  }
</script>

<BatchTool
  verb="Add watermark to"
  suffix="watermarked"
  ready={mark !== null}
  track={{ output: format, quality: format === 'png' ? undefined : quality }}
  run={stamp}
>
  {#snippet settings()}
    <Segmented
      label="Watermark"
      bind:value={kind}
      options={[
        { value: 'text', label: 'Text' },
        { value: 'logo', label: 'Logo' },
      ]}
    />
    {#if kind === 'text'}
      <div class="field">
        <label for="wm-text">Text</label>
        <input id="wm-text" type="text" bind:value={text} maxlength="80" autocomplete="off" />
      </div>
      <Segmented
        label="Font"
        bind:value={font}
        options={Object.entries(fonts).map(([value, f]) => ({
          value: value as FontChoice,
          label: f.label,
        }))}
      />
      <ColorInput label="Text color" bind:value={color} />
      <Toggle label="Shadow" bind:checked={shadow} />
    {:else}
      <div class="field">
        <label for="wm-logo">Logo image</label>
        <input
          id="wm-logo"
          type="file"
          accept="image/*"
          onchange={(e) => (logo = e.currentTarget.files?.[0])}
        />
        {#if markError}<p class="err" role="alert">{markError}</p>{/if}
        {#if !logo}<p class="tiny muted">
            Choose a picture to use as the watermark. PNG keeps transparency.
          </p>{/if}
      </div>
    {/if}
    <Slider
      label="Size (percent of the picture's width)"
      bind:value={size}
      min={1}
      max={100}
      unit="%"
    />
    {#if layout === 'single'}
      <PositionGrid label="Position" bind:value={position} />
      <Slider
        label="Margin (percent of the picture's width)"
        bind:value={margin}
        min={0}
        max={20}
        unit="%"
      />
    {:else}
      <Slider label="Angle" bind:value={angle} min={-90} max={90} unit="°" />
      <Slider
        label="Gap between marks (percent of a mark)"
        bind:value={gap}
        min={0}
        max={200}
        unit="%"
      />
    {/if}
    <Slider label="Opacity" bind:value={opacity} min={1} max={100} unit="%" />
    <SaveAs bind:value={format} only={['original', 'jpeg', 'png', 'webp', 'avif']} />
    {#if format !== 'png'}<Slider label="Quality" bind:value={quality} min={1} max={100} />{/if}
  {/snippet}
  {#snippet preview(src)}
    <WatermarkPreview file={src.file} {mark} layout={how} />
    <p class="tiny muted">
      The preview shows the first picture you added, or the one you selected.
    </p>
  {/snippet}
</BatchTool>

<style>
  .field {
    display: grid;
    gap: 4px;
    margin-bottom: 16px;
  }
  input[type='text'] {
    min-height: 44px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    width: 100%;
    max-width: 24rem;
  }
  p {
    margin: 4px 0 0;
  }
  .err {
    color: var(--danger);
  }
</style>
