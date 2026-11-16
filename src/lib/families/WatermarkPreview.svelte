<script lang="ts">
  // The watermark on the picture being worked on, drawn by the same code that writes the saved file.
  import { loadPicture } from '#lib/core/bitmap';
  import {
    drawSingle,
    drawTiled,
    type SingleOptions,
    type TiledOptions,
  } from '#lib/core/watermark';

  let {
    file,
    mark,
    layout,
  }: {
    file: File;
    mark: ImageBitmap | null;
    layout: { single: SingleOptions } | { tiled: TiledOptions };
  } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let picture = $state<ImageBitmap | null>(null);
  let failed = $state('');

  $effect(() => {
    const f = file;
    let alive = true;
    picture = null;
    loadPicture(f, 900).then(
      (p) => (alive ? (picture = p) : p.close()),
      () => alive && (failed = 'This picture could not be shown.'),
    );
    return () => {
      alive = false;
    };
  });

  $effect(() => {
    if (!canvas || !picture) return;
    canvas.width = picture.width;
    canvas.height = picture.height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(picture, 0, 0);
    if (!mark) return;
    const target = ctx as unknown as Parameters<typeof drawSingle>[0];
    if ('single' in layout) drawSingle(target, canvas.width, canvas.height, mark, layout.single);
    else drawTiled(target, canvas.width, canvas.height, mark, layout.tiled);
  });
</script>

{#if failed}
  <p class="err" role="alert">{failed}</p>
{:else}
  <div class="stage" role="img" aria-label="Preview of {file.name} with the watermark">
    <canvas bind:this={canvas} aria-hidden="true"></canvas>
  </div>
{/if}

<style>
  .stage {
    display: grid;
    place-items: center;
  }
  canvas {
    max-width: 100%;
    max-height: 480px;
    height: auto;
    border-radius: var(--radius);
    box-shadow: 0 0 0 1px var(--line);
  }
  .err {
    color: var(--danger);
  }
</style>
