<script lang="ts">
  // Shell for tools that draw on one picture with a live preview.
  // The tool gives a `draw` function in the picture's own pixels; the preview runs it scaled down, and the
  // download runs the very same function at full size, so the file matches what was shown.
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { track } from '#lib/analytics';
  import { getTool } from '#lib/context';
  import { image, safeName, splitName } from '#lib/core';
  import { loadPicture } from '#lib/core/bitmap';
  import { download } from '#lib/core/intake';
  import type { OutputFormat } from '#lib/types';
  import Box from './Box.svelte';
  import Button from './Button.svelte';
  import ResultBox from './ResultBox.svelte';
  import Notice from './Notice.svelte';
  import OneFile from './OneFile.svelte';
  import SaveAs from './SaveAs.svelte';
  import Slider from './Slider.svelte';

  type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

  let {
    draw,
    size,
    suffix,
    format = $bindable('jpeg'),
    formats = ['jpeg', 'png', 'webp', 'avif'],
    settings,
    stage,
    previewWidth = 1000,
    maxSide = 8000,
  }: {
    /** Paints the result in the picture's own pixels. It may read reactive state; the preview then redraws. */
    draw: (ctx: Ctx, picture: ImageBitmap) => void;
    /** Size of the result in pixels, for a picture. */
    size: (picture: ImageBitmap) => { width: number; height: number };
    /** Added to the output name: `holiday` + `meme` → `holiday-meme.jpg`. */
    suffix: string;
    format?: OutputFormat;
    formats?: OutputFormat[];
    settings: Snippet<[ImageBitmap | undefined]>;
    /** Replaces the plain preview, for tools that let the visitor click or drag on it. */
    stage?: Snippet<
      [{ canvas: (el: HTMLCanvasElement) => void; scale: number; picture: ImageBitmap }]
    >;
    previewWidth?: number;
    maxSide?: number;
  } = $props();

  const tool = getTool();
  let file = $state<File>();
  let picture = $state<ImageBitmap>();
  let canvas = $state<HTMLCanvasElement>();
  let quality = $state(92);
  let error = $state('');
  let working = $state(false);

  $effect(() => {
    const f = file;
    error = '';
    if (!f) {
      picture = undefined;
      return;
    }
    let alive = true;
    loadPicture(f, maxSide).then(
      (p) => {
        if (!alive) return void p.close();
        picture = p;
      },
      () => alive && (error = 'This picture could not be read.'),
    );
    return () => {
      alive = false;
    };
  });
  onMount(() => () => picture?.close());

  const out = $derived(picture ? size(picture) : { width: 0, height: 0 });
  const scale = $derived(out.width ? Math.min(1, previewWidth / out.width) : 1);

  // The preview. `draw` runs inside this effect, so whatever it reads makes the preview redraw.
  $effect(() => {
    if (!canvas || !picture) return;
    canvas.width = Math.max(1, Math.round(out.width * scale));
    canvas.height = Math.max(1, Math.round(out.height * scale));
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.scale(scale, scale);
    draw(ctx, picture);
  });

  async function save() {
    if (!picture || !file) return;
    working = true;
    error = '';
    track(tool.slug, 'run', { files: 1, output: format });
    try {
      const full = new OffscreenCanvas(out.width, out.height);
      const ctx = full.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high';
      draw(ctx, picture);
      const png = await full.convertToBlob({ type: 'image/png' });
      const blob = format === 'png' ? png : (await image(png).encode(format, { quality })).blob;
      const ext = format === 'jpeg' ? 'jpg' : format;
      download(`${safeName(splitName(file.name).stem)}-${suffix}.${ext}`, blob);
      track(tool.slug, 'download', { output: format });
    } catch (err) {
      error = (err as Error).message || 'The picture could not be saved.';
      track(tool.slug, 'error', { reason: 'encoder-failed' });
    } finally {
      working = false;
    }
  }

  const setCanvas = (el: HTMLCanvasElement) => (canvas = el);
</script>

<div class="stack">
  <OneFile bind:file title="Files" />
  {#if error}<Notice kind="warn"><span role="alert">{error}</span></Notice>{/if}

  <div class="work">
    <Box title="Settings">
      {@render settings(picture)}
      <SaveAs bind:value={format} only={formats} />
      {#if format !== 'png'}<Slider label="Quality" bind:value={quality} min={1} max={100} />{/if}
    </Box>

    <Box title="Preview">
      {#if picture}
        {#if stage}
          {@render stage({ canvas: setCanvas, scale, picture })}
        {:else}
          <div class="frame" role="img" aria-label="Preview of the result">
            <canvas bind:this={canvas} aria-hidden="true"></canvas>
          </div>
        {/if}
        <p class="mono tiny muted">{out.width} × {out.height} px</p>
      {:else}
        <p class="muted">Add a picture to see a preview.</p>
      {/if}
    </Box>
  </div>

  {#if picture}
    <ResultBox
      summary="{out.width} × {out.height} px"
      mono
      downloadLabel={working ? 'Saving…' : 'Download'}
      disabled={working}
      onDownload={save}
    />
  {/if}
</div>

<style>
  .work {
    display: grid;
    gap: 16px;
    grid-template-columns: minmax(0, 1fr);
  }
  @media (min-width: 1100px) {
    .work {
      grid-template-columns: 380px minmax(0, 1fr);
      align-items: start;
    }
  }
  .frame {
    line-height: 0;
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: 0 0 0 1px var(--line);
    background: conic-gradient(
        var(--surface-sunk) 25%,
        var(--surface) 0 50%,
        var(--surface-sunk) 0 75%,
        var(--surface) 0
      )
      0 0 / 16px 16px;
  }
  canvas {
    width: 100%;
    height: auto;
  }
  p {
    margin: 8px 0 0;
  }
</style>
