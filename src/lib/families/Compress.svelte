<script lang="ts">
  // Compress family: make files smaller by quality or to a target size, keeping each file's own format
  // unless the visitor picks another one. Used by compress-image.
  import { image, resolveOriginal, sniff } from '#lib/core';
  import { formatQuality } from '#lib/formatQuality.svelte';
  import type { OutputFormat } from '#lib/types';
  import BatchTool from '#lib/ui/BatchTool.svelte';
  import Disclosure from '#lib/ui/Disclosure.svelte';
  import SaveAs from '#lib/ui/SaveAs.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import LivePreview from './LivePreview.svelte';

  type Mode = 'quality' | 'size';
  type PngMethod = 'lossless' | 'reduced';

  const formats: OutputFormat[] = ['original', 'jpeg', 'webp', 'avif', 'png'];
  /** Preset target sizes in KB for the "to a file size" mode. */
  const targets = [20, 50, 100, 200, 500, 1000];
  /** Palette sizes tried, in order, when a PNG has to fit under a target size. */
  const LADDER = [256, 128, 64, 32, 16, 8];

  const describe: Partial<Record<OutputFormat, string>> = {
    original: 'Keeps each file in its own format.',
    jpeg: 'Small files that open everywhere. Best for photos.',
    webp: 'Smaller than JPG at similar quality, and keeps transparency.',
    avif: 'The smallest files and keeps transparency, but takes longer to create.',
    png: 'No loss of quality and keeps transparency, but files stay large. Best for graphics.',
  };

  let files = $state<File[]>([]);
  let format = $state<OutputFormat>('original');
  let mode = $state<Mode>('quality');
  const q = formatQuality(75);
  const quality = $derived(q.qualityFor(format));
  let preset = $state<number | 'custom'>(100);
  let custom = $state(100);
  let pngMethod = $state<PngMethod>('lossless');
  let colors = $state(256);
  let edge = $state<number | undefined>();

  const sizeMode = $derived(mode === 'size');
  const targetKb = $derived(preset === 'custom' ? custom : preset);
  const targetOk = $derived(!sizeMode || (Number.isFinite(targetKb) && targetKb >= 1));
  // Keep the target within what the encoders can store (KB = 1000 bytes: always under the portal's limit).
  const maxBytes = $derived(Math.floor(targetKb * 1000));

  const isPng = (f: File) => f.type === 'image/png' || /\.png$/i.test(f.name);
  const hasPng = $derived(files.some(isPng));
  // PNG choices matter when PNG is the output, or when PNG files may be kept as they are.
  const pngRelevant = $derived(
    format === 'png' || (format === 'original' && (!files.length || hasPng)),
  );
  const qualityRelevant = $derived(q.showsQuality(format));

  async function compress(file: File, ctx: { signal: AbortSignal }) {
    const pipe = image(file, ctx.signal);
    if (edge) pipe.limit(edge);
    const kind = await sniff(file);
    // AVIF can be written, so "keep the format" means AVIF stays AVIF.
    const target =
      format !== 'original'
        ? { format, note: undefined as string | undefined }
        : kind === 'avif'
          ? { format: 'avif' as const, note: undefined as string | undefined }
          : resolveOriginal(kind);
    if (target.format === 'png') {
      if (sizeMode) {
        // Lossless first, then fewer and fewer colors until the file fits.
        let best = await pipe.optimizePng();
        let used: number | undefined;
        for (const n of LADDER) {
          if (best.blob.size <= maxBytes) break;
          const r = await pipe.optimizePng(n);
          if (r.blob.size < best.blob.size) {
            best = r;
            used = n;
          }
        }
        const reached = best.blob.size <= maxBytes;
        return {
          blob: best.blob,
          note: reached
            ? used
              ? `Reduced to ${used} colors to fit under ${targetKb} KB.`
              : `Fits under ${targetKb} KB without losing any color.`
            : 'Target not reached: a PNG cannot get smaller without changing the picture. Try JPG or WebP.',
        };
      }
      const r = await pipe.optimizePng(pngMethod === 'reduced' ? colors : undefined);
      return { blob: r.blob, note: target.note ?? r.note };
    }
    if (sizeMode) {
      const r = await pipe.fitTo(maxBytes, target.format as 'jpeg' | 'webp' | 'avif');
      return {
        blob: r.blob,
        note: r.reached
          ? `Quality ${r.quality} fits under ${targetKb} KB.`
          : 'Target not reached: this is the smallest result possible.',
      };
    }
    const r = await pipe.encode(target.format, { quality });
    return { blob: r.blob, note: target.note ?? r.note };
  }

  // The real-result preview needs one selected file that is encoded with the quality slider.
  const previewable = (f: File) => !isPng(f) && f.type !== 'image/gif' && !/\.gif$/i.test(f.name);
