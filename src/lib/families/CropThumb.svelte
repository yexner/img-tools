<script lang="ts">
  // A small picture with the crop shown on it, so the result can be checked on every image before cropping.
  import { readSizeOf } from '#lib/core';
  import { fromRelative, type Bounds, type Rect, type RelRect } from '#lib/core/rect';
  import { objectUrl } from '#lib/objectUrl.svelte';

  let {
    file,
    region,
    fallback,
    aspect,
    shape,
    selected = false,
    onselect,
  }: {
    file: File;
    region: RelRect | null;
    fallback: (bounds: Bounds) => Rect;
    aspect: number | null;
    shape: 'rect' | 'ellipse';
    selected?: boolean;
    onselect?: () => void;
  } = $props();

  const url = objectUrl(() => file);
  let bounds = $state<Bounds | null>(null);

  $effect(() => {
    const f = file;
    void readSizeOf(f).then((s) => (bounds = s ? { w: s.width, h: s.height } : null));
  });

  const rect = $derived(
    bounds ? (region ? fromRelative(region, bounds, aspect) : fallback(bounds)) : null,
  );
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
</script>

<button
  type="button"
  class="thumb"
  class:selected
  onclick={() => onselect?.()}
  aria-label="Select {file.name}"
  aria-pressed={selected}
>
  <span class="frame" style:aspect-ratio={bounds ? `${bounds.w} / ${bounds.h}` : '1'}>
    <img src={url.current} alt="" />
    {#if rect && bounds}
      <span
        class="box"
        class:ellipse={shape === 'ellipse'}
        style:left={pct(rect.x, bounds.w)}
        style:top={pct(rect.y, bounds.h)}
        style:width={pct(rect.w, bounds.w)}
        style:height={pct(rect.h, bounds.h)}
      ></span>
    {/if}
  </span>
  <span class="name tiny">{file.name}</span>
</button>

<style>
  .thumb {
    display: grid;
    gap: 4px;
    padding: 6px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    text-align: left;
    min-width: 0;
  }
  .thumb.selected {
    outline: 2px solid var(--accent);
  }
  .frame {
    position: relative;
    display: block;
    width: 100%;
    overflow: hidden;
    border-radius: 4px;
    background: var(--surface-sunk);
    line-height: 0;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .box {
    position: absolute;
    box-sizing: border-box;
    border: 2px solid #fff;
    box-shadow: 0 0 0 999px rgb(0 0 0 / 0.55);
  }
  .box.ellipse {
    border-radius: 50%;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
