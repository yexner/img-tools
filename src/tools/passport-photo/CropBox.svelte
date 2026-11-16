<script lang="ts">
  import type { Bounds, Rect } from '#lib/core/rect';
  import RectEditor from '#lib/ui/RectEditor.svelte';
  import type { guides } from './logic';

  let {
    src,
    rect = $bindable(),
    bounds = $bindable(),
    aspect,
    label,
    lines,
  }: {
    src: string;
    rect: Rect | null;
    bounds: Bounds;
    aspect: number;
    label: string;
    lines: ReturnType<typeof guides>;
  } = $props();
</script>

<div class="wrap">
  {#key src}
    <RectEditor {src} bind:rect bind:bounds {aspect} {label} />
  {/key}
  {#if lines && bounds.w}
    <svg viewBox="0 0 {bounds.w} {bounds.h}" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2={bounds.w} y1={lines.crown} y2={lines.crown} class="crown" />
      <line x1="0" x2={bounds.w} y1={lines.chinMin} y2={lines.chinMin} class="chin" />
      <line x1="0" x2={bounds.w} y1={lines.chinMax} y2={lines.chinMax} class="chin" />
    </svg>
  {/if}
</div>

<style>
  .wrap {
    position: relative;
  }
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .crown,
  .chin {
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
    stroke-dasharray: 6 4;
  }
  .crown {
    stroke: #2ee6a6;
  }
  .chin {
    stroke: #ffd24a;
  }
</style>
