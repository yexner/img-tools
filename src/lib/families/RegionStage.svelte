<script lang="ts">
  // Edit the regions of one picture, with a live preview of the real result under it.
  import { onDestroy } from 'svelte';
  import { formatBytes, image } from '#lib/core';
  import {
    centeredRect,
    fromRelative,
    setField,
    toPixels,
    toRelative,
    type Bounds,
    type Field,
    type Rect,
  } from '#lib/core/rect';
  import type { RegionShape, RegionStyle } from '#lib/core/pixels';
  import Button from '#lib/ui/Button.svelte';
  import NumberField from '#lib/ui/NumberField.svelte';
  import RegionEditor from '#lib/ui/RegionEditor.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import type { RelRegion } from './regions';
  import { objectUrl, urlBag } from '#lib/objectUrl.svelte';

  let {
    file,
    saved,
    style,
    shape,
    strength,
    perRegion,
    color,
    onedit,
    onactive,
  }: {
    file: File;
    /** The regions saved for this picture, as fractions of its size. */
    saved: RelRegion[];
    style: RegionStyle;
    /** The form of every region: the whole box, or the oval inscribed in it. */
    shape: RegionShape;
    /** Strength used when it is not set per region. */
    strength: number;
    perRegion: boolean;
    color: string;
    onedit: (regions: RelRegion[]) => void;
    /** This picture is the one being edited. */
    onactive?: () => void;
  } = $props();

  $effect(() => {
    onactive?.();
  });

  type Region = Rect & { strength: number };

  const url = objectUrl(() => file);

  const urls = urlBag();
  let bounds = $state<Bounds>({ w: 0, h: 0 });
  let regions = $state<Region[]>([]);
  let selected = $state<number | null>(null);

  // Show the saved regions once the picture's size is known, and again when they change from outside
  // (regions copied from another picture).
  let lastSaved: RelRegion[] | undefined;
  $effect(() => {
    if (!bounds.w || saved === lastSaved) return;
    lastSaved = saved;
    regions = saved.map((r) => ({ ...fromRelative(r, bounds), strength: r.strength }));
    if (selected !== null && selected >= regions.length) selected = null;
  });

  function edited(next: Region[]) {
    regions = next;
    lastSaved = next.map((r) => ({ ...toRelative(r, bounds), strength: r.strength }));
    onedit(lastSaved);
  }

  function add() {
    const base = centeredRect(bounds, 0.25);
    const offset = regions.length * 0.03 * bounds.w;
    const rect = {
      ...base,
      x: Math.min(base.x + offset, bounds.w - base.w),
      y: Math.min(base.y + offset, bounds.h - base.h),
    };
    edited([...regions, { ...rect, strength }]);
    selected = regions.length;
  }

  function removeSelected() {
    if (selected === null) return;
    edited(regions.filter((_, i) => i !== selected));
    selected = null;
  }

  const current = $derived(selected !== null ? regions[selected] : undefined);
  const px = $derived(current ? toPixels(current, bounds) : null);
  const fields: [Field, string][] = [
    ['x', 'Left'],
    ['y', 'Top'],
    ['w', 'Width'],
    ['h', 'Height'],
  ];

  function typed(field: Field, value: number | undefined) {
    if (selected === null || !current || value === undefined) return;
    const i = selected;
    edited(
      regions.map((r, k) => (k === i ? { ...r, ...setField(r, field, value, bounds, null) } : r)),
    );
  }

  function setStrength(value: number) {
    if (selected === null) return;
    const i = selected;
    edited(regions.map((r, k) => (k === i ? { ...r, strength: value } : r)));
  }

  // The real result, drawn by the same code the saved file uses. Debounced; an older run is canceled.
  let result = $state<{ url: string; size: number } | null>(null);
  let failed = $state('');
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    const f = file;
    const list = regions.map((r) => ({
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      strength: perRegion ? r.strength : strength,
    }));
    const s = style;
    const sh = shape;
    const c = color;
    clearTimeout(timer);
    controller?.abort();
    if (!list.length) {
      if (result) urls.revoke(result.url);
      result = null;
      return;
    }
    timer = setTimeout(async () => {
      const mine = (controller = new AbortController());
      try {
        const r = await image(f, mine.signal).regions(s, list, c, sh).limit(1400).encode('png');
        if (mine.signal.aborted) return;
        if (result) urls.revoke(result.url);
        result = { url: urls.add(r.blob), size: r.blob.size };
        failed = '';
      } catch (err) {
        if (!mine.signal.aborted) failed = (err as Error).message;
      }
    }, 200);
  });

  onDestroy(() => {
    clearTimeout(timer);
    controller?.abort();
  });
</script>

<p class="tiny muted">
  Drag on the picture to draw a region. Drag a region to move it, or its handles to resize it. Press
  Delete to remove the selected region.
</p>
<RegionEditor
  src={url.current}
  bind:regions
  bind:selected
  bind:bounds
  label="Region"
  shape={shape === 'oval' ? 'ellipse' : 'rect'}
  make={(rect) => ({ ...rect, strength })}
  onedit={edited}
/>
<div class="row">
  <Button onclick={add}>Add region</Button>
  <Button onclick={removeSelected} disabled={selected === null}>Remove region</Button>
  <span class="tiny muted" aria-live="polite">
    {regions.length}
    {regions.length === 1 ? 'region' : 'regions'}
  </span>
</div>
{#if current && px}
  <div class="fields" role="group" aria-label="Selected region in pixels">
    {#each fields as [f, name] (f)}
      <NumberField
        label={name}
        value={px[f]}
        min={f === 'w' || f === 'h' ? 1 : 0}
        unit="px"
        onchange={(v) => typed(f, v)}
      />
    {/each}
  </div>
  {#if perRegion && style !== 'fill'}
    <Slider
      label="Strength of this region"
      value={current.strength}
      min={1}
      max={100}
      onchange={setStrength}
    />
  {/if}
{/if}

{#if result}
  <h3>Result</h3>
  <p class="mono tiny muted">This is how the saved picture will look.</p>
  <img class="result" src={result.url} alt="Result with the regions applied" />
{:else if failed}
  <p class="err" role="alert">{failed}</p>
{/if}

<style>
  p {
    margin: 0 0 8px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 12px 0;
  }
  .fields {
    display: flex;
    flex-wrap: wrap;
    gap: 0 16px;
  }
  h3 {
    margin: 16px 0 4px;
    font-size: 1rem;
  }
  .result {
    display: block;
    max-width: 100%;
    border-radius: var(--radius);
    box-shadow: 0 0 0 1px var(--line);
  }
  .err {
    color: var(--danger);
  }
</style>
