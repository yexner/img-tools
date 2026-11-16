<script lang="ts" generics="T extends Rect">
  // A picture with any number of boxes on it. Drag on an empty spot to draw a new box; drag a box to move
  // it and its handles to resize it. Everything has a keyboard route as well: "Add region" in the parent
  // adds a box, Tab moves between boxes, arrow keys move or resize the selected one, Delete removes it.
  import { clampRect, resizeRect, type Bounds, type Rect } from '#lib/core/rect';
  import RectBox from './RectBox.svelte';

  let {
    src,
    regions = $bindable(),
    selected = $bindable(null),
    bounds = $bindable({ w: 0, h: 0 }),
    label = 'Region',
    shape = 'rect',
    make,
    onedit,
  }: {
    src: string;
    regions: T[];
    selected: number | null;
    bounds?: Bounds;
    label?: string;
    /** The outline drawn for every box. */
    shape?: 'rect' | 'ellipse';
    /** Builds a new region from a drawn box, so the parent can add its own fields. */
    make: (rect: Rect) => T;
    /** The visitor changed the regions (not called when they are set from code). */
    onedit?: (regions: T[]) => void;
  } = $props();

  let frame: HTMLElement | undefined = $state();
  let drawing: { start: Rect; x: number; y: number; index: number } | null = null;

  function loaded(e: Event) {
    const img = e.currentTarget as HTMLImageElement;
    bounds = { w: img.naturalWidth, h: img.naturalHeight };
    regions = regions.map((r) => ({ ...r, ...clampRect(r, bounds) }));
  }

  const scale = () => (frame && frame.clientWidth ? bounds.w / frame.clientWidth : 1);

  function commit(next: T[]) {
    regions = next;
    onedit?.(next);
  }

  function point(e: PointerEvent) {
    const box = frame!.getBoundingClientRect();
    return {
      x: Math.min(bounds.w - 1, Math.max(0, (e.clientX - box.left) * scale())),
      y: Math.min(bounds.h - 1, Math.max(0, (e.clientY - box.top) * scale())),
    };
  }

  function down(e: PointerEvent) {
    if (e.button > 0 || !frame || !bounds.w) return;
    const p = point(e);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const start: Rect = { x: p.x, y: p.y, w: 1, h: 1 };
    drawing = { start, x: p.x, y: p.y, index: regions.length };
    commit([...regions, make(start)]);
    selected = regions.length - 1;
  }

  function move(e: PointerEvent) {
    if (!drawing || !frame) return;
    const p = point(e);
    const dx = p.x - drawing.x;
    const dy = p.y - drawing.y;
    // Dragging up or to the left flips which corner is fixed.
    const left = dx < 0;
    const up = dy < 0;
    const handle = `${up ? 'n' : 's'}${left ? 'w' : 'e'}` as 'nw' | 'ne' | 'sw' | 'se';
    const base: Rect = {
      x: left ? drawing.start.x - 1 : drawing.start.x,
      y: up ? drawing.start.y - 1 : drawing.start.y,
      w: 1,
      h: 1,
    };
    const next = resizeRect(base, handle, dx, dy, bounds, null);
    const i = drawing.index;
    commit(regions.map((r, k) => (k === i ? { ...r, ...next } : r)));
  }

  function up() {
    if (!drawing) return;
    const i = drawing.index;
    drawing = null;
    const r = regions[i];
    // A click without a drag is not a region.
    if (r && r.w < 4 * scale() && r.h < 4 * scale()) {
      commit(regions.filter((_, k) => k !== i));
      selected = null;
    }
  }

  function change(i: number, rect: Rect) {
    commit(regions.map((r, k) => (k === i ? { ...r, ...rect } : r)));
  }

  function remove(i: number) {
    commit(regions.filter((_, k) => k !== i));
    selected = regions.length ? Math.min(i, regions.length - 1) : null;
  }
</script>

<div class="editor" bind:this={frame}>
  <img {src} alt="" onload={loaded} draggable="false" />
  {#if bounds.w}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="canvas"
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={up}
    ></div>
    {#each regions as r, i (i)}
      <RectBox
        rect={r}
        {bounds}
        {scale}
        {shape}
        label="{label} {i + 1}"
        active={selected === i}
        onchange={(rect) => change(i, rect)}
        onselect={() => (selected = i)}
        onremove={() => remove(i)}
      />
    {/each}
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
    cursor: crosshair;
  }
  img {
    display: block;
    width: 100%;
    height: auto;
  }
  .canvas {
    position: absolute;
    inset: 0;
  }
</style>
