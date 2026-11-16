<script lang="ts">
  import { encode, decode } from 'blurhash';
  import { image } from '#lib/core';
  import Box from '#lib/ui/Box.svelte';
  import CopyField from '#lib/ui/CopyField.svelte';
  import ErrorNotice from '#lib/ui/ErrorNotice.svelte';
  import OneFile from '#lib/ui/OneFile.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import { cssGradient, onWhite } from './logic';
  import { objectUrl } from '#lib/objectUrl.svelte';

  let file = $state<File>();
  let x = $state(4);
  let y = $state(3);
  const url = objectUrl(() => file);
  let pixels = $state<{ rgba: Uint8ClampedArray; w: number; h: number }>();
  let error = $state('');

  $effect(() => {
    const f = file;
    pixels = undefined;
    error = '';
    if (!f) return;
    let alive = true;
    // BlurHash only needs a small picture; encoding cost grows with the pixel count.
    image(f)
      .limit(64)
      .rgba()
      .then(
        (r) =>
          alive &&
          (pixels = { rgba: onWhite(new Uint8ClampedArray(r.data)), w: r.width, h: r.height }),
        () => alive && (error = 'This picture could not be read.'),
      );
    return () => (alive = false);
  });

  const hash = $derived(pixels ? encode(pixels.rgba, pixels.w, pixels.h, x, y) : '');
  const css = $derived(hash ? cssGradient(hash, pixels!.w, pixels!.h) : '');

  // The placeholder drawn small, then shown large and soft; also as a tiny PNG data URI.
  let canvas = $state<HTMLCanvasElement>();
  let dataUri = $state('');
  $effect(() => {
    if (!hash || !pixels || !canvas) return;
    const w = 32;
    const h = Math.max(1, Math.round((32 * pixels.h) / pixels.w));
    const px = decode(hash, w, h);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(new ImageData(px as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0);
    dataUri = canvas.toDataURL('image/png');
  });
</script>

<div class="stack">
  <OneFile bind:file title="Files" />

  <Box title="Settings">
    <Slider label="Detail across" bind:value={x} min={1} max={9} />
    <Slider label="Detail down" bind:value={y} min={1} max={9} />
  </Box>

  <ErrorNotice {error} />

  {#if hash}
    <Box title="Result">
      <div class="compare">
        <figure>
          <img src={url.current} alt="The original" />
          <figcaption class="tiny muted">Original</figcaption>
        </figure>
        <figure role="img" aria-label="The placeholder made from the hash">
          <canvas bind:this={canvas} aria-hidden="true"></canvas>
          <figcaption class="tiny muted">Placeholder</figcaption>
        </figure>
      </div>
      <CopyField label="BlurHash" value={hash} filename="blurhash.txt" />
      <CopyField label="CSS gradient" value={css} filename="placeholder.css" multiline />
      <CopyField
        label="Tiny image (data URI)"
        value={dataUri}
        filename="placeholder-data-uri.txt"
      />
    </Box>
  {/if}
</div>

<style>
  .compare {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 16px;
  }
  figure {
    margin: 0;
    display: grid;
    gap: 4px;
    flex: 1 1 200px;
    max-width: 320px;
  }
  img,
  canvas {
    width: 100%;
    height: auto;
    border-radius: var(--radius);
    box-shadow: 0 0 0 1px var(--line);
  }
  canvas {
    image-rendering: auto;
  }
</style>
