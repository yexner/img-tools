<script lang="ts">
  // The crop editor for one picture, with the numeric Left / Top / Width / Height fields under it.
  import {
    fitAspect,
    fromRelative,
    setField,
    toPixels,
    toRelative,
    type Bounds,
    type Field,
    type Rect,
    type RelRect,
  } from '#lib/core/rect';
  import NumberField from '#lib/ui/NumberField.svelte';
  import RectEditor from '#lib/ui/RectEditor.svelte';
  import { objectUrl } from '#lib/objectUrl.svelte';

  let {
    file,
    region,
    fallback,
    aspect,
    shape,
    snap = 0,
    onedit,
  }: {
    file: File;
    /** The region to show, as fractions of this picture; null until the visitor has set one. */
    region: RelRect | null;
    /** The box to show when there is no region yet. */
    fallback: (bounds: Bounds) => Rect;
    aspect: number | null;
    shape: 'rect' | 'ellipse';
    /** Increases each time the visitor asks for a circle. */
    snap?: number;
    /** The visitor changed the box. */
    onedit: (region: RelRect) => void;
  } = $props();

  const url = objectUrl(() => file);

  let bounds = $state<Bounds>({ w: 0, h: 0 });
  let rect = $state<Rect | null>(null);

  // Show the region for this picture once its size is known, and again when the region or ratio is
  // changed from outside (another file's edit, "apply to all", a new aspect ratio).
  $effect(() => {
    if (!bounds.w) return;
    rect = region ? fromRelative(region, bounds, aspect) : fallback(bounds);
  });

  function edited(next: Rect) {
    rect = next;
    onedit(toRelative(next, bounds));
  }

  // Choosing a ratio reshapes the box at once.
  let lastAspect: number | null | undefined;
  $effect(() => {
    const a = aspect;
    if (lastAspect !== undefined && a !== lastAspect && a && rect && bounds.w) {
      edited(fitAspect(rect, a, bounds));
    }
    lastAspect = a;
  });

  // "Circle": the largest circle inside the current box, around the same center.
  // svelte-ignore state_referenced_locally
  let lastSnap = snap;
  $effect(() => {
    if (snap !== lastSnap) {
      lastSnap = snap;
      if (rect && bounds.w) edited(fitAspect(rect, 1, bounds));
    }
  });

  const px = $derived(rect ? toPixels(rect, bounds) : null);
  const labels: Record<Field, string> = { x: 'Left', y: 'Top', w: 'Width', h: 'Height' };
  const fields: Field[] = ['x', 'y', 'w', 'h'];

  function typed(field: Field, value: number | undefined) {
    if (!rect || value === undefined || !bounds.w) return;
    edited(setField(rect, field, value, bounds, aspect));
  }
</script>

<RectEditor
  src={url.current}
  bind:rect
  bind:bounds
  {aspect}
  {shape}
  label="Crop box for {file.name}"
  onedit={edited}
/>
{#if px}
  <div class="fields" role="group" aria-label="Crop box in pixels">
    {#each fields as f (f)}
      <NumberField
        label={labels[f]}
        value={px[f]}
        min={f === 'w' || f === 'h' ? 1 : 0}
        unit="px"
        oninput={undefined}
        onchange={(v) => typed(f, v)}
      />
    {/each}
  </div>
  <p class="mono tiny muted">Picture: {bounds.w} × {bounds.h} px</p>
{/if}

<style>
  .fields {
    display: flex;
    flex-wrap: wrap;
    gap: 0 16px;
    margin-top: 12px;
  }
  p {
    margin: 0;
  }
</style>
