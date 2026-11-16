<script lang="ts">
  // Draws the picture with its border at preview size. The saved file uses the same sizes, scaled up.
  import { objectUrl } from '#lib/objectUrl.svelte';
  import { grown, type Sides } from './logic';

  let { file, sides, color }: { file: File; sides: Sides; color: string | null } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let img: HTMLImageElement | undefined = $state();
  let loaded = $state('');
  const url = objectUrl(() => file);

  // The picture as it was added, not the result: after a run the shell would hand us the bordered file.
  $effect(() => {
    const u = url.current;
    if (!u) return;
    const image = new Image();
    image.onload = () => {
      img = image;
      loaded = u;
    };
    image.src = u;
  });

  $effect(() => {
    if (!canvas || !img || loaded !== url.current) return;
    const { width, height } = grown(img.naturalWidth, img.naturalHeight, sides);
    const k = Math.min(1, 420 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * k));
    canvas.height = Math.max(1, Math.round(height * k));
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (color) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, sides.left * k, sides.top * k, img.naturalWidth * k, img.naturalHeight * k);
  });
</script>

<div class="stage" role="img" aria-label="Preview of {file.name} with its border">
  <canvas bind:this={canvas} aria-hidden="true"></canvas>
</div>
{#if img && loaded === url.current}
  {@const out = grown(img.naturalWidth, img.naturalHeight, sides)}
  <p class="mono readout" aria-live="polite">
    {img.naturalWidth} × {img.naturalHeight} → {out.width} × {out.height} px
  </p>
{/if}

<style>
  .stage {
    display: grid;
    place-items: center;
    padding: 12px;
    border-radius: var(--radius);
    background: conic-gradient(
        var(--surface-sunk) 25%,
        var(--surface) 0 50%,
        var(--surface-sunk) 0 75%,
        var(--surface) 0
      )
      0 0 / 16px 16px;
  }
  canvas {
    max-width: 100%;
    height: auto;
  }
  .readout {
    margin: 12px 0 0;
  }
</style>
