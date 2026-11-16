<script lang="ts">
  import { drawSheet, type SheetArt } from './draw';
  import type { Grid } from './sheet';

  const PREVIEW_WIDTH = 480;

  let {
    grid,
    sheetPx,
    sheetDpi,
    art,
  }: { grid: Grid; sheetPx: { w: number; h: number } | null; sheetDpi: number; art: SheetArt } =
    $props();
  let canvas = $state<HTMLCanvasElement>();

  // The sheet preview is drawn small, with the same code the saved sheet uses.
  $effect(() => {
    const c = canvas;
    void [art.picture, art.rect, art.photo.width, art.photo.height, art.gapMm, art.cutLines];
    if (!c || !sheetPx) return;
    const scale = PREVIEW_WIDTH / sheetPx.w;
    c.width = PREVIEW_WIDTH;
    c.height = Math.max(1, Math.round(sheetPx.h * scale));
    drawSheet(c.getContext('2d')!, grid, scale, sheetDpi / 25.4, art);
  });
</script>

<h3>Sheet preview</h3>
<div role="img" aria-label="Preview of the finished sheet">
  <canvas bind:this={canvas} aria-hidden="true"></canvas>
</div>

<style>
  h3 {
    margin: 16px 0 8px;
    font-size: 1rem;
  }
  canvas {
    display: block;
    width: 100%;
    max-width: 30rem;
    height: auto;
    background: #fff;
    border-radius: var(--radius);
    box-shadow: 0 0 0 1px var(--line);
  }
</style>