</script>

<BatchTool
  verb="Compress"
  suffix="compressed"
  ready={targetOk}
  bind:files
  track={{
    output: format,
    quality: sizeMode ? undefined : q.tracked(format),
  }}
  run={compress}
>
  {#snippet settings()}
    <Segmented
      label="Compress"
      bind:value={mode}
      options={[
        { value: 'quality', label: 'By quality' },
        { value: 'size', label: 'To a file size' },
      ]}
    />
    <SaveAs bind:value={format} only={formats} {describe} />
    {#if sizeMode}
      <Segmented
        label="Target size"
        bind:value={preset}
        options={[
          ...targets.map((t) => ({ value: t as number | 'custom', label: `${t} KB` })),
          { value: 'custom', label: 'Custom' },
        ]}
      />
      {#if preset === 'custom'}
        <div class="field">
          <label for="target-kb">Target size (KB)</label>
          <input id="target-kb" class="mono" type="number" min="1" step="1" bind:value={custom} />
        </div>
      {/if}
      {#if pngRelevant}
        <p class="tiny muted">
          A PNG is made smaller by using fewer colors until it fits. Choose JPG or WebP to reach
          small sizes with photos.
        </p>
      {/if}
    {:else}
      {#if qualityRelevant}
        <Slider
          label="Quality"
          bind:value={() => q.qualityFor(format), (v) => q.setQuality(format, v)}
          min={1}
          max={100}
        />
        <p class="tiny muted">Below about 50, blocky edges start to appear.</p>
      {/if}
      {#if pngRelevant}
        <Segmented
          label="PNG method"
          bind:value={pngMethod}
          options={[
            { value: 'lossless', label: 'Lossless' },
            { value: 'reduced', label: 'Reduced colors' },
          ]}
        />
        {#if pngMethod === 'reduced'}
          <Segmented
            label="Colors"
            bind:value={colors}
            options={[
              { value: 256, label: '256' },
              { value: 64, label: '64' },
              { value: 16, label: '16' },
            ]}
          />
          <p class="tiny muted">
            Fewer colors give smaller files. Photos can show banding at 64 or 16.
          </p>
        {:else}
          <p class="tiny muted">Every pixel stays exactly the same. The saving is smaller.</p>
        {/if}
      {/if}
    {/if}
    <p class="tiny muted">
      A GIF uses its first frame only. Use Compress GIF to keep an animation.
    </p>
    <Disclosure title="Advanced">
      <div class="field">
        <label for="max-edge">Longest edge (px)</label>
        <input
          id="max-edge"
          class="mono"
          type="number"
          min="1"
          step="1"
          placeholder="No limit"
          bind:value={edge}
        />
        <p class="tiny muted">Larger images are scaled down. Smaller ones are left alone.</p>
      </div>
    </Disclosure>
  {/snippet}
  {#snippet preview(src)}
    {#if !sizeMode && qualityRelevant && previewable(src.file)}
      <LivePreview file={src.file} {format} {quality} {edge} />
    {:else}
      <div class="stage"><img src={src.url} alt="Preview of {src.file.name}" /></div>
    {/if}
  {/snippet}
</BatchTool>

<style>
  .field {
    display: grid;
    gap: 4px;
    margin-bottom: 16px;
  }
  input[type='number'] {
    width: 10rem;
    min-height: 44px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
  }
  p {
    margin: 0 0 12px;
  }
  .stage {
    display: grid;
    place-items: center;
  }
  .stage img {
    max-width: 100%;
    max-height: 480px;
  }
</style>
