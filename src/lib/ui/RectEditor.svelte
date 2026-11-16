<script lang="ts">
  // A picture with one adjustable box on top, and the rest of the picture dimmed. Used by the crop tools.
  import { centeredRect, clampRect, type Bounds, type Rect } from '#lib/core/rect';
  import RectBox from './RectBox.svelte';

  let {
    src,
    rect = $bindable(null),
    bounds = $bindable({ w: 0, h: 0 }),
    aspect = null,
    shape = 'rect',
    label = 'Crop box',
    onedit,
  }: {
    /** Address of the picture, already turned the way it is displayed. */
    src: string;
    rect: Rect | null;
    /** Size of the picture in pixels; filled in when the picture has loaded. */
    bounds?: Bounds;
    /** Width divided by height, or null for a free shape. */
    aspect?: number | null;
    shape?: 'rect' | 'ellipse';
    label?: string;
    /** Called when the visitor changes the box (not when it is set from code). */
    onedit?: (rect: Rect) => void;
  } = $props();

  let frame: HTMLElement | undefined = $state();

  function loaded(e: Event) {
    const img = e.currentTarget as HTMLImageElement;
    bounds = { w: img.naturalWidth, h: img.naturalHeight };
    // A box that was set for another picture is replaced; one that still fits is kept.
    rect = rect ? clampRect(rect, bounds) : centeredRect(bounds, 0.8, aspect);
  }

  const scale = () => (frame && frame.clientWidth ? bounds.w / frame.clientWidth : 1);

  function changed(next: Rect) {
    rect = next;
    onedit?.(next);
  }

  const path = $derived.by(() => {
    if (!rect) return '';
    const outer = `M0 0H${bounds.w}V${bounds.h}H0Z`;
    const { x, y, w, h } = rect;
    if (shape === 'ellipse') {
      const rx = w / 2;
      const ry = h / 2;
      return `${outer}M${x} ${y + ry}a${rx} ${ry} 0 1 0 ${w} 0a${rx} ${ry} 0 1 0 ${-w} 0Z`;
    }
    return `${outer}M${x} ${y}h${w}v${h}h${-w}Z`;
  });
</script>

<div class="editor" bind:this={frame}>
  <img {src} alt="" onload={loaded} draggable="false" />
  {#if rect && bounds.w}
    <svg viewBox="0 0 {bounds.w} {bounds.h}" preserveAspectRatio="none" aria-hidden="true">
      <path d={path} fill-rule="evenodd" class="shade" />
    </svg>
    <RectBox {rect} {bounds} {scale} {aspect} {shape} {label} thirds onchange={changed} />
  {/if}
</div>

<style>
  .editor {
    position: relative;
    display: block;
    width: 100%;
    line-height: 0;
    user-select: none;
    touch-action: none;
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--surface-sunk);
  }
  img {
    display: block;
    width: 100%;
    height: auto;
  }
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .shade {
    fill: rgb(0 0 0 / 0.55);
  }
</style>
