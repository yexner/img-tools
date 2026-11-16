<script lang="ts">
  // Draws the collage at a small size with the same code the saved file uses.
  import type { ComposeSource } from '#lib/types';
  import { loadPicture } from '#lib/core/bitmap';
  import { draw, layout, type Options } from './logic';

  let { sources, options }: { sources: ComposeSource[]; options: Options } = $props();

  const PREVIEW_WIDTH = 640;
  let canvas: HTMLCanvasElement | undefined = $state();
  let cache = new Map<File, ImageBitmap>();
  let failed = $state('');
  let run = 0;

  $effect(() => {
    // Read everything this drawing depends on, so any change redraws it.
    const files = sources.map((s) => s.file);
    const o = { ...options };
    if (!canvas) return;
    const mine = ++run;
    const scale = PREVIEW_WIDTH / o.width;
    const l = layout(files.length, o);
    canvas.width = PREVIEW_WIDTH;
    canvas.height = Math.max(1, Math.round(l.height * scale));
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    void draw(ctx, files.length, o, scale, async (i) => {
      let b = cache.get(files[i]);
      if (!b) {
        b = await loadPicture(files[i], 800);
        cache.set(files[i], b);
      }
      return b;
    }).then(
      () => mine === run && (failed = ''),
      (e: Error) => mine === run && (failed = e.message),
    );
  });

  // Forget pictures that were removed.
  $effect(() => {
    const keep = new Set(sources.map((s) => s.file));
    for (const [file, bitmap] of cache) {
      if (!keep.has(file)) {
        bitmap.close();
        cache.delete(file);
      }
    }
  });
</script>

<div class="stage" role="img" aria-label="Preview of the collage">
  <canvas bind:this={canvas} aria-hidden="true"></canvas>
</div>
{#if failed}<p class="err" role="alert">{failed}</p>{/if}

<style>
  .stage {
    display: grid;
    place-items: center;
  }
  canvas {
    max-width: 100%;
    height: auto;
    border-radius: var(--radius);
    box-shadow: 0 0 0 1px var(--line);
  }
  .err {
    color: var(--danger);
  }
</style>
